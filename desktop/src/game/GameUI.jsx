// Gamification widgets: XP toasts, celebration screens, daily-goal ring, streak week, level bar, XP chart.
import { useEffect, useMemo } from 'react';
import { T, mono, sys, alpha } from '../theme.js';
import { useGame } from './GameProvider.jsx';
import { addDaysKey, DAILY_GOALS, MAX_FREEZES } from './engine.js';

// ── Toast stack (top-right) ──
export function Toasts() {
  const { toasts } = useGame();
  return (
    <div style={{ position: 'absolute', top: 18, right: 22, zIndex: 80, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', pointerEvents: 'none' }}>
      {toasts.map((t) => {
        const color = t.kind === 'xp' ? T.yellow : t.kind === 'streak' ? T.accent : t.kind === 'freeze' ? T.blue : T.purple;
        const icon = t.kind === 'xp' ? '⚡' : t.kind === 'streak' ? '🔥' : t.kind === 'freeze' ? '❄️' : t.icon || '🏆';
        return (
          <div key={t.id} className="fl-toast" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px 10px 12px', minWidth: 230, maxWidth: 360, background: '#2A2C30', border: `1px solid ${alpha(color, 0.45)}`, borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.45)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: alpha(color, 0.16), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...mono(14, 800), color }}>{t.text}</div>
              {t.sub && <div style={{ ...sys(11.5), color: T.textSecondary, marginTop: 1 }}>{t.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Confetti (CSS only) ──
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.6, dur: 2.2 + Math.random() * 1.6, rot: Math.random() * 360,
    color: [T.accent, T.yellow, T.green, T.blue, T.purple, '#ffffff'][i % 6], w: 6 + Math.random() * 6, drift: (Math.random() - 0.5) * 160,
  })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {pieces.map((p, i) => (
        <span key={i} className="fl-confetti" style={{ left: `${p.left}%`, width: p.w, height: p.w * 0.45, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, '--rot': `${p.rot}deg`, '--drift': `${p.drift}px` }} />
      ))}
    </div>
  );
}

// ── Celebration screen (daily goal / level up) ──
export function Celebration() {
  const g = useGame();
  const c = g.celebration;
  useEffect(() => {
    if (!c) return;
    const onKey = (e) => { if (e.key === 'Enter' || e.key === 'Escape') g.dismissCelebration(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c, g]);
  if (!c) return null;
  const goal = c.type === 'goal';
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(10,11,13,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="fl-fadein">
      <Confetti />
      <div className="fl-popin" style={{ position: 'relative', width: 'min(460px, 90%)', padding: '34px 34px 28px', background: T.card, border: `1px solid ${T.borderLight}`, borderRadius: 16, textAlign: 'center', boxShadow: '0 30px 80px rgba(0,0,0,.55)' }}>
        <div className="fl-bounce" style={{ fontSize: 72, lineHeight: 1 }}>{goal ? '🔥' : '🏆'}</div>
        <div style={{ ...sys(28, 800), color: T.text, marginTop: 14 }}>{goal ? 'Daily goal reached!' : `Level ${c.level}!`}</div>
        <div style={{ ...sys(14), color: T.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
          {goal
            ? `${c.xpToday} XP today. ${c.streak > 1 ? `That's ${c.streak} days in a row — keep the fire going.` : 'Come back tomorrow to build your streak.'}`
            : `You're now a ${c.title}. Every session is paying off.`}
        </div>
        {goal && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
            <Stat label="STREAK" value={`${c.streak} 🔥`} color={T.accent} />
            <Stat label="TODAY" value={`${c.xpToday} XP`} color={T.yellow} />
            <Stat label="GOAL" value={`${c.goal} XP`} color={T.green} />
          </div>
        )}
        <button className="fl-btn" onClick={g.dismissCelebration} style={{ marginTop: 26, width: '100%', ...mono(15, 800), color: '#fff', background: T.accent, padding: '14px 0', borderRadius: 8 }}>
          {goal ? 'Keep Going' : 'Awesome'}
        </button>
      </div>
    </div>
  );
}
function Stat({ label, value, color }) {
  return (
    <div style={{ padding: '10px 14px', background: '#2A2C30', borderRadius: 8, minWidth: 104 }}>
      <div style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1.5 }}>{label}</div>
      <div style={{ ...mono(16, 800), color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

// ── Daily goal ring ──
export function GoalRing({ size = 120, stroke = 11 }) {
  const { xpToday, goal } = useGame();
  const p = Math.min(1, xpToday / goal);
  const r = size / 2 - stroke / 2, circ = 2 * Math.PI * r;
  const done = p >= 1;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={done ? T.green : T.yellow} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - p)} style={{ transition: 'stroke-dashoffset .8s ease', opacity: p > 0 ? 1 : 0 }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...mono(size * 0.2, 800), color: done ? T.green : T.text }}>{done ? '✓' : xpToday}</div>
        <div style={{ ...mono(size * 0.085, 600), color: T.textMuted }}>{done ? `${xpToday} XP` : `/ ${goal} XP`}</div>
      </div>
    </div>
  );
}

// ── Last 7 days strip ──
export function WeekStrip() {
  const { game, today } = useGame();
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(today, i - 6));
  const letter = (k) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${k}T12:00:00`).getDay()];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
      {days.map((d) => {
        const active = !!game.activeDays[d], frozen = !!game.frozenDays[d], goal = !!game.goalDays[d], isToday = d === today;
        return (
          <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <span style={{ ...mono(10, 700), color: isToday ? T.text : T.textMuted }}>{letter(d)}</span>
            <div title={d} style={{
              width: 34, height: 34, borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              background: active ? (goal ? alpha(T.accent, 0.22) : alpha(T.yellow, 0.16)) : frozen ? alpha(T.blue, 0.18) : 'rgba(255,255,255,0.04)',
              border: `2px solid ${isToday ? (active ? T.accent : T.textMuted) : 'transparent'}`,
            }}>
              {active ? '🔥' : frozen ? '❄️' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Level bar ──
export function LevelBar({ compact = false }) {
  const { level } = useGame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ ...mono(compact ? 12 : 13, 800), color: T.purple }}>LV {level.level}</span>
        <span style={{ ...sys(compact ? 12 : 13, 700), color: T.text }}>{level.title}</span>
        <span style={{ flex: 1 }} />
        <span style={{ ...mono(10), color: T.textMuted }}>{level.toNext} XP to LV {level.level + 1}</span>
      </div>
      <div style={{ height: compact ? 6 : 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${T.purple}, ${T.blue})`, width: `${Math.max(2, level.pct * 100)}%`, transition: 'width .8s ease' }} />
      </div>
    </div>
  );
}

// ── XP per day (last N days) ──
export function XpChart({ days = 14, height = 140 }) {
  const { game, today } = useGame();
  const keys = Array.from({ length: days }, (_, i) => addDaysKey(today, i - (days - 1)));
  const vals = keys.map((k) => game.xpByDay[k] || 0);
  const max = Math.max(game.dailyGoal * 1.25, ...vals, 10);
  const goalY = height - (game.dailyGoal / max) * height;
  return (
    <div style={{ position: 'relative', height: height + 22 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: goalY, borderTop: `1px dashed ${alpha(T.green, 0.6)}` }} />
      <span style={{ position: 'absolute', right: 0, top: goalY - 16, ...mono(9, 700), color: T.green }}>GOAL {game.dailyGoal}</span>
      <div style={{ position: 'absolute', inset: 0, bottom: 22, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
        {vals.map((v, i) => (
          <div key={keys[i]} title={`${keys[i]}: ${v} XP`} style={{ flex: 1, height: `${(v / max) * 100}%`, minHeight: v ? 3 : 0, borderRadius: '4px 4px 0 0', background: v >= game.dailyGoal ? T.green : T.yellow, opacity: keys[i] === today ? 1 : 0.8 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', gap: 6 }}>
        {keys.map((k) => <span key={k} style={{ flex: 1, textAlign: 'center', ...mono(9), color: k === today ? T.text : T.textMuted }}>{Number(k.slice(8))}</span>)}
      </div>
    </div>
  );
}

export function FreezeBadge() {
  const { game } = useGame();
  return (
    <span title="Streak freezes protect your streak if you miss a day. Earn one every 7-day streak." style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...mono(11, 700), color: T.blue, background: T.blueSoft, padding: '4px 10px', borderRadius: 999 }}>
      ❄️ {game.freezes}/{MAX_FREEZES} freezes
    </span>
  );
}

export function goalName(xp) {
  return (DAILY_GOALS.find((g) => g.xp === xp) || { name: 'Custom' }).name;
}
