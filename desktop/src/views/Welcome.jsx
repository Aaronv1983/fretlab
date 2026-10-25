// First-run setup: name + playing hand (every new install starts here)
import { useState } from 'react';
import { T, mono, sys } from '../theme.js';
import { useStore } from '../store.jsx';
import { FretboardView } from '../components/Fretboard.jsx';
import { HandChoice, PREVIEW_CHORD } from './Settings.jsx';

export default function Welcome() {
  const st = useStore();
  const [name, setName] = useState(st.settings.name || '');
  const [lefty, setLefty] = useState(!!st.settings.leftHanded);

  const finish = () => st.updateSettings({ name: name.trim(), leftHanded: lefty, onboarded: true });

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
      <div style={{ width: 'min(620px, 92%)', display: 'flex', flexDirection: 'column', gap: 22, padding: '32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="./icon.png" alt="" width={52} height={52} style={{ borderRadius: 10 }} />
          <div>
            <div style={{ ...sys(28, 800), color: T.text }}>Welcome to FRETLAB</div>
            <div style={{ ...mono(11), color: T.textSecondary, letterSpacing: 1.5 }}>YOUR DAILY GUITAR COACH</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ ...sys(14, 600), color: T.text }}>What should we call you?</span>
          <input autoFocus value={name} maxLength={40} placeholder="Your name (optional)" onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') finish(); }}
            style={{ padding: '12px 14px', background: '#2A2C30', borderRadius: 6, border: `1px solid ${T.borderLight}`, color: T.text, ...sys(15), outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ ...sys(14, 600), color: T.text }}>Do you play right- or left-handed?</span>
          <HandChoice value={lefty} onChange={(v) => { setLefty(v); st.updateSettings({ leftHanded: v }); }} />
          <FretboardView diagram={PREVIEW_CHORD} />
        </div>

        <button className="fl-btn" onClick={finish} style={{ ...mono(15, 700), color: '#fff', background: T.accent, padding: '15px 0', borderRadius: 6 }}>
          Get Started
        </button>
        <div style={{ ...sys(11), color: T.textMuted, textAlign: 'center' }}>You can change these any time in Settings.</div>
      </div>
    </div>
  );
}
