// React wiring for XP, streaks, daily goal, levels, achievements, toasts and celebrations.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, ALL_ROUTINES } from '../store.jsx';
import { KEYS, load, save, uuid } from '../services/storage.js';
import { bridge, scheduleBackup } from '../services/backup.js';
import {
  applyFreezes, award, migrateGame, dayKey, streakInfo, levelProgress, achievementStatus, coachMessage,
} from './engine.js';
import { playSound } from './sound.js';

const Ctx = createContext(null);
export const useGame = () => useContext(Ctx);

export function GameProvider({ children }) {
  const st = useStore();

  const masteredIds = useMemo(() => ALL_ROUTINES.filter((r) => st.isRoutineMastered(r.id)).map((r) => r.id), [st.isRoutineMastered]);

  const [game, setGameState] = useState(() => {
    const raw = load(KEYS.gamify, null);
    const masteredCount = ALL_ROUTINES.filter((r) => (load(KEYS.progress, {})[r.id] || {}).isMastered).length;
    return applyFreezes(migrateGame(raw, load(KEYS.streak, 0), load(KEYS.lastDate, null), masteredCount));
  });
  const ref = useRef(game);
  const setGame = useCallback((next) => { ref.current = next; setGameState(next); }, []);

  const mounted = useRef(false);
  useEffect(() => {
    save(KEYS.gamify, game);
    if (mounted.current) scheduleBackup(); else mounted.current = true;
  }, [game]);

  // Reminder config → desktop app (tray + Windows notifications)
  useEffect(() => { bridge?.setReminders?.(game.reminders); }, [game.reminders]);

  // Day rollover (app left open overnight): spend freezes if needed, refresh "today"
  const [today, setToday] = useState(dayKey());
  useEffect(() => {
    const id = setInterval(() => {
      const d = dayKey();
      if (d !== today) { setToday(d); setGame(applyFreezes(ref.current, d)); }
    }, 30000);
    return () => clearInterval(id);
  }, [today, setGame]);

  // ── Toasts + celebrations ──
  const [toasts, setToasts] = useState([]);
  const [celebrations, setCelebrations] = useState([]);
  const pushToast = useCallback((t) => {
    const id = uuid();
    setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.ms || 2800);
  }, []);
  const sound = useCallback((name) => playSound(name, ref.current.sound), []);

  // Freeze used on launch → let the player know
  useEffect(() => {
    const u = game.lastFreezeUse;
    if (u && u.on === dayKey() && !u.shown) {
      pushToast({ kind: 'freeze', text: 'Streak saved ❄️', sub: `A streak freeze covered ${u.days} missed day${u.days > 1 ? 's' : ''}.`, ms: 5000 });
      setGame({ ...ref.current, lastFreezeUse: { ...u, shown: true } });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const earn = useCallback((amount, label, opts = {}) => {
    const { next, events } = award(ref.current, amount, label, opts);
    if (next === ref.current) return 0;
    setGame(next);
    for (const e of events) {
      if (e.kind === 'xp') { pushToast({ kind: 'xp', text: `+${e.amount} XP`, sub: e.label }); if (!opts.quiet) sound('xp'); }
      else if (e.kind === 'streak') pushToast({ kind: 'streak', text: `${e.streak}-day streak!`, sub: e.streak === 1 ? 'Streak started — come back tomorrow to keep it going' : 'Streak extended. Keep it rolling!', ms: 3800 });
      else if (e.kind === 'freeze') pushToast({ kind: 'freeze', text: 'Streak freeze earned ❄️', sub: `For your ${e.streak}-day streak. It covers a missed day automatically.`, ms: 5000 });
      else if (e.kind === 'goal') { setCelebrations((c) => [...c, { type: 'goal', ...e, goal: next.dailyGoal }]); sound('goal'); }
      else if (e.kind === 'level') { setCelebrations((c) => [...c, { type: 'level', ...e }]); sound('level'); }
    }
    return amount;
  }, [pushToast, setGame, sound]);

  const bump = useCallback((counter, by = 1) => {
    const g = ref.current;
    setGame({ ...g, counters: { ...g.counters, [counter]: (g.counters[counter] || 0) + by } });
  }, [setGame]);
  const updateGame = useCallback((patch) => setGame({ ...ref.current, ...patch }), [setGame]);
  const dismissCelebration = useCallback(() => setCelebrations((c) => c.slice(1)), []);

  // ── Achievements ──
  const ctx = useMemo(() => {
    const byLevel = (lv) => ALL_ROUTINES.filter((r) => r.courseLevel === lv && masteredIds.includes(r.id)).length;
    return {
      game,
      mastered: masteredIds.length,
      courseDone: { foundation: byLevel('foundation'), intermediate: byLevel('intermediate'), advanced: byLevel('advanced') },
      projects: st.projects.length,
      licks: st.lickLibrary.length,
    };
  }, [game, masteredIds, st.projects.length, st.lickLibrary.length]);
  const achievements = useMemo(() => achievementStatus(ctx), [ctx]);
  const firstEval = useRef(true);
  useEffect(() => {
    const newly = achievements.filter((a) => a.done && !ref.current.achievements[a.id]);
    if (newly.length) {
      const map = { ...ref.current.achievements };
      newly.forEach((a) => { map[a.id] = new Date().toISOString(); });
      setGame({ ...ref.current, achievements: map });
      if (!firstEval.current) {
        newly.forEach((a) => pushToast({ kind: 'achievement', icon: a.icon, text: `Achievement: ${a.title}`, sub: a.desc, ms: 5000 }));
        sound('achievement');
      }
    }
    firstEval.current = false;
  }, [achievements, pushToast, setGame, sound]);

  const s = streakInfo(game, today);
  const xpToday = game.xpByDay[today] || 0;
  const value = {
    game, today, earn, bump, updateGame, sound,
    streak: s.streak, practicedToday: s.practicedToday, atRisk: s.atRisk,
    xpToday, goal: game.dailyGoal, goalMet: xpToday >= game.dailyGoal,
    level: levelProgress(game.xpTotal),
    achievements,
    coach: coachMessage(game, { name: st.settings.name, dueCount: st.dueCount, hasStarted: masteredIds.length > 0 || game.counters.blocks > 0 }),
    toasts, celebration: celebrations[0] || null, dismissCelebration, pushToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
