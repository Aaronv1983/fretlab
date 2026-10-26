// Desktop shell: sidebar navigation (replaces the iOS bottom tab bar) + full-width content
import { useEffect, useState } from 'react';
import { T, mono, sys, LEVEL_NAME } from './theme.js';
import { StoreProvider, useStore } from './store.jsx';
import { GameProvider, useGame } from './game/GameProvider.jsx';
import { Toasts, Celebration } from './game/GameUI.jsx';
import Icon from './components/Icon.jsx';
import Home from './views/Home.jsx';
import Courses from './views/Courses.jsx';
import Session from './views/Session.jsx';
import Woodshed from './views/Woodshed.jsx';
import Checkpoint from './views/Checkpoint.jsx';
import ScaleLibrary from './views/ScaleLibrary.jsx';
import Settings from './views/Settings.jsx';
import Welcome from './views/Welcome.jsx';
import Achievements from './views/Achievements.jsx';
import { bridge } from './services/backup.js';
import { useUiScale } from './services/uiScale.js';

const TABS = [
  ['home', 'Home', 'house'],
  ['courses', 'Courses', 'courses'],
  ['practice', 'Practice', 'play'],
  ['woodshed', 'Woodshed', 'listMusic'],
  ['quiz', 'Quiz', 'checkCircleFill'],
];
const TOOLS = [['achievements', 'Achievements', 'trophy'], ['scales', 'Scale Library', 'music']];
const APP = [['settings', 'Settings', 'settings']];

export default function App() {
  return (
    <StoreProvider>
      <GameProvider>
        <Shell />
      </GameProvider>
    </StoreProvider>
  );
}

function Shell() {
  const st = useStore();
  const g = useGame();
  const [tab, setTab] = useState('home');
  useUiScale(st.settings.uiScale);
  useEffect(() => bridge?.onNavigate?.((to) => setTab(to)), []);
  const screens = { home: Home, courses: Courses, practice: Session, woodshed: Woodshed, quiz: Checkpoint, scales: ScaleLibraryPage, settings: Settings, achievements: Achievements };
  const Screen = screens[tab];
  const r = st.currentRoutine;
  const goalPct = Math.min(1, g.xpToday / g.goal);

  const navItem = ([id, label, icon]) => {
    const on = tab === id;
    return (
      <button key={id} onClick={() => setTab(id)} className={`fl-nav ${on ? 'on' : ''}`}>
        <Icon name={icon} size={19} color={on ? T.accent : T.textSecondary} fill={icon === 'trophy' ? false : undefined} />
        <span style={{ ...sys(14, on ? 700 : 500), color: on ? T.text : T.textSecondary }}>{label}</span>
        {id === 'quiz' && st.dueCount > 0 && <span className="fl-badge">{st.dueCount}</span>}
      </button>
    );
  };

  return (
    <div id="fl-app">
      <aside className="fl-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 18px' }}>
          <img src="./icon.png" alt="" width={34} height={34} style={{ borderRadius: 8 }} />
          <div>
            <div style={{ ...sys(17, 800), color: T.text, letterSpacing: 0.5 }}>FRETLAB</div>
            <div style={{ fontFamily: "ui-monospace, 'Cascadia Mono', Consolas, monospace", fontSize: 9, color: T.textMuted, letterSpacing: 0.6, whiteSpace: 'nowrap' }}>YOUR DAILY GUITAR COACH</div>
          </div>
        </div>

        {/* Streak / XP / level strip */}
        <div className="fl-press" onClick={() => setTab('achievements')} style={{ display: 'flex', gap: 6, margin: '0 2px 16px', cursor: 'pointer' }}>
          <Pill icon="🔥" value={g.streak} color={g.atRisk ? T.textMuted : T.accent} title={g.atRisk ? 'Practice today to keep your streak' : 'Day streak'} pulse={g.atRisk} />
          <Pill icon="⚡" value={g.game.xpTotal} color={T.yellow} title="Total XP" />
          <Pill icon="⭐" value={`${g.level.level}`} color={T.purple} title={`Level ${g.level.level} · ${g.level.title}`} />
        </div>

        <div className="fl-nav-label">PRACTICE</div>
        {TABS.map(navItem)}
        <div className="fl-nav-label" style={{ marginTop: 18 }}>PROGRESS &amp; TOOLS</div>
        {TOOLS.map(navItem)}
        <div style={{ flex: 1 }} />
        <div style={{ marginBottom: 10 }}>{APP.map(navItem)}</div>

        {/* Daily goal card */}
        <div className="fl-press" onClick={() => setTab('practice')} style={{ padding: 14, background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...mono(9, 700), color: g.goalMet ? T.green : T.yellow, letterSpacing: 1.5 }}>{g.goalMet ? 'DAILY GOAL ✓' : 'DAILY GOAL'}</span>
            <span style={{ ...mono(11, 700), color: T.text }}>{g.xpToday}/{g.goal} XP</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginTop: 8 }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${Math.max(goalPct > 0 ? 4 : 0, goalPct * 100)}%`, background: g.goalMet ? T.green : T.yellow, transition: 'width .6s' }} />
          </div>
          {r && (
            <>
              <div style={{ ...sys(13, 700), color: T.text, marginTop: 12 }}>{r.name}</div>
              <div style={{ ...sys(11.5), color: T.textSecondary, marginTop: 2 }}>Week {r.weekNumber} · {LEVEL_NAME[r.courseLevel]} · Day {st.currentDayInRoutine}</div>
            </>
          )}
        </div>
      </aside>
      <main className="fl-main">
        <Screen key={tab} go={setTab} />
      </main>
      <Toasts />
      <Celebration />
      {!st.settings.onboarded && <Welcome />}
    </div>
  );
}

function Pill({ icon, value, color, title, pulse }) {
  return (
    <div title={title} className={pulse ? 'fl-pulse' : ''} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', background: '#2E3034', borderRadius: 8, border: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 14, filter: pulse ? 'grayscale(1)' : 'none' }}>{icon}</span>
      <span style={{ ...mono(13, 800), color }}>{value}</span>
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
