// Port of HomeViewV2.swift — desktop dashboard layout
import { useEffect, useState } from 'react';
import { T, mono, sys, courseColor, LEVEL_NAME, alpha, BLOCK, blockColor } from '../theme.js';
import { useStore, routineMinutes } from '../store.jsx';
import { ProgressRing, SkillRadarChart, StreakBadge } from '../components/Charts.jsx';
import Icon from '../components/Icon.jsx';
import { Alert } from '../components/Overlays.jsx';

const sectionLabel = { ...mono(10, 700), color: T.textMuted, letterSpacing: 1.5 };
const card = { background: T.card, borderRadius: 16, border: `1px solid ${T.border}` };

export default function Home({ go }) {
  const st = useStore();
  const r = st.currentRoutine;
  const [animateIn, setAnimateIn] = useState(false);
  const [toolAlert, setToolAlert] = useState(null);
  useEffect(() => { const id = requestAnimationFrame(() => setAnimateIn(true)); return () => cancelAnimationFrame(id); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const prog = st.progressFor(r?.id || '');

  const toolBtn = (icon, label, color, bg, tool) => (
    <div className="fl-press" key={tool} onClick={() => (tool === 'Scales' ? go('scales') : setToolAlert(tool))}
      style={{ ...card, borderRadius: 14, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0', cursor: 'pointer' }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={22} color={color} />
      </div>
      <div style={{ ...mono(10), color: T.textSecondary }}>{label}</div>
    </div>
  );

  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto', background: T.bg }}>
      <div className="fl-page" style={{ opacity: animateIn ? 1 : 0, transform: `translateY(${animateIn ? 0 : 12}px)`, transition: 'opacity .5s ease-out, transform .5s ease-out' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ ...mono(11), color: T.textSecondary, letterSpacing: 1.5 }}>{greeting}</div>
            <div style={{ ...sys(28, 800), color: T.text }}>{st.settings.name || 'Welcome back'}</div>
          </div>
          <div style={{ flex: 1 }} />
          <StreakBadge count={st.streak} />
        </div>

        <div className="fl-grid-2">
          {/* ── Left column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Today's session */}
            <div className="fl-press" onClick={() => go('practice')} style={{ ...card, border: `1px solid ${T.borderLight}`, position: 'relative', overflow: 'hidden', padding: 26, cursor: 'pointer' }}>
              <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: T.accentSoft, filter: 'blur(60px)', right: -30, top: -60, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ ...mono(9, 700), color: T.accent, letterSpacing: 2 }}>TODAY'S SESSION</span>
                    <span style={{ ...mono(9), color: T.textMuted }}>~{routineMinutes(r)} MIN</span>
                  </div>
                  <div style={{ ...sys(24, 800), color: T.text }}>{r?.name || 'Loading...'}</div>
                  <div style={{ ...sys(12), color: T.textSecondary }}>Week {r?.weekNumber || 1} · {LEVEL_NAME[r?.courseLevel] || ''} · Day {st.currentDayInRoutine}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                    <Icon name="book" size={12} color={T.blue} fill={T.blue} />
                    <span style={{ ...sys(12), color: T.blue }}>{r?.theoryModuleName || ''}</span>
                  </div>
                </div>
                <ProgressRing progress={prog.completedDays / prog.totalDays} size={76} lineWidth={6} />
              </div>
              {r?.connectionDescription && (
                <div style={{ ...sys(12), color: T.textSecondary, lineHeight: 1.55, marginTop: 16, position: 'relative' }}>{r.connectionDescription}</div>
              )}
              {r && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16, position: 'relative' }}>
                  {r.sessionBlocks.map((b) => (
                    <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...sys(10, 600), color: blockColor(b.type), background: alpha(blockColor(b.type), 0.1), padding: '5px 10px', borderRadius: 8 }}>
                      <Icon name={BLOCK[b.type].icon} size={12} color={blockColor(b.type)} fill={b.type === 'warmUp'} /> {BLOCK[b.type].name} · {b.estimatedMinutes}m
                    </span>
                  ))}
                </div>
              )}
              <div style={{ height: 1, background: T.border, marginTop: 20 }} />
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 14, position: 'relative' }}>
                <span style={{ ...sys(15, 700), color: T.accent }}>Start Practice</span>
                <Icon name="arrowRight" size={16} color={T.accent} strokeWidth={2.6} />
              </div>
            </div>

            {/* SM-2 review due */}
            {st.dueCount > 0 && (
              <div className="fl-press" onClick={() => go('quiz')} style={{ ...card, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14, padding: 18, cursor: 'pointer' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: T.purpleSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="rotate" size={18} color={T.purple} strokeWidth={2.4} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...sys(14, 700), color: T.text }}>{st.dueCount} reviews due</div>
                  <div style={{ ...sys(11), color: T.textSecondary }}>Spaced repetition items ready for review</div>
                </div>
                <Icon name="chevronRight" size={14} color={T.textMuted} />
              </div>
            )}

            {/* Quick tools */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionLabel}>QUICK TOOLS</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {toolBtn('metronome', 'Metronome', T.green, T.greenSoft, 'Metronome')}
                {toolBtn('tuningFork', 'Tuner', T.blue, T.blueSoft, 'Tuner')}
                {toolBtn('listMusic', 'Scales', T.purple, T.purpleSoft, 'Scales')}
                {toolBtn('piano', 'Key Finder', T.yellow, T.yellowSoft, 'Key Finder')}
              </div>
            </div>

            {/* Courses */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionLabel}>COURSES</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                {st.courses.map((course, index) => {
                  const completed = course.routines.filter((x) => st.isRoutineMastered(x.id)).length;
                  const locked = index > 0 && !st.isRoutineUnlocked(course.routines[0]?.id || '');
                  const color = courseColor(course.level);
                  return (
                    <div key={course.id} className={locked ? '' : 'fl-press'} onClick={() => { if (!locked) go('courses'); }}
                      style={{ ...card, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12, padding: 18, opacity: locked ? 0.4 : 1, cursor: locked ? 'default' : 'pointer' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 11, background: locked ? 'rgba(255,255,255,0.03)' : alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {locked ? <Icon name="lock" size={14} color={T.textMuted} /> : <span style={{ ...mono(14, 800), color }}>{index + 1}</span>}
                      </div>
                      <div>
                        <div style={{ ...sys(15, 700), color: T.text }}>{LEVEL_NAME[course.level]}</div>
                        <div style={{ ...sys(11), color: T.textSecondary, marginTop: 2 }}>{completed}/{course.routines.length} routines</div>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ height: 4, borderRadius: 2, background: color, width: `${(completed / Math.max(1, course.routines.length)) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionLabel}>SKILL RADAR</div>
              <div style={{ ...card, display: 'flex', justifyContent: 'center', padding: '28px 12px' }}>
                <SkillRadarChart data={st.skillRadarData} size={300} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={sectionLabel}>PRACTICE STATS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  ['STREAK', `${st.streak}`, 'days', T.yellow],
                  ['PRACTICE', `${Math.floor(st.totalPracticeMinutes / 60)}h ${st.totalPracticeMinutes % 60}m`, 'total', T.green],
                  ['WEEKS', `${st.courses.flatMap((c) => c.routines).filter((x) => st.isRoutineMastered(x.id)).length}/30`, 'mastered', T.accent],
                ].map(([label, value, sub, color]) => (
                  <div key={label} style={{ ...card, borderRadius: 14, padding: 16 }}>
                    <div style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1.5 }}>{label}</div>
                    <div style={{ ...mono(20, 700), color, marginTop: 6 }}>{value}</div>
                    <div style={{ ...sys(11), color: T.textSecondary }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Alert open={!!toolAlert} title={toolAlert} message={`${toolAlert} is available in the Practice session. Open Practice now?`}
        onClose={() => setToolAlert(null)}
        buttons={[{ label: 'Cancel', role: 'cancel' }, { label: 'Go to Practice', action: () => go('practice') }]} />
    </div>
  );
}
