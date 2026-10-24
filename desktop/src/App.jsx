// Port of ContentView.swift + TabBarView + AppState.Tab
import { useState } from 'react';
import { T, mono } from './theme.js';
import { StoreProvider } from './store.jsx';
import Icon from './components/Icon.jsx';
import Home from './views/Home.jsx';
import Courses from './views/Courses.jsx';
import Session from './views/Session.jsx';
import Woodshed from './views/Woodshed.jsx';
import Checkpoint from './views/Checkpoint.jsx';

const TABS = [
  ['home', 'Home', 'house'],
  ['courses', 'Courses', 'courses'],
  ['practice', 'Practice', 'play'],
  ['woodshed', 'Woodshed', 'listMusic'],
  ['quiz', 'Quiz', 'checkCircleFill'],
];

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const [tab, setTab] = useState('home');
  const screens = { home: Home, courses: Courses, practice: Session, woodshed: Woodshed, quiz: Checkpoint };
  const Screen = screens[tab];
  return (
    <div id="fl-phone">
      <div style={{ position: 'absolute', inset: 0, bottom: 0 }}>
        <Screen key={tab} go={setTab} />
      </div>
      <nav className="fl-tabbar">
        {TABS.map(([id, label, icon]) => {
          const on = tab === id;
          const color = on ? T.accent : T.textMuted;
          return (
            <button key={id} onClick={() => setTab(id)} className="fl-tab" aria-label={label}>
              <Icon name={icon} size={20} color={color} />
              <span style={{ ...mono(8, 600), color }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
