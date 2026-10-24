// Ports of CurriculumManager, ProgressManager, SpacedRepetitionEngine, SoloWoodshedManager, ScaleLibraryManager
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import COURSES from './data/curriculum.json';
import BUILT_IN_SCALES from './data/scales.json';
import { KEYS, load, save, startOfDay, daysBetween, addDays, uuid } from './services/storage.js';
import * as parser from './services/tabParser.js';
import { SKILL_NAME, SKILL_THREADS } from './theme.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export const ALL_ROUTINES = COURSES.flatMap((c) => c.routines);
export const routineById = (id) => ALL_ROUTINES.find((r) => r.id === id) || null;
export const routineMinutes = (r) => (r ? r.sessionBlocks.reduce((s, b) => s + b.estimatedMinutes, 0) : 25);

// ── SM-2 card update (SM2Card.update) ──
function sm2Update(card, quality) {
  let { repetitions, easeFactor, interval } = card;
  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.trunc(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }
  const q = quality;
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const now = Date.now();
  return { ...card, repetitions, easeFactor, interval, lastReviewDate: now, nextReviewDate: addDays(now, interval) };
}
const newCard = (questionId) => ({
  id: uuid(), questionId, repetitions: 0, easeFactor: 2.5, interval: 0, nextReviewDate: Date.now(), lastReviewDate: null,
});

// SpacedRepetitionEngine.qualityFromResult
export function qualityFromResult(correct, responseTime) {
  if (!correct) return 1;
  if (responseTime < 3) return 5;
  if (responseTime < 7) return 4;
  return 3;
}

function initialStreak() {
  // ProgressManager.updateStreak on launch
  const last = load(KEYS.lastDate, null);
  const streak = load(KEYS.streak, 0);
  if (last == null) return 0;
  return daysBetween(last, Date.now()) > 1 ? 0 : streak;
}

export function StoreProvider({ children }) {
  // ── Curriculum ──
  const [currentRoutineId, setCurrentRoutineId] = useState(() => {
    const id = load(KEYS.currentRoutine, null);
    return routineById(id) ? id : COURSES[0].routines[0].id;
  });

  // ── Progress ──
  const [routineProgress, setRoutineProgress] = useState(() => load(KEYS.progress, {}));
  const [skills, setSkills] = useState(() => {
    const saved = load(KEYS.skills, {});
    const out = {};
    for (const t of SKILL_THREADS) out[t] = saved[t] || { thread: t, score: 0, totalQuestions: 0, correctAnswers: 0 };
    return out;
  });
  const [stats, setStats] = useState(() => ({
    streak: initialStreak(),
    totalPracticeMinutes: load(KEYS.minutes, 0),
    lastPracticeDate: load(KEYS.lastDate, null),
  }));
  const { streak, totalPracticeMinutes, lastPracticeDate } = stats;

  // ── SM-2 ──
  const [cards, setCards] = useState(() => load(KEYS.sm2, []));

  // ── Woodshed ──
  const [projects, setProjects] = useState(() => load(KEYS.projects, []));
  const [lickLibrary, setLickLibrary] = useState(() => load(KEYS.licks, []));

  // ── Scale library ──
  const [customScales, setCustomScales] = useState(() => load(KEYS.customScales, []));
  const [favoriteScaleIds, setFavoriteScaleIds] = useState(() => load(KEYS.favScales, []));

  // Persistence
  useEffect(() => save(KEYS.currentRoutine, currentRoutineId), [currentRoutineId]);
  useEffect(() => save(KEYS.progress, routineProgress), [routineProgress]);
  useEffect(() => save(KEYS.skills, skills), [skills]);
  useEffect(() => save(KEYS.streak, streak), [streak]);
  useEffect(() => save(KEYS.minutes, totalPracticeMinutes), [totalPracticeMinutes]);
  useEffect(() => save(KEYS.lastDate, lastPracticeDate), [lastPracticeDate]);
  useEffect(() => save(KEYS.sm2, cards), [cards]);
  useEffect(() => save(KEYS.projects, projects), [projects]);
  useEffect(() => save(KEYS.licks, lickLibrary), [lickLibrary]);
  useEffect(() => save(KEYS.customScales, customScales), [customScales]);
  useEffect(() => save(KEYS.favScales, favoriteScaleIds), [favoriteScaleIds]);

  // ── Progress API ──
  const progressFor = useCallback((routineId) => routineProgress[routineId] || {
    routineId, completedDays: 0, totalDays: 7, bestCheckpointScore: 0, lastPracticeDate: null,
    isUnlocked: routineId === 'f-w1', isMastered: false,
  }, [routineProgress]);

  const isRoutineUnlocked = useCallback((id) => id === 'f-w1' || progressFor(id).isUnlocked, [progressFor]);
  const isRoutineMastered = useCallback((id) => progressFor(id).isMastered, [progressFor]);

  // ProgressManager.recordPractice
  const recordPractice = useCallback((minutes) => {
    setStats((st) => {
      const today = startOfDay(Date.now());
      let s = st.streak;
      if (st.lastPracticeDate != null) {
        if (startOfDay(st.lastPracticeDate) !== today) s += 1;
      } else s = 1;
      return { streak: s, lastPracticeDate: Date.now(), totalPracticeMinutes: st.totalPracticeMinutes + minutes };
    });
  }, []);

  const nextRoutineId = (routineId) => {
    // ProgressManager.unlockNextRoutine id logic
    const [prefix, w] = routineId.split('-');
    const week = parseInt(w.replace('w', ''), 10);
    if (week < 10) return `${prefix}-w${week + 1}`;
    if (prefix === 'f') return 'i-w1';
    if (prefix === 'i') return 'a-w1';
    return null;
  };

  const completePracticeDay = useCallback((routineId, checkpointScore) => {
    setRoutineProgress((rp) => {
      const base = rp[routineId] || {
        routineId, completedDays: 0, totalDays: 7, bestCheckpointScore: 0, lastPracticeDate: null,
        isUnlocked: routineId === 'f-w1', isMastered: false,
      };
      return {
        ...rp,
        [routineId]: { ...base, completedDays: base.completedDays + 1, lastPracticeDate: Date.now(), bestCheckpointScore: Math.max(base.bestCheckpointScore, checkpointScore) },
      };
    });
    recordPractice(25);
  }, [recordPractice]);

  // completeRoutineMastery: passing score ≥ 75% masters the routine and unlocks the next one
  const completeRoutineMastery = useCallback((routineId, score) => {
    const passed = score >= 0.75;
    if (passed) {
      const nextId = nextRoutineId(routineId);
      setRoutineProgress((rp) => {
        const out = { ...rp };
        const mk = (id) => out[id] || { routineId: id, completedDays: 0, totalDays: 7, bestCheckpointScore: 0, lastPracticeDate: null, isUnlocked: id === 'f-w1', isMastered: false };
        out[routineId] = { ...mk(routineId), isMastered: true };
        if (nextId) out[nextId] = { ...mk(nextId), isUnlocked: true };
        return out;
      });
    }
    return passed;
  }, []);

  const updateSkillScores = useCallback((threads, correct) => {
    setSkills((sk) => {
      const out = { ...sk };
      for (const t of threads) {
        const p = { ...(out[t] || { thread: t, score: 0, totalQuestions: 0, correctAnswers: 0 }) };
        p.totalQuestions += 1;
        if (correct) p.correctAnswers += 1;
        p.score = p.totalQuestions > 0 ? (p.correctAnswers / p.totalQuestions) * 100 : 0;
        out[t] = p;
      }
      return out;
    });
  }, []);

  const skillRadarData = useMemo(() => {
    const display = ['rhythm', 'picking', 'chordVocabulary', 'cagedScales', 'keyScaleTheory', 'earTraining'];
    const d = {};
    for (const t of display) d[SKILL_NAME[t]] = skills[t]?.score || 0;
    return d;
  }, [skills]);

  // ── Curriculum API ──
  const advanceToNextRoutine = useCallback(() => {
    setCurrentRoutineId((cur) => {
      const idx = ALL_ROUTINES.findIndex((r) => r.id === cur);
      return idx >= 0 && idx + 1 < ALL_ROUTINES.length ? ALL_ROUTINES[idx + 1].id : cur;
    });
  }, []);

  // ── SM-2 API ──
  const recordReview = useCallback((questionId, quality) => {
    setCards((cs) => {
      const i = cs.findIndex((c) => c.questionId === questionId);
      if (i < 0) return [...cs, sm2Update(newCard(questionId), quality)];
      const out = cs.slice();
      out[i] = sm2Update(out[i], quality);
      return out;
    });
  }, []);

  const reviewQueue = useMemo(() => {
    const today = startOfDay(Date.now());
    return cards.filter((c) => startOfDay(c.nextReviewDate) <= today).sort((a, b) => a.easeFactor - b.easeFactor);
  }, [cards]);

  const reviewSchedule = useCallback(() => {
    const now = Date.now();
    return cards
      .map((c) => ({ questionId: c.questionId, daysUntilReview: Math.max(0, daysBetween(now, c.nextReviewDate)), easeFactor: c.easeFactor }))
      .sort((a, b) => a.daysUntilReview - b.daysUntilReview);
  }, [cards]);

  // ── Woodshed API ──
  const createProject = useCallback(({ title, artist, tabLines, targetBPM = 120 }) => {
    const notes = parser.parseTab(tabLines);
    const detectedKey = parser.detectKey(notes);
    const techniques = parser.detectAllTechniques(notes);
    const maxFret = notes.length ? Math.max(...notes.map((n) => n.fret)) : 0;
    let difficulty = 'beginner';
    if (techniques.includes('sweep') || techniques.includes('tap') || maxFret > 17) difficulty = 'expert';
    else if (techniques.length >= 4 || notes.length > 60) difficulty = 'advanced';
    else if (techniques.length >= 2 || notes.length > 30) difficulty = 'intermediate';

    const project = {
      id: uuid(), title, artist, rawTabLines: tabLines,
      chunks: parser.autoChunk(notes, tabLines),
      detectedKey, detectedScale: parser.detectScaleType(notes, detectedKey),
      genre: null, difficulty, dateAdded: Date.now(), lastPracticed: null, overallMastery: 0, targetBPM,
    };
    setProjects((ps) => [...ps, project]);
    return project;
  }, []);

  const updateChunk = (projectId, chunkId, fn) => setProjects((ps) => ps.map((p) => {
    if (p.id !== projectId) return p;
    const chunks = p.chunks.map((c) => (c.id === chunkId ? fn(c) : c));
    return { ...p, chunks };
  }));

  const markChunkMastered = useCallback((chunkId, projectId) => {
    setProjects((ps) => ps.map((p) => {
      if (p.id !== projectId) return p;
      const chunks = p.chunks.map((c) => (c.id === chunkId ? { ...c, isMastered: true, bestTempoPct: 100 } : c));
      const mastered = chunks.filter((c) => c.isMastered).length;
      return { ...p, chunks, overallMastery: chunks.length ? mastered / chunks.length : 0 };
    }));
  }, []);

  const updateChunkTempo = useCallback((chunkId, projectId, tempoPct) => {
    setProjects((ps) => ps.map((p) => {
      if (p.id !== projectId) return p;
      const chunks = p.chunks.map((c) => (c.id === chunkId ? {
        ...c, currentTempoPct: tempoPct, bestTempoPct: Math.max(c.bestTempoPct, tempoPct), practiceCount: c.practiceCount + 1,
      } : c));
      return { ...p, chunks, lastPracticed: Date.now() };
    }));
  }, []);

  const saveToLickLibrary = useCallback((chunk, project) => {
    setLickLibrary((ll) => {
      if (ll.some((l) => l.chunkId === chunk.id)) return ll;
      return [...ll, {
        id: uuid(), soloProjectId: project.id, chunkId: chunk.id, title: `${project.title} - ${chunk.label}`,
        key: project.detectedKey ? parser.keyDisplayName(project.detectedKey) : 'Unknown',
        techniques: chunk.techniques, difficulty: project.difficulty, tabLines: chunk.tabLines,
        dateAdded: Date.now(), lastReviewed: null, sm2CardId: null, tags: [],
      }];
    });
    updateChunk(project.id, chunk.id, (c) => ({ ...c, isFavorite: true }));
  }, []);

  const deleteProject = useCallback((projectId) => {
    setProjects((ps) => ps.filter((p) => p.id !== projectId));
    setLickLibrary((ll) => ll.filter((l) => l.soloProjectId !== projectId));
  }, []);

  // ── Scale library API ──
  const allScales = useMemo(() => [...BUILT_IN_SCALES, ...customScales], [customScales]);
  const addCustomScale = useCallback(({ name, intervals, degreeNames, genre, mood, fretPattern }) => {
    setCustomScales((cs) => [...cs, {
      id: uuid(), name, category: 'custom', intervals, degreeNames, description: 'Custom scale', genre, mood, isCustom: true, fretPattern,
    }]);
  }, []);
  const toggleFavorite = useCallback((id) => setFavoriteScaleIds((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])), []);

  const currentRoutine = routineById(currentRoutineId);
  const currentDayInRoutine = Math.min(progressFor(currentRoutineId).completedDays + 1, 7);

  const value = {
    courses: COURSES, currentRoutine, currentDayInRoutine, setCurrentRoutineId, advanceToNextRoutine,
    progressFor, isRoutineUnlocked, isRoutineMastered, completePracticeDay, completeRoutineMastery,
    updateSkillScores, skillRadarData, streak, totalPracticeMinutes,
    cards, dueCount: reviewQueue.length, recordReview, reviewSchedule,
    projects, lickLibrary, createProject, markChunkMastered, updateChunkTempo, saveToLickLibrary, deleteProject,
    allScales, customScales, favoriteScaleIds, addCustomScale, toggleFavorite,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
