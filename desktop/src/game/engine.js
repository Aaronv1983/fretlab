// Pure gamification logic (no React): XP, daily goal, streaks + freezes, levels, achievements.
// State lives in localStorage key fretlab_gamify and is included in progress backups.

export const DAILY_GOALS = [
  { xp: 20, name: 'Casual', mins: '~5 min / day' },
  { xp: 50, name: 'Regular', mins: '~12 min / day' },
  { xp: 100, name: 'Serious', mins: '~25 min / day' },
  { xp: 200, name: 'Intense', mins: '~50 min / day' },
];

// What earns XP (shown in Achievements → "How to earn XP")
export const XP = {
  block: 10,          // finish a session block (warm-up, core, scales, theory)
  correct: 5,         // each correct checkpoint answer
  checkpoint: 10,     // finish a checkpoint
  perfect: 10,        // 100% on a checkpoint
  mastered: 50,       // master a week (first time)
  chunkTempo: 2,      // practice a Woodshed chunk at a new speed (per chunk/speed/day)
  chunkMastered: 20,  // master a Woodshed chunk
  newSolo: 10,        // add a solo
  lick: 5,            // save a lick
  customScale: 5,     // create a custom scale
};

export const MAX_FREEZES = 2;

export function dayKey(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDaysKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dayKey(dt.getTime());
}

export const DEFAULT_GAME = {
  dailyGoal: 50,
  xpTotal: 0,
  xpByDay: {},
  activeDays: {},
  frozenDays: {},
  freezes: 0,
  freezeAwards: {},
  once: {},
  counters: { blocks: 0, quizAnswers: 0, perfect: 0, checkpoints: 0 },
  goalDays: {},
  achievements: {},
  bestStreak: 0,
  celebratedGoal: null,
  levelSeen: 1,
  sound: true,
  reminders: { enabled: false, time: '19:00', streakSaver: true, background: true, openAtLogin: true },
  remindersAsked: false,
};

// ── Levels ──
// XP needed to reach level n: 0, 100, 250, 450, 700, 1000, …
export const xpForLevel = (n) => (n <= 1 ? 0 : 25 * (n - 1) * (n + 2));
export function levelOf(xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  return n;
}
export function levelTitle(n) {
  if (n >= 30) return 'Legend';
  if (n >= 20) return 'Virtuoso';
  if (n >= 15) return 'Shredder';
  if (n >= 10) return 'Player';
  if (n >= 5) return 'Apprentice';
  return 'Beginner';
}
export function levelProgress(xp) {
  const lv = levelOf(xp);
  const lo = xpForLevel(lv), hi = xpForLevel(lv + 1);
  return { level: lv, title: levelTitle(lv), into: xp - lo, span: hi - lo, toNext: hi - xp, pct: (xp - lo) / (hi - lo) };
}

// ── Streaks ──
// Streak = consecutive practice days (frozen days keep it alive but don't add to it).
// Today counts once you practice; until then the streak through yesterday is still "alive".
export function streakInfo(g, today = dayKey()) {
  const practicedToday = !!g.activeDays[today];
  let n = practicedToday ? 1 : 0;
  let d = addDaysKey(today, -1);
  for (let guard = 0; guard < 4000; guard++) {
    if (g.activeDays[d]) n++;
    else if (!g.frozenDays[d]) break;
    d = addDaysKey(d, -1);
  }
  return { streak: n, practicedToday, atRisk: n > 0 && !practicedToday };
}

// Called on launch / day change: spend freezes on missed days (only if they can save the streak)
export function applyFreezes(g, today = dayKey()) {
  const days = Object.keys(g.activeDays).filter((d) => d < today).sort();
  const last = days[days.length - 1];
  if (!last) return g;
  const gap = [];
  for (let d = addDaysKey(last, 1); d < today; d = addDaysKey(d, 1)) if (!g.frozenDays[d]) gap.push(d);
  if (!gap.length || gap.length > g.freezes) return g;
  const frozenDays = { ...g.frozenDays };
  gap.forEach((d) => { frozenDays[d] = true; });
  return { ...g, frozenDays, freezes: g.freezes - gap.length, lastFreezeUse: { days: gap.length, on: today } };
}

// ── XP award (pure). Returns { next, events } ──
export function award(g, amount, label, { once, today = dayKey() } = {}) {
  if (once && g.once[once]) return { next: g, events: [] };
  const events = [];
  const before = streakInfo(g, today);
  const prevDay = g.xpByDay[today] || 0;
  const prevLevel = levelOf(g.xpTotal);
  let next = {
    ...g,
    xpTotal: g.xpTotal + amount,
    xpByDay: { ...g.xpByDay, [today]: prevDay + amount },
    activeDays: { ...g.activeDays, [today]: true },
    once: once ? { ...g.once, [once]: true } : g.once,
  };
  events.push({ kind: 'xp', amount, label });

  const after = streakInfo(next, today);
  if (!before.practicedToday) {
    events.push({ kind: 'streak', streak: after.streak });
    // every 7-day milestone earns a streak freeze (max 2)
    if (after.streak > 0 && after.streak % 7 === 0 && !next.freezeAwards[today]) {
      if (next.freezes < MAX_FREEZES) {
        next = { ...next, freezes: next.freezes + 1, freezeAwards: { ...next.freezeAwards, [today]: true } };
        events.push({ kind: 'freeze', streak: after.streak });
      }
    }
  }
  if (after.streak > next.bestStreak) next = { ...next, bestStreak: after.streak };

  if (prevDay < g.dailyGoal && prevDay + amount >= g.dailyGoal) {
    next = { ...next, goalDays: { ...next.goalDays, [today]: true } };
    if (next.celebratedGoal !== today) {
      next = { ...next, celebratedGoal: today };
      events.push({ kind: 'goal', streak: after.streak, xpToday: prevDay + amount });
    }
  }
  const newLevel = levelOf(next.xpTotal);
  if (newLevel > prevLevel) {
    next = { ...next, levelSeen: newLevel };
    events.push({ kind: 'level', level: newLevel, title: levelTitle(newLevel) });
  }
  return { next, events };
}

// ── Achievements ──
// ctx: { game, mastered (count), courseDone: {foundation, intermediate, advanced}, projects, licks }
export const ACHIEVEMENTS = [
  { id: 'first-steps', icon: '🎸', title: 'First Steps', desc: 'Finish your first practice block', target: 1, value: (c) => c.game.counters.blocks },
  { id: 'streak-3', icon: '🔥', title: 'On Fire', desc: 'Reach a 3-day streak', target: 3, value: (c) => c.game.bestStreak },
  { id: 'streak-7', icon: '📅', title: 'Week Warrior', desc: 'Reach a 7-day streak', target: 7, value: (c) => c.game.bestStreak },
  { id: 'streak-30', icon: '🗓️', title: 'Monthly Grind', desc: 'Reach a 30-day streak', target: 30, value: (c) => c.game.bestStreak },
  { id: 'streak-100', icon: '💯', title: 'Centurion', desc: 'Reach a 100-day streak', target: 100, value: (c) => c.game.bestStreak },
  { id: 'goal-7', icon: '🎯', title: 'Goal Getter', desc: 'Hit your daily goal on 7 days', target: 7, value: (c) => Object.keys(c.game.goalDays).length },
  { id: 'xp-500', icon: '⚡', title: 'Charged Up', desc: 'Earn 500 XP', target: 500, value: (c) => c.game.xpTotal },
  { id: 'xp-2500', icon: '🌟', title: 'Dedicated', desc: 'Earn 2,500 XP', target: 2500, value: (c) => c.game.xpTotal },
  { id: 'xp-10000', icon: '🚀', title: 'Shredder', desc: 'Earn 10,000 XP', target: 10000, value: (c) => c.game.xpTotal },
  { id: 'flawless', icon: '💎', title: 'Flawless', desc: 'Score 100% on a checkpoint', target: 1, value: (c) => c.game.counters.perfect },
  { id: 'quiz-100', icon: '🧠', title: 'Quiz Whiz', desc: 'Answer 100 checkpoint questions', target: 100, value: (c) => c.game.counters.quizAnswers },
  { id: 'week-1', icon: '✅', title: 'Week One Down', desc: 'Master your first week', target: 1, value: (c) => c.mastered },
  { id: 'foundation', icon: '🟢', title: 'Foundation Complete', desc: 'Master all 10 Foundation weeks', target: 10, value: (c) => c.courseDone.foundation },
  { id: 'intermediate', icon: '🔵', title: 'Intermediate Complete', desc: 'Master all 10 Intermediate weeks', target: 10, value: (c) => c.courseDone.intermediate },
  { id: 'advanced', icon: '🟣', title: 'Graduate', desc: 'Master all 10 Advanced weeks', target: 10, value: (c) => c.courseDone.advanced },
  { id: 'solo', icon: '🎶', title: 'Solo Artist', desc: 'Add your first solo to the Woodshed', target: 1, value: (c) => c.projects },
  { id: 'licks-5', icon: '❤️', title: 'Lick Collector', desc: 'Save 5 licks', target: 5, value: (c) => c.licks },
  { id: 'level-10', icon: '🏆', title: 'Player', desc: 'Reach level 10', target: 10, value: (c) => levelOf(c.game.xpTotal) },
];

export function achievementStatus(ctx) {
  return ACHIEVEMENTS.map((a) => {
    const v = Math.min(a.target, a.value(ctx) || 0);
    return { ...a, progress: v, done: v >= a.target, unlockedAt: ctx.game.achievements[a.id] || null };
  });
}

// ── Coach messages (encouragement) ──
export function coachMessage(g, { name, dueCount, hasStarted }) {
  const today = dayKey();
  const xpToday = g.xpByDay[today] || 0;
  const s = streakInfo(g, today);
  const who = name ? `, ${name}` : '';
  if (!hasStarted && g.xpTotal === 0) return { tone: 'start', text: `Welcome${who}! Your first session takes about 20 minutes. Finish one block to start your streak.` };
  if (s.atRisk) return { tone: 'risk', text: `Your ${s.streak}-day streak is on the line${who}. One block today keeps it alive.` };
  if (xpToday === 0) return { tone: 'start', text: `Ready when you are${who}. A quick warm-up gets you on the board today.` };
  if (xpToday < g.dailyGoal) {
    const left = g.dailyGoal - xpToday;
    return { tone: 'progress', text: `${left} XP to today's goal. ${left <= XP.block ? 'One more block does it.' : left <= 3 * XP.block ? 'A couple more blocks and you\'re there.' : 'Keep the momentum going.'}` };
  }
  if (dueCount > 0) return { tone: 'done', text: `Daily goal done 🎉 ${dueCount} review${dueCount === 1 ? ' is' : 's are'} ready if you want bonus XP.` };
  return { tone: 'done', text: `Daily goal done 🎉 Anything extra today is pure bonus — nice work${who}.` };
}

// Migration from the pre-gamification streak (keeps an existing streak alive)
export function migrateGame(raw, oldStreak, oldLastDate, masteredCount) {
  if (raw) return { ...DEFAULT_GAME, ...raw, counters: { ...DEFAULT_GAME.counters, ...(raw.counters || {}) }, reminders: { ...DEFAULT_GAME.reminders, ...(raw.reminders || {}) } };
  const g = { ...DEFAULT_GAME };
  if (oldStreak > 0 && oldLastDate) {
    const last = dayKey(oldLastDate);
    const activeDays = {};
    for (let i = 0; i < oldStreak; i++) activeDays[addDaysKey(last, -i)] = true;
    g.activeDays = activeDays;
    g.bestStreak = oldStreak;
  }
  if (masteredCount > 0) g.xpTotal = masteredCount * 100; // credit earlier mastered weeks
  return g;
}
