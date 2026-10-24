// Port of HomeViewV2.swift
import { useEffect, useState } from 'react';
import { T, mono, sys, courseColor, LEVEL_NAME, alpha } from '../theme.js';
import { useStore, routineMinutes } from '../store.jsx';
import { ProgressRing, SkillRadarChart, StreakBadge } from '../components/Charts.jsx';
import Icon from '../components/Icon.jsx';
import { Alert, Sheet, NavButton } from '../components/Overlays.jsx';
import ScaleLibrary from './ScaleLibrary.jsx';

const sectionLabel = { ...mono(10, 700), color: T.textMuted, letterSpacing: 1.5 };

export default function Home({ go }) {
  const st = useStore();
  const r = st.currentRoutine;
  const [animateIn, setAnimateIn] = useState(false);
  const [toolAlert, setToolAlert] = useState(null);
  const [showScales, setShowScales] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setAnimateIn(true)); return () => cancelAnimationFrame(id); }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const prog = st.progressFor(r?.id || '');

  const toolBtn = (icon, label, color, bg, tool) => (
    <div className="fl-press" key={tool} onClick={() => (tool === 'Scales' ? setShowScales(true) : setToolAlert(tool))}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 0', background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={color} />
      </div>
      <div style={{ ...mono(9), color: T.textSecondary }}>{label}</div>
    </div>
  );

  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto', background: T.bg }}>
      <div style={{ opacity: animateIn ? 1 : 0, transform: `translateY(${animateIn ? 0 : 12}px)`, transition: 'opacity .5s ease-out, transform .5s ease-out' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ ...mono(11), color: T.textSecondary, letterSpacing: 1.5 }}>{greeting}</div>
            <div style={{ ...sys(24, 800), color: T.text }}>Aaron</div>
          </div>
          <div style={{ flex: 1 }} />
          <StreakBadge count={st.streak} />
        </div>

        {/* Today's session */}
        <div style={{ padding: '20px 16px 0' }}>
          <div className="fl-press" onClick={() => go('practice')} style={{ position: 'relative', overflow: 'hidden', padding: 18, background: T.card, borderRadius: 16, border: `1px solid ${T.borderLight}`, cursor: 'pointer' }}>
            <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: T.accentSoft, filter: 'blur(40px)', left: '50%', top: '50%', transform: 'translate(calc(-50% + 80px), calc(-50% - 30px))', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ ...mono(9, 700), color: T.accent, letterSpacing: 2 }}>TODAY'S SESSION</span>
                  <span style={{ ...mono(9), color: T.textMuted }}>~{routineMinutes(r)} MIN</span>
                </div>
                <div style={{ ...sys(19, 700), color: T.text }}>{r?.name || 'Loading...'}</div>
                <div style={{ ...sys(12), color: T.textSecondary }}>Week {r?.weekNumber || 1} · {LEVEL_NAME[r?.courseLevel] || ''}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 4 }}>
                  <Icon name="book" size={10} color={T.blue} fill={T.blue} />
                  <span style={{ ...sys(11), color: T.blue }}>{r?.theoryModuleName || ''}</span>
                </div>
              </div>
              <ProgressRing progress={prog.completedDays / prog.totalDays} size={56} />
            </div>
            <div style={{ height: 1, background: T.border, marginTop: 14 }} />
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 10, position: 'relative' }}>
              <span style={{ ...sys(14, 700), color: T.accent }}>Start Practice</span>
              <Icon name="arrowRight" size={14} color={T.accent} strokeWidth={2.6} />
            </div>
          </div>
        </div>

        {/* SM-2 review due */}
        {st.dueCount > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <div className="fl-press" onClick={() => go('quiz')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.purpleSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="rotate" size={16} color={T.purple} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...sys(14, 700), color: T.text }}>{st.dueCount} reviews due</div>
                <div style={{ ...sys(11), color: T.textSecondary }}>Spaced repetition items ready for review</div>
              </div>
              <Icon name="chevronRight" size={12} color={T.textMuted} />
            </div>
          </div>
        )}

        {/* Quick tools */}
        <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={sectionLabel}>QUICK TOOLS</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {toolBtn('metronome', 'Metronome', T.green, T.greenSoft, 'Metronome')}
            {toolBtn('tuningFork', 'Tuner', T.blue, T.blueSoft, 'Tuner')}
            {toolBtn('listMusic', 'Scales', T.purple, T.purpleSoft, 'Scales')}
            {toolBtn('piano', 'Key Finder', T.yellow, T.yellowSoft, 'Key Finder')}
          </div>
        </div>

        {/* Skill radar */}
        <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={sectionLabel}>SKILL RADAR</div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: 12, background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
            <SkillRadarChart data={st.skillRadarData} size={220} />
          </div>
        </div>

        {/* Courses */}
        <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={sectionLabel}>COURSES</div>
          {st.courses.map((course, index) => {
            const completed = course.routines.filter((x) => st.isRoutineMastered(x.id)).length;
            const locked = index > 0 && !st.isRoutineUnlocked(course.routines[0]?.id || '');
            const color = courseColor(course.level);
            return (
              <div key={course.id} className={locked ? '' : 'fl-press'} onClick={() => { if (!locked) go('courses'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, opacity: locked ? 0.4 : 1, cursor: locked ? 'default' : 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: locked ? 'rgba(255,255,255,0.03)' : alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {locked ? <Icon name="lock" size={12} color={T.textMuted} /> : <span style={{ ...mono(12, 800), color }}>{index + 1}</span>}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ ...sys(14, 700), color: T.text }}>{LEVEL_NAME[course.level]}</div>
                  <div style={{ ...sys(11), color: T.textSecondary }}>{completed}/{course.routines.length} routines</div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ height: 3, borderRadius: 2, background: color, width: `${(completed / Math.max(1, course.routines.length)) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 100 }} />
      </div>

      <Alert open={!!toolAlert} title={toolAlert} message={`${toolAlert} is available in the Practice session. Open Practice now?`}
        onClose={() => setToolAlert(null)}
        buttons={[{ label: 'Cancel', role: 'cancel' }, { label: 'Go to Practice', action: () => go('practice') }]} />

      <Sheet open={showScales} onClose={() => setShowScales(false)} trailing={<NavButton onClick={() => setShowScales(false)} color={T.accent} bold>Done</NavButton>}>
        <ScaleLibrary />
      </Sheet>
    </div>
  );
}
