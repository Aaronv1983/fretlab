// Port of CourseListView (SessionViews.swift)
// iOS lists only the Foundation course; all three courses are listed here so Intermediate/Advanced are reachable,
// and unlocked weeks can be tapped to make them the current routine.
import { T, mono, sys, courseColor, LEVEL_NAME } from '../theme.js';
import { useStore } from '../store.jsx';
import Icon from '../components/Icon.jsx';

export default function Courses({ go }) {
  const st = useStore();
  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto', background: T.bg }}>
      <div className="fl-page" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {st.courses.map((course) => (
          <div key={course.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ ...sys(22, 800), color: T.text, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: courseColor(course.level) }} />
                {LEVEL_NAME[course.level]} Course
              </div>
              <span style={{ ...mono(11), color: T.textMuted }}>{course.routines.filter((x) => st.isRoutineMastered(x.id)).length}/{course.routines.length} mastered</span>
            </div>
            <div className="fl-grid-cards">
            {course.routines.map((routine) => {
              const isMastered = st.isRoutineMastered(routine.id);
              const isUnlocked = st.isRoutineUnlocked(routine.id);
              const isCurrent = st.currentRoutine?.id === routine.id;
              const dot = isCurrent ? 22 : isMastered ? 18 : 14;
              return (
                <div key={routine.id} style={{ display: 'flex' }}>
                  <div className={isUnlocked && !isCurrent ? 'fl-press' : ''}
                    onClick={() => { if (isUnlocked && !isCurrent) { st.setCurrentRoutineId(routine.id); go('home'); } }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
                      background: isCurrent ? T.accentSoft : T.card, borderRadius: 12,
                      border: `1px solid ${isCurrent ? 'rgba(255,107,53,0.25)' : T.border}`,
                      opacity: isUnlocked ? 1 : 0.35, cursor: isUnlocked && !isCurrent ? 'pointer' : 'default',
                    }}>
                    <div style={{
                      width: dot, height: dot, borderRadius: '50%', flexShrink: 0,
                      background: isMastered ? T.green : isCurrent ? T.accent : 'rgba(255,255,255,0.08)',
                      boxShadow: isCurrent ? `0 0 8px ${T.accentGlow}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isMastered && <Icon name="check" size={10} color="#000" strokeWidth={4} />}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <div style={{ ...mono(9), color: T.textMuted }}>WEEK {routine.weekNumber}</div>
                      <div style={{ ...sys(14, 700), color: T.text }}>{routine.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10 }}>📘</span>
                        <span style={{ ...sys(11), color: T.blue }}>{routine.theoryModuleName}</span>
                      </div>
                    </div>
                    {isMastered ? (
                      <span style={{ ...mono(13, 700), color: T.green }}>{Math.trunc(st.progressFor(routine.id).bestCheckpointScore * 100)}%</span>
                    ) : isCurrent ? (
                      <Icon name="play" size={11} color={T.accent} />
                    ) : !isUnlocked ? (
                      <Icon name="lock" size={12} color={T.textMuted} />
                    ) : null}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
