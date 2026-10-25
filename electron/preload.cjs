// Exposes a minimal, typed bridge for saving/restoring progress files. No Node access in the page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fretlabDesktop', {
  saveProgress: (snapshot, kind) => ipcRenderer.invoke('progress:save', snapshot, kind),
  loadLatest: () => ipcRenderer.invoke('progress:latest'),
  exportProgress: (snapshot) => ipcRenderer.invoke('progress:export', snapshot),
  importProgress: () => ipcRenderer.invoke('progress:import'),
  openBackupFolder: () => ipcRenderer.invoke('progress:openFolder'),
  info: () => ipcRenderer.invoke('app:info'),
});
