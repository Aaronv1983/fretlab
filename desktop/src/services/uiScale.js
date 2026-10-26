// Interface size. "auto" grows the whole UI on big/maximized windows so full screen isn't sparse.
import { useEffect } from 'react';
import { bridge } from './backup.js';

export function autoScale() {
  const w = window.outerWidth || window.innerWidth * (window.devicePixelRatio || 1);
  return Math.max(1, Math.min(1.5, w / 1500));
}

function apply(f) {
  const z = Math.round(f * 100) / 100;
  if (bridge?.setZoom) bridge.setZoom(z);
  else document.documentElement.style.zoom = String(z);
}

export function useUiScale(setting = 'auto') {
  useEffect(() => {
    if (setting !== 'auto') { apply(Number(setting) || 1); return undefined; }
    let t = null;
    const update = () => { clearTimeout(t); t = setTimeout(() => apply(autoScale()), 60); };
    update();
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); clearTimeout(t); };
  }, [setting]);
}
