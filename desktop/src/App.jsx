// Desktop shell: sidebar navigation (replaces the iOS bottom tab bar) + full-width content
import { useState } from 'react';
import { T, mono, sys, LEVEL_NAME } from './theme.js';
import { StoreProvider, useStore } from './store.jsx';
import Icon from './components/Icon.jsx';
import Home from './views/Home.jsx';
import Courses from './views/Courses.jsx';
import Session from './views/Session.jsx';
import Woodshed from './views/Woodshed.jsx';
import Checkpoint from './views/Checkpoint.jsx';
import ScaleLibrary from './views/ScaleLibrary.jsx';
import Settings from './views/Settings.jsx';
import Welcome from './views/Welcome.jsx';

const TABS = [
  ['home', 'Home', 'house'],
  ['courses', 'Courses', 'courses'],
  ['practice', 'Practice', 'play'],
  ['woodshed', 'Woodshed', 'listMusic'],
  ['quiz', 'Quiz', 'checkCircleFill'],
];
const TOOLS = [['scales', 'Scale Library', 'music']];
const APP = [['settings', 'Settings', 'settings']];

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const st = useStore();
  const [tab, setTab] = useState('home');
  const screens = { home: Home, courses: Courses, practice: Session, woodshed: Woodshed, quiz: Checkpoint, scales: ScaleLibraryPage, settings: Settings };
  const Screen = screens[tab];
  const r = st.currentRoutine;

  const navItem = ([id, label, icon]) => {
    const on = tab === id;
    return (
      <button key={id} onClick={() => setTab(id)} className={`fl-nav ${on ? 'on' : ''}`}>
        <Icon name={icon} size={19} color={on ? T.accent : T.textSecondary} />
        <span style={{ ...sys(14, on ? 700 : 500), color: on ? T.text : T.textSecondary }}>{label}</span>
        {id === 'quiz' && st.dueCount > 0 && <span className="fl-badge">{st.dueCount}</span>}
      </button>
    );
  };

  return (
    <div id="fl-app">
      <aside className="fl-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 22px' }}>
          <img src="./icon.png" alt="" width={34} height={34} style={{ borderRadius: 8 }} />
          <div>
            <div style={{ ...sys(17, 800), color: T.text, letterSpacing: 0.5 }}>FRETLAB</div>
            <div style={{ fontFamily: "ui-monospace, 'Cascadia Mono', Consolas, monospace", fontSize: 9, color: T.textMuted, letterSpacing: 0.6, whiteSpace: 'nowrap' }}>YOUR DAILY GUITAR COACH</div>
          </div>
        </div>
        <div className="fl-nav-label">PRACTICE</div>
        {TABS.map(navItem)}
        <div className="fl-nav-label" style={{ marginTop: 18 }}>TOOLS</div>
        {TOOLS.map(navItem)}
        <div style={{ flex: 1 }} />
        <div style={{ marginBottom: 10 }}>{APP.map(navItem)}</div>
        {r && (
          <div className="fl-press" onClick={() => setTab('practice')} style={{ padding: 14, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
            <div style={{ ...mono(9, 700), color: T.accent, letterSpacing: 1.5 }}>CURRENT WEEK</div>
            <div style={{ ...sys(14, 700), color: T.text, marginTop: 4 }}>{r.name}</div>
            <div style={{ ...sys(12), color: T.textSecondary, marginTop: 2 }}>Week {r.weekNumber} · {LEVEL_NAME[r.courseLevel]} · Day {st.currentDayInRoutine}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 13 }}>🔥</span>
              <span style={{ ...mono(12, 700), color: T.yellow }}>{st.streak} day streak</span>
            </div>
          </div>
        )}
      </aside>
      <main className="fl-main">
        <Screen key={tab} go={setTab} />
      </main>
      {!st.settings.onboarded && <Welcome />}
    </div>
  );
}

function ScaleLibraryPage() {
  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto' }}>
      <ScaleLibrary />
    </div>
  );
}
