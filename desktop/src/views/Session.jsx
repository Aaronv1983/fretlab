// Port of SessionViewV2.swift + SessionTimer.swift
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { T, mono, sys, BLOCK, blockColor, alpha } from '../theme.js';
import { useStore } from '../store.jsx';
import { metronome, SUBDIVISIONS, detectSubdivision } from '../services/metronome.js';
import { FretboardView } from '../components/Fretboard.jsx';
import TabScore from '../score/TabScore.jsx';
import { useGame } from '../game/GameProvider.jsx';
import { XP } from '../game/engine.js';
import Icon from '../components/Icon.jsx';

export function useMetronome() {
  useSyncExternalStore((cb) => metronome.subscribe(cb), () => metronome.snapshot());
  return metronome;
}

function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const formatted = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  return {
    formatted, running,
    toggle: () => setRunning((r) => !r),
    pause: () => setRunning(false),
    reset: () => { setRunning(false); setElapsed(0); },
  };
}

const truncate = (s, n) => (s.length > n ? s.slice(0, n) + '...' : s);
const card = { background: T.card, borderRadius: 12, border: `1px solid ${T.border}` };

export default function Session({ go }) {
  const st = useStore();
  const g = useGame();
  const routine = st.currentRoutine;
  const blocks = routine?.sessionBlocks || [];
  const timer = useSessionTimer();
  const m = useMetronome();
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [completedBlocks, setCompletedBlocks] = useState(() => new Set());
  const advanceRef = useRef(null);

  // onDisappear: stop metronome, pause timer
  useEffect(() => () => { metronome.stop(); metronome.setSubdivision(1); clearTimeout(advanceRef.current); }, []);

  // Match the click to how the current exercise is counted (quarters, 1-&, 1-e-&-a, triplets)
  const curEx = blocks[activeBlockIndex]?.exercises?.[activeExerciseIndex];
  useEffect(() => { metronome.setSubdivision(detectSubdivision(curEx)); }, [curEx?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Theory and Checkpoint have no metronome controls, so the click can't be left running there
  useEffect(() => { if (!blocks[activeBlockIndex]?.exercises?.length) metronome.stop(); }, [activeBlockIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBlockLocked = (i) => i !== 0 && !completedBlocks.has(i - 1);

  const completeAndAdvance = () => {
    if (!completedBlocks.has(activeBlockIndex)) {
      const b = blocks[activeBlockIndex];
      const cheers = ['Nice work!', 'Clean!', 'Keep it rolling!', 'Locked in!', 'That\'s how it\'s done!'];
      g.earn(XP.block, `${BLOCK[b.type].name} complete · ${cheers[(activeBlockIndex + completedBlocks.size) % cheers.length]}`);
      g.bump('blocks');
    }
    setCompletedBlocks((s) => new Set(s).add(activeBlockIndex));
    const idx = activeBlockIndex;
    advanceRef.current = setTimeout(() => {
      if (idx < blocks.length - 1) {
        setActiveBlockIndex(idx + 1);
        setActiveExerciseIndex(0);
      }
    }, 600);
  };

  const block = blocks[activeBlockIndex];
  const total = blocks.length || 5;
  const pct = completedBlocks.size / Math.max(1, total);

  const completeButton = (
    <button className="fl-btn" onClick={completeAndAdvance} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: T.green, color: '#fff', borderRadius: 14, ...mono(14, 700) }}>
      <Icon name="checkCircleFill" size={16} color="#fff" /> Complete &amp; Continue
    </button>
  );

  const smallBtn = { width: 30, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 5, border: `1px solid ${T.border}`, color: T.text, ...sys(14, 700) };

  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto', background: T.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 28px', borderBottom: `1px solid ${T.border}` }}>
        <button className="fl-link" onClick={() => go('home')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textSecondary, width: 90, ...sys(13) }}>
          <Icon name="chevronLeft" size={12} /> Home
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ ...sys(16, 700), color: T.text }}>{routine?.name || ''}</div>
          <div style={{ ...mono(10), color: T.textMuted }}>WEEK {routine?.weekNumber || 1} · DAY {st.currentDayInRoutine}</div>
        </div>
        <div style={{ width: 90 }} />
      </div>

      <div className="fl-page" style={{ paddingTop: 16 }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1 }}>SESSION PROGRESS</span>
          <span style={{ ...mono(10, 600), color: T.accent }}>{completedBlocks.size}/{total} blocks</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ height: 6, borderRadius: 3, background: T.accent, width: `${pct * 100}%`, transition: 'width .5s ease-in-out' }} />
        </div>
      </div>

      {/* Block tabs */}
      <div className="fl-hscroll" style={{ display: 'flex', gap: 8, padding: '14px 0 10px', overflowX: 'auto' }}>
        {blocks.map((b, i) => {
          const done = completedBlocks.has(i), active = activeBlockIndex === i, locked = isBlockLocked(i);
          const bc = blockColor(b.type);
          const fg = done ? T.green : active ? bc : locked ? alpha(T.textMuted, 0.5) : T.textMuted;
          return (
            <div key={b.id} onClick={() => { if (!locked) { setActiveBlockIndex(i); setActiveExerciseIndex(0); } }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, flexShrink: 0, whiteSpace: 'nowrap',
                color: fg, background: active ? alpha(bc, 0.12) : done ? T.greenSoft : 'transparent',
                border: `1px solid ${active ? alpha(bc, 0.3) : done ? alpha(T.green, 0.2) : T.border}`,
                opacity: locked ? 0.5 : 1, cursor: locked ? 'default' : 'pointer', transition: 'all .2s',
              }}>
              {done ? <Icon name="checkCircleFill" size={12} color={T.green} /> : locked ? <Icon name="lock" size={10} color={T.textMuted} /> : <Icon name={BLOCK[b.type].icon} size={12} fill={b.type === 'warmUp'} />}
              <span style={{ ...sys(10, 600) }}>{BLOCK[b.type].name}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 28, alignItems: 'start', marginTop: 8 }}>
      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        {block && (isBlockLocked(activeBlockIndex) ? (
          <Locked onBack={activeBlockIndex > 0 ? () => { setActiveBlockIndex(activeBlockIndex - 1); setActiveExerciseIndex(0); } : null} />
        ) : block.exercises && block.exercises.length > 0 ? (
          <>
            <Selector items={block.exercises.map((e) => e.name)} max={44} active={activeExerciseIndex} onPick={setActiveExerciseIndex} color={T.accent} soft={T.accentSoft} />
            {block.exercises[activeExerciseIndex] && <ExerciseDetail ex={block.exercises[activeExerciseIndex]} m={m} />}
            <div style={{ paddingTop: 8 }}>
              {activeExerciseIndex < block.exercises.length - 1 ? (
                <NavBtn label="Next Exercise →" color={T.accent} soft={T.accentSoft} onClick={() => setActiveExerciseIndex(activeExerciseIndex + 1)} />
              ) : completeButton}
            </div>
          </>
        ) : block.theoryLessons && block.theoryLessons.length > 0 ? (
          <>
            <TheoryBanner />
            <Selector items={block.theoryLessons.map((l) => l.title)} max={44} active={activeExerciseIndex} onPick={setActiveExerciseIndex} color={T.blue} soft={T.blueSoft} />
            {block.theoryLessons[activeExerciseIndex] && <LessonDetail lesson={block.theoryLessons[activeExerciseIndex]} />}
            <div style={{ paddingTop: 8 }}>
              {activeExerciseIndex < block.theoryLessons.length - 1 ? (
                <NavBtn label="Next Lesson →" color={T.blue} soft={T.blueSoft} onClick={() => setActiveExerciseIndex(activeExerciseIndex + 1)} />
              ) : (
                <button className="fl-btn" onClick={completeAndAdvance} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: T.accent, color: '#fff', borderRadius: 14, ...mono(13, 700) }}>
                  <Icon name="checkCircleFill" size={16} color="#fff" /> Complete Theory → Take Quiz
                </button>
              )}
            </div>
          </>
        ) : block.type === 'checkpoint' ? (
          <CheckpointIntro onStart={() => go('quiz')} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '30px 0' }}>
            <Icon name={BLOCK[block.type].icon} size={36} color={blockColor(block.type)} />
            <div style={{ ...sys(18, 700), color: T.text }}>{BLOCK[block.type].name}</div>
            <div style={{ ...sys(13), color: T.textSecondary }}>Mark complete to continue.</div>
            {completeButton}
          </div>
        ))}
      </div>
      <div style={{ position: 'sticky', top: 16 }}>
      {/* Timer + BPM */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ ...card, display: 'flex', alignItems: 'center', padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ ...mono(8), color: T.textMuted, letterSpacing: 1 }}>TIMER</span>
            <span style={{ ...mono(34, 300), color: T.text, letterSpacing: 2 }}>{timer.formatted}</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button className="fl-btn" onClick={timer.toggle} style={{ ...mono(11, 700), color: timer.running ? T.red : T.accent, background: timer.running ? T.redSoft : T.accentSoft, padding: '6px 14px', borderRadius: 8 }}>
              {timer.running ? 'PAUSE' : 'START'}
            </button>
            <button className="fl-link" onClick={timer.reset} style={{ ...mono(9), color: T.textMuted }}>RESET</button>
          </div>
        </div>
        {block?.exercises?.length > 0 && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <span style={{ ...mono(8), color: T.textMuted, letterSpacing: 1 }}>BPM</span>
              <span style={{ ...mono(34, 700), color: T.text }}>{m.bpm}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button className="fl-btn" style={smallBtn} onClick={() => m.incrementBPM()}>+</button>
              <button className="fl-btn" style={smallBtn} onClick={() => m.decrementBPM()}>−</button>
            </div>
            <button className="fl-btn" onClick={() => m.toggle()} style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.isPlaying ? T.redSoft : T.greenSoft }}>
              <Icon name={m.isPlaying ? 'stop' : 'play'} size={18} color={m.isPlaying ? T.red : T.green} />
            </button>
          </div>
          <SubdivisionPicker m={m} />
          <BeatLights m={m} />
          </div>
        )}
              <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1 }}>TODAY'S ROUTINE</span>
          {blocks.map((b, i) => {
            const done = completedBlocks.has(i), locked = isBlockLocked(i), active = i === activeBlockIndex;
            return (
              <div key={b.id} onClick={() => { if (!locked) { setActiveBlockIndex(i); setActiveExerciseIndex(0); } }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: locked ? 'default' : 'pointer', background: active ? alpha(blockColor(b.type), 0.1) : 'transparent', opacity: locked ? 0.5 : 1 }}>
                {done ? <Icon name="checkCircleFill" size={16} color={T.green} /> : locked ? <Icon name="lock" size={14} color={T.textMuted} /> : <Icon name={BLOCK[b.type].icon} size={16} color={blockColor(b.type)} fill={b.type === 'warmUp'} />}
                <span style={{ ...sys(13, active ? 700 : 500), color: done ? T.green : active ? T.text : T.textSecondary, flex: 1 }}>{BLOCK[b.type].name}</span>
                <span style={{ ...mono(10), color: T.textMuted }}>{b.estimatedMinutes}m</span>
              </div>
            );
          })}
        </div>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
}

export function SubdivisionPicker({ m }) {
  const cur = SUBDIVISIONS.find((x) => x.value === m.subdivision) || SUBDIVISIONS[0];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...mono(8), color: T.textMuted, letterSpacing: 1 }}>CLICK</span>
        <span style={{ ...mono(9), color: T.textSecondary }}>{cur.name} · {cur.count.join(' ')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, padding: 3, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
        {SUBDIVISIONS.map((x) => {
          const on = x.value === m.subdivision;
          return (
            <button key={x.value} className="fl-btn" title={x.name} onClick={() => m.setSubdivision(x.value)}
              style={{ padding: '6px 0', borderRadius: 6, ...sys(14, 700), color: on ? '#fff' : T.textSecondary, background: on ? T.accent : 'transparent' }}>
              {x.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// One group per beat; the big light is the beat (beat 1 accented), the small ones are the subdivisions
export function BeatLights({ m }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${m.beatsPerMeasure}, 1fr)`, gap: 6 }}>
      {Array.from({ length: m.beatsPerMeasure }, (_, b) => (
        <div key={b} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 0', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
          {Array.from({ length: m.subdivision }, (_, s) => {
            const lit = m.isPlaying && m.currentBeat === b + 1 && m.currentSub === s;
            const big = s === 0;
            const col = big && b === 0 ? T.accent : big ? T.green : T.blue;
            const sz = big ? 12 : 7;
            return <div key={s} style={{ width: sz, height: sz, borderRadius: sz, background: lit ? col : 'rgba(255,255,255,0.12)', boxShadow: lit ? `0 0 8px ${col}` : 'none', transition: 'background .05s' }} />;
          })}
        </div>
      ))}
    </div>
  );
}

function Locked({ onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
      <Icon name="lock" size={36} color={T.textMuted} />
      <div style={{ ...sys(16, 700), color: T.text }}>Complete the previous block first</div>
      <div style={{ ...sys(13), color: T.textSecondary, textAlign: 'center', padding: '0 20px' }}>Work through each section in order to build skills progressively.</div>
      {onBack && (
        <button className="fl-btn" onClick={onBack} style={{ ...mono(13, 700), color: T.accent, background: T.accentSoft, padding: '12px 24px', borderRadius: 12 }}>← Go Back</button>
      )}
    </div>
  );
}

function Selector({ items, max, active, onPick, color, soft }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {items.map((name, i) => (
        <div key={i} onClick={() => onPick(i)} style={{
          ...sys(11, 600), whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', padding: '8px 12px', borderRadius: 9,
          color: active === i ? color : T.textSecondary, background: active === i ? soft : 'rgba(255,255,255,0.02)',
          border: `1px solid ${active === i ? alpha(color, 0.3) : T.border}`,
        }}>{i + 1}. {truncate(name, max)}</div>
      ))}
    </div>
  );
}

function NavBtn({ label, color, soft, onClick }) {
  return (
    <button className="fl-btn" onClick={onClick} style={{ width: '100%', ...mono(13, 700), color, background: soft, padding: '12px 0', borderRadius: 12, border: `1px solid ${alpha(color, 0.3)}` }}>{label}</button>
  );
}

function ExerciseDetail({ ex, m }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ ...sys(22, 800), color: T.text }}>{ex.name}</div>
        <div style={{ ...sys(13), color: T.textSecondary, lineHeight: 1.55 }}>{ex.description}</div>
      </div>
      {ex.targetBPM > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="metronome" size={10} color={T.accent} />
          <span style={{ ...mono(11), color: T.accent }}>Target: {ex.targetBPM} BPM</span>
          {m.bpm !== ex.targetBPM && (
            <button className="fl-btn" onClick={() => m.setBPM(ex.targetBPM)} style={{ ...mono(9, 700), color: T.accent, background: T.accentSoft, padding: '3px 8px', borderRadius: 999 }}>Set</button>
          )}
        </div>
      )}
      {ex.fretboardDiagram && <FretboardView diagram={ex.fretboardDiagram} />}
      {ex.fretboardDiagrams && (
        <div style={{ display: 'grid', gridTemplateColumns: ex.fretboardDiagrams.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 12 }}>
          {ex.fretboardDiagrams.map((d, i) => <FretboardView key={i} diagram={d} />)}
        </div>
      )}
      {ex.tabNotation && <TabScore lines={ex.tabNotation.lines} tempo={ex.tabNotation.tempo} context={`${ex.name} ${ex.description}`} />}
      {ex.tips.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, background: T.yellowSoft, borderRadius: 10, border: `1px solid ${alpha(T.yellow, 0.15)}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono(10, 700), color: T.yellow, letterSpacing: 1 }}>
            <Icon name="lightbulb" size={11} color={T.yellow} fill={T.yellow} /> TIPS
          </div>
          {ex.tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: T.yellow }}>•</span>
              <span style={{ ...sys(12), color: T.text, lineHeight: 1.4 }}>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TheoryBanner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: T.blueSoft, borderRadius: 12, border: `1px solid ${alpha(T.blue, 0.2)}` }}>
      <Icon name="brain" size={20} color={T.blue} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ ...sys(14, 700), color: T.text }}>Theory Time</div>
        <div style={{ ...sys(11), color: T.textSecondary }}>Understand WHY you played what you just practiced</div>
      </div>
    </div>
  );
}

function LessonDetail({ lesson }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="book" size={16} color={T.blue} fill={T.blue} />
        <div style={{ ...sys(22, 800), color: T.text }}>{lesson.title}</div>
      </div>
      <div style={{ ...sys(13), color: T.textSecondary, lineHeight: 1.5 }}>{lesson.content}</div>
      {lesson.fretboardDiagram && <FretboardView diagram={lesson.fretboardDiagram} />}
      {lesson.keyPoints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...mono(10, 700), color: T.textMuted, letterSpacing: 1 }}>KEY CONCEPTS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {lesson.keyPoints.map((kp) => (
            <div key={kp.term} style={{ ...card, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ ...sys(13, 700), color: T.blue }}>{kp.term}</div>
              <div style={{ ...sys(12), color: T.textSecondary, lineHeight: 1.35 }}>{kp.definition}</div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckpointIntro({ onStart }) {
  const pill = (icon, label, color, soft) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...sys(11, 600), color, background: soft, padding: '5px 10px', borderRadius: 999 }}>
      <Icon name={icon} size={11} color={color} fill={icon === 'book' ? color : undefined} /> {label}
    </span>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
      <Icon name="seal" size={44} color={T.purple} />
      <div style={{ ...sys(20, 800), color: T.text }}>Checkpoint Quiz</div>
      <div style={{ ...sys(13), color: T.textSecondary, textAlign: 'center' }}>Test what you practiced and learned today.<br />About 3 minutes.</div>
      <div style={{ ...card, width: '100%', padding: 14, display: 'flex', flexDirection: 'column', gap: 6, boxSizing: 'border-box' }}>
        <div style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1 }}>TESTING</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pill('guitar', 'Practice', T.accent, T.accentSoft)}
          {pill('book', 'Theory', T.blue, T.blueSoft)}
          {pill('guitar', 'Fretboard', T.green, T.greenSoft)}
        </div>
      </div>
      <button className="fl-btn" onClick={onStart} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', background: T.accent, color: '#fff', borderRadius: 14, ...mono(15, 700) }}>
        <Icon name="play" size={14} color="#fff" /> Start Checkpoint
      </button>
    </div>
  );
}
