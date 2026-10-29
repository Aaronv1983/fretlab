// Port of CheckpointViewV2.swift
import { useEffect, useRef, useState } from 'react';
import { T, mono, sys } from '../theme.js';
import { useStore, qualityFromResult } from '../store.jsx';
import { InteractiveFretboard } from '../components/Fretboard.jsx';
import { useGame } from '../game/GameProvider.jsx';
import { XP } from '../game/engine.js';
import Icon from '../components/Icon.jsx';

export default function Checkpoint({ go }) {
  const st = useStore();
  const g = useGame();
  const questions = st.currentRoutine?.checkpointQuestions || [];
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const startTime = useRef(Date.now());

  if (!questions.length) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: T.bg }}>
        <Icon name="checkCircle" size={48} color={T.textMuted} />
        <div style={{ ...sys(18, 700), color: T.text }}>No quiz available</div>
        <div style={{ ...sys(13), color: T.textSecondary, textAlign: 'center', padding: '0 40px' }}>Complete a practice session first, then come back for the checkpoint quiz.</div>
      </div>
    );
  }

  const record = (q, correct) => {
    const rt = (Date.now() - startTime.current) / 1000;
    st.recordReview(q.id, qualityFromResult(correct, rt));
    st.updateSkillScores(q.skillThreads, correct);
    g.bump('quizAnswers');
    if (correct) g.earn(XP.correct, 'Correct answer', { quiet: true });
    g.sound(correct ? 'correct' : 'wrong');
  };

  const onMC = (i, q) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    const correct = i === q.correctIndex;
    if (correct) setScore((s) => s + 1);
    record(q, correct);
  };

  const onFret = (correct, q) => {
    if (answered) return;
    setAnswered(true);
    if (correct) setScore((s) => s + 1);
    record(q, correct);
  };

  if (showResults) {
    return <Results st={st} g={g} questions={questions} score={score} go={go}
      onReset={() => { setCurrentQ(0); setSelected(null); setAnswered(false); setScore(0); setShowResults(false); }} />;
  }

  const q = questions[currentQ];
  const mcColor = (i) => (!answered ? T.text : i === q.correctIndex ? T.green : i === selected ? T.red : T.text);
  const mcBg = (i) => (!answered ? T.card : i === q.correctIndex ? T.greenSoft : i === selected ? T.redSoft : T.card);
  const mcBorder = (i) => (!answered ? T.border : i === q.correctIndex ? 'rgba(52,211,153,0.5)' : i === selected ? 'rgba(248,113,113,0.4)' : T.border);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '24px 20px 16px' }}>
        <button className="fl-link" onClick={() => go('practice')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textSecondary, ...sys(13) }}>
          <Icon name="chevronLeft" size={12} /> Back
        </button>
        <div style={{ flex: 1, textAlign: 'center', ...mono(12, 700), color: T.accent }}>CHECKPOINT</div>
        <div style={{ ...mono(12), color: T.textMuted }}>{currentQ + 1}/{questions.length}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingBottom: 16 }}>
        {questions.map((_, i) => (
          <div key={i} style={{ height: 7, borderRadius: 4, width: i === currentQ ? 20 : 8, background: i < currentQ ? T.green : i === currentQ ? T.accent : 'rgba(255,255,255,0.06)', transition: 'all .3s ease-in-out' }} />
        ))}
      </div>
      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {q.type === 'fretboardTap' && q.targetNote != null && q.targetString != null && q.targetFret != null ? (
            <div style={{ padding: '0 16px' }}>
              <InteractiveFretboard key={q.id} targetString={q.targetString} targetFret={q.targetFret} targetNote={q.targetNote} onAnswer={(c) => onFret(c, q)} />
            </div>
          ) : q.type === 'multipleChoice' && q.options ? (
            <>
              <div style={{ ...sys(24, 800), color: T.text, textAlign: 'center', padding: '16px 20px 8px', lineHeight: 1.3 }}>{q.question}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px' }}>
                {q.options.map((opt, i) => (
                  <button key={i} disabled={answered} onClick={() => onMC(i, q)} className={answered ? '' : 'fl-press'}
                    style={{ display: 'flex', alignItems: 'center', padding: '20px 22px', background: mcBg(i), borderRadius: 12, border: `1px solid ${mcBorder(i)}`, cursor: answered ? 'default' : 'pointer', textAlign: 'left' }}>
                    <span style={{ ...mono(12), color: T.textMuted, paddingRight: 14 }}>{String.fromCharCode(65 + i)}</span>
                    <span style={{ ...sys(17, 600), color: mcColor(i) }}>{opt}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {answered && (
            <div style={{ padding: '0 20px' }}>
              <button className="fl-btn" onClick={() => {
                if (currentQ < questions.length - 1) { setCurrentQ(currentQ + 1); setSelected(null); setAnswered(false); startTime.current = Date.now(); }
                else setShowResults(true);
              }} style={{ width: '100%', ...mono(15, 700), color: '#fff', background: T.accent, padding: '16px 0', borderRadius: 12 }}>
                {currentQ < questions.length - 1 ? 'Next Question →' : 'See Results'}
              </button>
            </div>
          )}
          <div style={{ height: 100 }} />
        </div>
      </div>
    </div>
  );
}

function Results({ st, g, questions, score, go, onReset }) {
  const pct = Math.trunc((score / questions.length) * 100);
  const passed = pct >= 75;
  const schedule = st.reviewSchedule().slice(0, 5);
  const routineId = st.currentRoutine?.id;
  const isLast = routineId === 'a-w10';
  // A week is 7 practice days; only the Day 7 checkpoint can master it and move you on
  const day = Math.min((st.progressFor(routineId)?.completedDays || 0) + 1, 7);
  const finalDay = day >= 7;
  const weekPassed = passed && finalDay;

  // Real XP for this checkpoint (awarded once when the results appear)
  const [gains, setGains] = useState([]);
  const awarded = useRef(false);
  useEffect(() => {
    if (awarded.current) return;
    awarded.current = true;
    const list = [];
    if (score > 0) list.push([`${score} correct × ${XP.correct}`, score * XP.correct]); // already earned per answer
    list.push(['Checkpoint complete', g.earn(XP.checkpoint, 'Checkpoint complete')]);
    g.bump('checkpoints');
    if (pct === 100) { list.push(['Perfect score', g.earn(XP.perfect, 'Perfect score!')]); g.bump('perfect'); }
    if (weekPassed && routineId && !st.isRoutineMastered(routineId)) {
      const x = g.earn(XP.mastered, `Week ${st.currentRoutine.weekNumber} mastered`, { once: `master:${routineId}` });
      if (x) list.push(['Week mastered', x]);
    }
    setGains(list.filter(([, x]) => x > 0));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const total = gains.reduce((sum, [, x]) => sum + x, 0);
  const message = !finalDay
    ? (pct === 100 ? `Flawless! Day ${day} of 7 complete — come back tomorrow for Day ${day + 1}.`
      : passed ? `Day ${day} of 7 complete. Come back tomorrow for Day ${day + 1}.`
      : `Day ${day} of 7 complete. Review the theory block before tomorrow — you need 75% on Day 7 to unlock next week.`)
    : pct === 100 ? 'Flawless! You nailed every question — that unlocks next week.'
    : passed ? (isLast ? 'You passed the final checkpoint of the whole curriculum. Incredible work.' : 'Great job — that unlocks next week.')
    : pct >= 50 ? 'So close! You need 75% to unlock next week. Review the theory block and try again.'
    : 'Every rep counts. Revisit the lesson and give it another go — you\'ve got this.';

  const done = () => {
    if (routineId) {
      const s = score / Math.max(1, questions.length);
      st.completePracticeDay(routineId, s);
      if (finalDay && st.completeRoutineMastery(routineId, s) && !isLast) st.advanceToNextRoutine();
    }
    onReset();
    go('home');
  };

  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto', background: T.bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, paddingTop: 56, maxWidth: 640, margin: '0 auto' }}>
        <Icon name={passed ? 'trophy' : 'rotate'} size={64} color={passed ? T.yellow : T.accent} strokeWidth={passed ? 2 : 2.4} />
        <div style={{ ...sys(24, 800), color: T.text }}>{passed ? 'Checkpoint Passed!' : 'Keep Practicing!'}</div>
        <div style={{ ...mono(56, 800), color: passed ? T.green : T.yellow }}>{pct}%</div>
        <div style={{ ...sys(14), color: T.textSecondary }}>{score}/{questions.length} correct</div>
        <div style={{ ...sys(15), color: T.text, textAlign: 'center', padding: '0 30px' }}>{message}</div>
        <div style={{ ...mono(26, 800), color: T.yellow }}>+{total} XP ⚡</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '0 16px' }}>
          {gains.map(([label, x]) => (
            <span key={label} style={{ ...mono(11, 600), color: T.yellow, background: T.yellowSoft, padding: '5px 10px', borderRadius: 999 }}>{label} +{x} XP</span>
          ))}
        </div>
        {weekPassed && !isLast && (
          <div style={{ ...sys(12), color: T.textSecondary, textAlign: 'center', padding: '0 30px' }}>Next week unlocked — it becomes your session when you tap Done.</div>
        )}
        <div style={{ alignSelf: 'stretch', margin: '0 20px', padding: 14, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...mono(10, 700), color: T.textMuted, letterSpacing: 1 }}>REVIEW QUEUE UPDATED</div>
          {schedule.map((item) => (
            <div key={item.questionId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: item.daysUntilReview === 0 ? T.red : item.daysUntilReview <= 2 ? T.yellow : T.green }} />
              <span style={{ ...mono(11), color: T.textSecondary }}>{item.questionId.slice(-4)}</span>
              <span style={{ flex: 1 }} />
              <span style={{ ...mono(11), color: T.text }}>{item.daysUntilReview === 0 ? 'due now' : `in ${item.daysUntilReview} days`}</span>
            </div>
          ))}
        </div>
        <button className="fl-btn" onClick={done} style={{ ...mono(15, 700), color: '#fff', background: T.accent, padding: '14px 40px', borderRadius: 14 }}>Done for Today</button>
        <div style={{ height: 48 }} />
      </div>
    </div>
  );
}
