// Exposes a minimal, typed bridge for progress files, reminders, navigation and zoom. No Node access in the page.
const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('fretlabDesktop', {
  saveProgress: (snapshot, kind) => ipcRenderer.invoke('progress:save', snapshot, kind),
  loadLatest: () => ipcRenderer.invoke('progress:latest'),
  exportProgress: (snapshot) => ipcRenderer.invoke('progress:export', snapshot),
  importProgress: () => ipcRenderer.invoke('progress:import'),
  openBackupFolder: () => ipcRenderer.invoke('progress:openFolder'),
  info: () => ipcRenderer.invoke('app:info'),
  setReminders: (cfg) => ipcRenderer.invoke('reminders:set', cfg),
  testReminder: () => ipcRenderer.invoke('reminders:test'),
  setZoom: (f) => webFrame.setZoomFactor(Math.max(0.8, Math.min(2, Number(f) || 1))),
  onNavigate: (cb) => {
    const h = (_e, to) => cb(String(to));
    ipcRenderer.on('nav', h);
    return () => ipcRenderer.removeListener('nav', h);
  },
});
