// FRETLAB desktop shell (Electron main process)
// Serves the Vite build from a privileged app:// origin so localStorage persists
// between launches and the app runs in a secure context (Web Audio metronome).

const { app, BrowserWindow, protocol, net, session, shell, Menu, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

// Pin the data folder so progress always lives in %APPDATA%\FRETLAB, across every version and reinstall
app.setName('FRETLAB');
app.setPath('userData', path.join(app.getPath('appData'), 'FRETLAB'));

const SCHEME = 'app';
const HOST = 'fretlab';
const DIST = path.join(__dirname, '..', 'dist-desktop');
const APP_URL = `${SCHEME}://${HOST}/index.html`;

// Must run before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
  },
]);

app.setAppUserModelId('com.fretlab.desktop');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;

function registerProtocol() {
  protocol.handle(SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const filePath = path.normalize(path.join(DIST, rel));
    // Block path traversal outside dist
    if (!filePath.startsWith(DIST)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function setPermissions() {
  const ses = session.defaultSession;
  const allowed = new Set(['media', 'audioCapture', 'speaker-selection']);
  const isOwnOrigin = (url) => {
    try { return new URL(url).protocol === `${SCHEME}:`; } catch { return false; }
  };
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const origin = details.requestingUrl || wc.getURL();
    if (!isOwnOrigin(origin)) return callback(false);
    if (permission === 'media') {
      // Microphone only; refuse camera
      const types = details.mediaTypes || [];
      return callback(types.length === 0 || types.every((t) => t === 'audio'));
    }
    callback(allowed.has(permission));
  });
  ses.setPermissionCheckHandler((wc, permission, origin) => isOwnOrigin(origin) && allowed.has(permission));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#313338',
    title: 'FRETLAB',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false, // keep the metronome steady when the window is in the background
    },
  });

  win.once('ready-to-show', () => win.show());

  // Links to anything outside the app open in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`${SCHEME}://`)) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(APP_URL);
  win.on('closed', () => { win = null; });
}

// ── Progress files ──
// progress.json  = latest progress (rewritten on every change)
// backups/progress-YYYY-MM-DD.json = one per day, last 30 kept
const progressFile = () => path.join(app.getPath('userData'), 'progress.json');
const backupDir = () => path.join(app.getPath('userData'), 'backups');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function writeAtomic(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}
function validSnapshot(s) {
  return !!s && s.app === 'FRETLAB' && s.data && typeof s.data === 'object'
    && Object.entries(s.data).every(([k, v]) => k.startsWith('fretlab_') && typeof v === 'string');
}
function readSnapshot(file) {
  try { const s = JSON.parse(fs.readFileSync(file, 'utf8')); return validSnapshot(s) ? s : null; } catch { return null; }
}
function listBackups() {
  try {
    return fs.readdirSync(backupDir()).filter((f) => /^progress-.*\.json$/.test(f)).sort().reverse();
  } catch { return []; }
}
function pruneBackups() {
  const daily = listBackups().filter((f) => /^progress-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  for (const f of daily.slice(30)) { try { fs.unlinkSync(path.join(backupDir(), f)); } catch { /* ignore */ } }
}
const fromApp = (e) => { try { return new URL(e.senderFrame.url).protocol === `${SCHEME}:`; } catch { return false; } };

function registerIpc() {
  ipcMain.handle('progress:save', (e, snap, kind) => {
    if (!fromApp(e) || !validSnapshot(snap)) return { ok: false };
    const text = JSON.stringify(snap);
    if (kind === 'before-reset') {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      writeAtomic(path.join(backupDir(), `progress-before-reset-${stamp}.json`), text);
      return { ok: true, savedAt: snap.savedAt };
    }
    writeAtomic(progressFile(), text);
    writeAtomic(path.join(backupDir(), `progress-${today()}.json`), text);
    pruneBackups();
    return { ok: true, savedAt: snap.savedAt };
  });

  ipcMain.handle('progress:latest', (e) => {
    if (!fromApp(e)) return null;
    const main = readSnapshot(progressFile());
    if (main) return main;
    for (const f of listBackups()) { const s = readSnapshot(path.join(backupDir(), f)); if (s) return s; }
    return null;
  });

  ipcMain.handle('progress:export', async (e, snap) => {
    if (!fromApp(e) || !validSnapshot(snap)) return { ok: false };
    const r = await dialog.showSaveDialog(win, {
      title: 'Export FRETLAB progress',
      defaultPath: path.join(app.getPath('documents'), `FRETLAB Progress ${today()}.json`),
      filters: [{ name: 'FRETLAB progress', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    writeAtomic(r.filePath, JSON.stringify(snap, null, 1));
    return { ok: true, file: r.filePath };
  });

  ipcMain.handle('progress:import', async (e) => {
    if (!fromApp(e)) return { ok: false };
    const r = await dialog.showOpenDialog(win, {
      title: 'Import FRETLAB progress',
      defaultPath: app.getPath('documents'),
      properties: ['openFile'],
      filters: [{ name: 'FRETLAB progress', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    const snap = readSnapshot(r.filePaths[0]);
    if (!snap) return { ok: false, error: 'That file is not a FRETLAB progress file.' };
    return { ok: true, snapshot: snap };
  });

  ipcMain.handle('progress:openFolder', (e) => {
    if (!fromApp(e)) return;
    fs.mkdirSync(backupDir(), { recursive: true });
    return shell.openPath(backupDir());
  });

  ipcMain.handle('app:info', (e) => {
    if (!fromApp(e)) return null;
    const latest = readSnapshot(progressFile());
    return { version: app.getVersion(), dataDir: app.getPath('userData'), backupDir: backupDir(), backups: listBackups().length, lastSaved: latest?.savedAt || null };
  });
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  // Minimal menu: keeps standard shortcuts (copy/paste, reload, zoom, fullscreen) without a visible bar
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }]),
      ],
    },
    { role: 'windowMenu' },
  ]));

  registerProtocol();
  registerIpc();
  setPermissions();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
