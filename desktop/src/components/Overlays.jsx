// iOS sheet + alert equivalents
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { T, SANS, sys } from '../theme.js';

// .sheet { NavigationView { ... } } — slides up over the app, with a nav bar
export function Sheet({ open, onClose, title, leading, trailing, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fl-sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fl-sheet">
        <div className="fl-grabber" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '8px 16px 10px', minHeight: 40 }}>
          <div style={{ justifySelf: 'start' }}>{leading}</div>
          <div style={{ ...sys(16, 600), color: T.text }}>{title || ''}</div>
          <div style={{ justifySelf: 'end' }}>{trailing}</div>
        </div>
        <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>,
    document.getElementById('fl-phone') || document.body,
  );
}

export function NavButton({ children, onClick, color = T.textSecondary, bold }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color, fontFamily: SANS, fontSize: 16, fontWeight: bold ? 600 : 400, cursor: 'pointer', padding: 4 }}>
      {children}
    </button>
  );
}

// .alert(title, isPresented:) with buttons
export function Alert({ open, title, message, buttons, onClose }) {
  if (!open) return null;
  return createPortal(
    <div className="fl-alert-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fl-alert">
        <div style={{ padding: '18px 16px 14px', textAlign: 'center' }}>
          <div style={{ ...sys(17, 600), color: T.text, marginBottom: 4 }}>{title}</div>
          {message && <div style={{ ...sys(13), color: T.text, opacity: 0.85, lineHeight: 1.35 }}>{message}</div>}
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          {buttons.map((b, i) => (
            <button key={b.label} onClick={() => { onClose(); b.action?.(); }}
              style={{
                flex: 1, padding: '12px 8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: SANS, fontSize: 16,
                color: '#0A84FF', fontWeight: b.role === 'cancel' ? 600 : 400,
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.getElementById('fl-phone') || document.body,
  );
}
