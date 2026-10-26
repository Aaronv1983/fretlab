// Progress hub: level, streak, daily goal history, achievements, and how XP is earned
import { T, mono, sys, alpha } from '../theme.js';
import { useGame } from '../game/GameProvider.jsx';
import { GoalRing, WeekStrip, LevelBar, XpChart, FreezeBadge, goalName } from '../game/GameUI.jsx';
import { XP } from '../game/engine.js';

const card = { background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 22 };
const label = { ...mono(10, 700), color: T.textMuted, letterSpacing: 1.5 };

export default function Achievements() {
  const g = useGame();
  const unlocked = g.achievements.filter((a) => a.done).length;
  const goalDays = Object.keys(g.game.goalDays).length;
  const activeDays = Object.keys(g.game.activeDays).length;

  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto', background: T.bg }}>
      <div className="fl-page" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div style={{ ...sys(26, 800), color: T.text }}>Achievements</div>
          <span style={{ ...mono(12), color: T.textMuted }}>{unlocked}/{g.achievements.length} unlocked</span>
        </div>

        {/* Top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          {[
            ['CURRENT STREAK', `${g.streak} 🔥`, T.accent, g.atRisk ? 'Practice today to keep it' : g.streak ? 'Keep it going!' : 'Practice to start one'],
            ['BEST STREAK', `${g.game.bestStreak} day${g.game.bestStreak === 1 ? '' : 's'}`, T.yellow, `${activeDays} day${activeDays === 1 ? '' : 's'} practiced`],
            ['TOTAL XP', `${g.game.xpTotal.toLocaleString()} ⚡`, T.yellow, `${g.xpToday} XP today`],
            ['LEVEL', `${g.level.level}`, T.purple, g.level.title],
            ['GOALS HIT', `${goalDays}`, T.green, `${goalName(g.goal)} goal · ${g.goal} XP/day`],
          ].map(([l, v, c, sub]) => (
            <div key={l} style={{ ...card, padding: 18 }}>
              <div style={label}>{l}</div>
              <div style={{ ...mono(24, 800), color: c, marginTop: 8 }}>{v}</div>
              <div style={{ ...sys(12), color: T.textSecondary, marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        <div className="fl-grid-2">
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <GoalRing size={128} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={label}>TODAY</div>
                <div style={{ ...sys(16, 700), color: T.text }}>{g.goalMet ? 'Daily goal complete 🎉' : `${g.goal - g.xpToday} XP to your daily goal`}</div>
                <LevelBar />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={label}>LAST 7 DAYS</div>
              <FreezeBadge />
            </div>
            <WeekStrip />
          </div>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={label}>XP — LAST 14 DAYS</div>
            <XpChart days={14} height={170} />
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
          {[...g.achievements].sort((a, b) => Number(b.done) - Number(a.done)).map((a) => {
            const pct = a.progress / a.target;
            return (
              <div key={a.id} style={{ ...card, padding: 18, display: 'flex', gap: 14, alignItems: 'center', opacity: a.done ? 1 : 0.85, borderColor: a.done ? alpha(T.yellow, 0.35) : T.border }}>
                <div style={{ width: 56, height: 56, borderRadius: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: a.done ? alpha(T.yellow, 0.16) : 'rgba(255,255,255,0.04)', filter: a.done ? 'none' : 'grayscale(1)', border: `2px solid ${a.done ? alpha(T.yellow, 0.6) : 'rgba(255,255,255,0.08)'}` }}>{a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...sys(14, 700), color: T.text }}>{a.title}</div>
                  <div style={{ ...sys(12), color: T.textSecondary, marginTop: 2 }}>{a.desc}</div>
                  {a.done ? (
                    <div style={{ ...mono(10, 700), color: T.yellow, marginTop: 8 }}>UNLOCKED{a.unlockedAt ? ` · ${new Date(a.unlockedAt).toLocaleDateString()}` : ''}</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${pct * 100}%`, background: T.blue }} />
                      </div>
                      <span style={{ ...mono(10), color: T.textMuted }}>{a.progress.toLocaleString()}/{a.target.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* How to earn */}
        <div style={{ ...card }}>
          <div style={label}>HOW TO EARN XP</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px 24px', marginTop: 14 }}>
            {[
              ['Finish a session block', XP.block], ['Correct checkpoint answer', XP.correct], ['Finish a checkpoint', XP.checkpoint],
              ['Perfect checkpoint (100%)', XP.perfect], ['Master a week (first time)', XP.mastered], ['Add a solo to the Woodshed', XP.newSolo],
              ['Practice a chunk at a new speed', XP.chunkTempo], ['Master a Woodshed chunk', XP.chunkMastered], ['Save a lick', XP.lick], ['Create a custom scale', XP.customScale],
            ].map(([t, x]) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', ...sys(13), color: T.textSecondary, borderBottom: `1px solid ${T.border}`, paddingBottom: 8 }}>
                <span>{t}</span><span style={{ ...mono(13, 800), color: T.yellow }}>+{x}</span>
              </div>
            ))}
          </div>
          <div style={{ ...sys(12), color: T.textMuted, marginTop: 14, lineHeight: 1.5 }}>
            Practicing on any day extends your streak. Every 7 days in a row earns a streak freeze (hold up to 2) that automatically covers a missed day.
          </div>
        </div>
      </div>
    </div>
  );
}
