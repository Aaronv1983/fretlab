// Progress backup: every change is mirrored to a file on disk (desktop app only), so progress survives
// updates, reinstalls, and cleared app storage. Format is shared by auto-backups and Export/Import.
const PREFIX = 'fretlab_';

export const bridge = typeof window !== 'undefined' ? window.fretlabDesktop || null : null;

export function snapshot() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) data[k] = localStorage.getItem(k);
    }
  } catch { /* storage unavailable */ }
  return { app: 'FRETLAB', format: 1, savedAt: new Date().toISOString(), data };
}

export function isValidSnapshot(s) {
  return !!s && s.app === 'FRETLAB' && s.data && typeof s.data === 'object'
    && Object.entries(s.data).every(([k, v]) => k.startsWith(PREFIX) && typeof v === 'string');
}

export function hasLocalData() {
  try {
    for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith(PREFIX)) return true;
  } catch { /* ignore */ }
  return false;
}

export function restoreSnapshot(s) {
  if (!isValidSnapshot(s)) throw new Error('Not a FRETLAB progress file');
  const remove = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(PREFIX)) remove.push(k); }
  remove.forEach((k) => localStorage.removeItem(k));
  Object.entries(s.data).forEach(([k, v]) => localStorage.setItem(k, v));
}

let timer = null;
let listeners = new Set();
export let lastBackup = null;
export const onBackup = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function scheduleBackup() {
  if (!bridge) return;
  clearTimeout(timer);
  timer = setTimeout(flushBackup, 1200);
}

export async function flushBackup() {
  if (!bridge) return;
  clearTimeout(timer);
  try {
    const r = await bridge.saveProgress(snapshot());
    if (r?.ok) { lastBackup = r.savedAt; listeners.forEach((fn) => fn(r)); }
  } catch { /* disk unavailable; localStorage still holds progress */ }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { if (bridge) bridge.saveProgress(snapshot()); });
}
