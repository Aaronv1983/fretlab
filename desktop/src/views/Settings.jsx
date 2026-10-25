// Settings: profile, handedness, score display, progress & backups
import { useEffect, useState } from 'react';
import { T, mono, sys, alpha } from '../theme.js';
import { useStore } from '../store.jsx';
import Icon from '../components/Icon.jsx';
import { Alert } from '../components/Overlays.jsx';
import { FretboardView } from '../components/Fretboard.jsx';
import TabScore from '../score/TabScore.jsx';
import { bridge, snapshot, restoreSnapshot, flushBackup, onBackup, lastBackup } from '../services/backup.js';

const card = { background: T.card, borderRadius: 8, border: `1px solid ${T.border}`, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 };
const label = { ...mono(10, 700), color: T.textMuted, letterSpacing: 1.5 };
const input = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', background: '#2A2C30', borderRadius: 6, border: `1px solid ${T.borderLight}`, color: T.text, ...sys(14), outline: 'none' };

// Open E major chord: shows which way the neck runs
export const PREVIEW_CHORD = {
  title: 'E Major', subtitle: null, startFret: 0, endFret: 4,
  highlights: [
    { string: 5, fret: 0, label: 'R', isRoot: true, color: 'accent' },
    { string: 4, fret: 2, label: '5', isRoot: false, color: 'green' },
    { string: 3, fret: 2, label: 'R', isRoot: true, color: 'accent' },
    { string: 2, fret: 1, label: '3', isRoot: false, color: 'blue' },
  ],
};
const PREVIEW_TAB = [
  'e|-------------------5h8-5---|',
  'B|---------------5-8-----8b10|',
  'G|-----------5-7-------------|',
  'D|-------5-7-----------------|',
  'A|---5-7---------------------|',
  'E|-5-------------------------|',
];

export function HandChoice({ value, onChange }) {
  const opt = (v, title, sub) => (
    <button className="fl-btn" onClick={() => onChange(v)} style={{
      flex: 1, textAlign: 'left', padding: '14px 16px', borderRadius: 8,
      background: value === v ? T.accentSoft : '#2A2C30', border: `1px solid ${value === v ? alpha(T.accent, 0.6) : T.borderLight}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${value === v ? T.accent : T.textMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {value === v && <span style={{ width: 8, height: 8, borderRadius: 4, background: T.accent }} />}
        </span>
        <span style={{ ...sys(14, 700), color: T.text }}>{title}</span>
      </div>
      <div style={{ ...sys(11), color: T.textSecondary, marginTop: 6, marginLeft: 26 }}>{sub}</div>
    </button>
  );
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {opt(false, 'Right-handed', 'Nut on the left, frets run left → right')}
      {opt(true, 'Left-handed', 'Nut on the right, frets run right → left')}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button className="fl-btn" onClick={() => onChange(!on)} aria-pressed={on} style={{ width: 44, height: 24, borderRadius: 12, background: on ? T.accent : '#55585F', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left .15s' }} />
    </button>
  );
}

const fmtTime = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };

export default function Settings() {
  const st = useStore();
  const s = st.settings;
  const [name, setName] = useState(s.name);
  const [info, setInfo] = useState(null);
  const [saved, setSaved] = useState(lastBackup);
  const [status, setStatus] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => { bridge?.info().then(setInfo).catch(() => {}); }, [saved]);
  useEffect(() => onBackup((r) => setSaved(r.savedAt)), []);
  useEffect(() => { const id = setTimeout(() => { if (name !== s.name) st.updateSettings({ name: name.trim() }); }, 400); return () => clearTimeout(id); }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  const doExport = async () => {
    const r = await bridge.exportProgress(snapshot());
    if (r?.ok) setStatus({ ok: true, text: `Exported to ${r.file}` });
  };
  const doImport = async () => {
    const r = await bridge.importProgress();
    if (r?.ok) setPendingImport(r.snapshot);
    else if (r?.error) setStatus({ ok: false, text: r.error });
  };
  const applyImport = async () => {
    await bridge.saveProgress(snapshot(), 'before-reset');
    restoreSnapshot(pendingImport);
    await flushBackup();
    window.location.reload();
  };
  const doReset = async () => {
    if (bridge) await bridge.saveProgress(snapshot(), 'before-reset');
    const keep = localStorage.getItem('fretlab_settings');
    const remove = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('fretlab_')) remove.push(k); }
    remove.forEach((k) => localStorage.removeItem(k));
    if (keep) localStorage.setItem('fretlab_settings', keep);
    await flushBackup();
    window.location.reload();
  };

  const btn = (icon, text, onClick, color = T.text) => (
    <button className="fl-btn" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, ...sys(13, 600), color, background: '#2A2C30', border: `1px solid ${T.borderLight}`, padding: '9px 14px', borderRadius: 6 }}>
      <Icon name={icon} size={15} color={color} /> {text}
    </button>
  );

  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto', background: T.bg }}>
      <div className="fl-page" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 980 }}>
        <div style={{ ...sys(26, 800), color: T.text }}>Settings</div>

        <div className="fl-grid-2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section style={card}>
              <div style={label}>PROFILE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ ...sys(13, 600), color: T.text }}>Your name</span>
                <input style={input} value={name} maxLength={40} placeholder="Shown on your Home screen" onChange={(e) => setName(e.target.value)} />
              </div>
            </section>

            <section style={card}>
              <div style={label}>PLAYING HAND</div>
              <HandChoice value={s.leftHanded} onChange={(v) => st.updateSettings({ leftHanded: v })} />
              <div style={{ ...sys(12), color: T.textSecondary }}>Fretboard diagrams and the quiz fretboard are mirrored for left-handed players. Tab and notation read the same either way.</div>
              <FretboardView diagram={PREVIEW_CHORD} />
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section style={card}>
              <div style={label}>SCORE DISPLAY</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...sys(14, 600), color: T.text }}>Standard notation above tab</div>
                  <div style={{ ...sys(12), color: T.textSecondary, marginTop: 2 }}>Show the notes on a staff, like Guitar Pro. Turn off for tab only.</div>
                </div>
                <Toggle on={s.showNotation} onChange={(v) => st.updateSettings({ showNotation: v })} />
              </div>
              <TabScore lines={PREVIEW_TAB} compact />
            </section>

            <section style={card}>
              <div style={label}>PROGRESS &amp; BACKUPS</div>
              {bridge ? (
                <>
                  <div style={{ ...sys(13), color: T.textSecondary, lineHeight: 1.5 }}>
                    Your progress saves automatically on every change and is kept when you install a new version of FRETLAB.
                    A dated backup is also kept for each of the last 30 days you practiced.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px', ...sys(12), color: T.textSecondary }}>
                    <span style={{ color: T.textMuted }}>Last saved</span><span style={{ color: T.text }}>{saved || info?.lastSaved ? fmtTime(saved || info.lastSaved) : 'Saves on your next change'}</span>
                    <span style={{ color: T.textMuted }}>Saved in</span><span style={{ color: T.text, wordBreak: 'break-all' }}>{info?.dataDir || '…'}</span>
                    <span style={{ color: T.textMuted }}>Backups</span><span style={{ color: T.text }}>{info ? `${info.backups} file${info.backups === 1 ? '' : 's'}` : '…'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {btn('download', 'Export progress…', doExport)}
                    {btn('upload', 'Import progress…', doImport)}
                    {btn('folder', 'Open backups folder', () => bridge.openBackupFolder())}
                  </div>
                  <div style={{ ...sys(11), color: T.textMuted }}>Use Export to move your progress to another PC, then Import it there.</div>
                  {status && <div style={{ ...sys(12), color: status.ok ? T.green : T.red, wordBreak: 'break-all' }}>{status.text}</div>}
                </>
              ) : (
                <div style={{ ...sys(13), color: T.textSecondary }}>Backups are available in the desktop app.</div>
              )}
              <div style={{ height: 1, background: T.border }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, ...sys(12), color: T.textSecondary }}>Start over from Foundation Week 1. Your settings are kept and a backup is saved first.</div>
                {btn('reset', 'Reset progress…', () => setConfirmReset(true), T.red)}
              </div>
            </section>

            {info && <div style={{ ...mono(10), color: T.textMuted, textAlign: 'right' }}>FRETLAB {info.version}</div>}
          </div>
        </div>
      </div>

      <Alert open={!!pendingImport} title="Import progress?" onClose={() => setPendingImport(null)}
        message={pendingImport ? `This replaces your current progress with the file saved ${fmtTime(pendingImport.savedAt)}. Your current progress is backed up first.` : ''}
        buttons={[{ label: 'Cancel', role: 'cancel' }, { label: 'Import', action: applyImport }]} />
      <Alert open={confirmReset} title="Reset all progress?" onClose={() => setConfirmReset(false)}
        message="Courses, quiz history, streak, solos and custom scales will be cleared. A backup is saved first."
        buttons={[{ label: 'Cancel', role: 'cancel' }, { label: 'Reset', action: doReset }]} />
    </div>
  );
}
