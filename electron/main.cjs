// FRETLAB desktop shell (Electron main process)
// Serves the Vite build from a privileged app:// origin so localStorage persists
// between launches and getUserMedia (Tuner / Key Finder) runs in a secure context.

const { app, BrowserWindow, protocol, net, session, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SCHEME = 'app';
const HOST = 'fretlab';
const DIST = path.join(__dirname, '..', 'dist');
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
    width: 520,
    height: 940,
    minWidth: 400,
    minHeight: 600,
    backgroundColor: '#0A0A0B',
    title: 'FRETLAB',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
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
  setPermissions();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
