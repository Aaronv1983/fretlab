import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { bridge, hasLocalData, restoreSnapshot } from './services/backup.js';
import './styles.css';

async function boot() {
  // If app storage is empty but a progress file exists on disk (e.g. after a reinstall), restore it first
  if (bridge && !hasLocalData()) {
    try {
      const latest = await bridge.loadLatest();
      if (latest) restoreSnapshot(latest);
    } catch { /* start fresh */ }
  }
  createRoot(document.getElementById('root')).render(<App />);
}
boot();
