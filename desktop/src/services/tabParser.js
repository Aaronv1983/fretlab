// Port of TabParserService.swift
import { uuid } from './storage.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OPEN_STRING_INDICES = [4, 11, 7, 2, 9, 4]; // E B G D A E

export function noteName(note) {
  return NOTE_NAMES[(OPEN_STRING_INDICES[note.string] + note.fret) % 12];
}

const isDigit = (c) => c >= '0' && c <= '9';

// ── Parse raw tab lines into notes ──
export function parseTab(lines) {
  let notes = [];
  if (lines.length < 6) return notes;
  const tabLines = lines.slice(0, 6);
  const maxLen = Math.max(0, ...tabLines.map((l) => l.length));
  const secondDigit = new Set(); // second digit of a two-digit fret already consumed

  for (let pos = 0; pos < maxLen; pos++) {
    tabLines.forEach((line, stringIdx) => {
      if (pos >= line.length) return;
      const ch = line[pos];
      if (!isDigit(ch)) return;
      if (secondDigit.has(`${stringIdx}-${pos}`)) return;
      let fretStr = ch;
      if (pos + 1 < line.length && isDigit(line[pos + 1])) {
        fretStr += line[pos + 1];
        secondDigit.add(`${stringIdx}-${pos + 1}`);
      }
      const fret = parseInt(fretStr, 10);
      notes.push({ string: stringIdx, fret, position: pos, technique: detectTechnique(line, pos) });
    });
  }

  // Remove duplicate positions
  const seen = new Set();
  notes = notes.filter((n) => {
    const key = `${n.string}-${n.position}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return notes;
}

// ── Detect technique markers ──
function detectTechnique(line, position) {
  const chars = Array.from(line);
  const prevChar = position > 0 ? chars[position - 1] : ' ';
  const nextEnd = Math.min(position + 3, chars.length);
  const nextChars = position + 1 < chars.length ? chars.slice(position + 1, nextEnd).join('') : '';

  if (nextChars.includes('b') || nextChars.includes('B')) return 'bend';
  if (prevChar === 'h' || nextChars.includes('h')) return 'hammerOn';
  if (prevChar === 'p' || nextChars.includes('p')) return 'pullOff';
  if (prevChar === '/' || prevChar === '\\' || nextChars.includes('/') || nextChars.includes('\\')) return 'slide';
  if (nextChars.includes('~')) return 'vibrato';
  if (prevChar === 't' || nextChars.includes('t')) return 'tap';
  if (nextChars.includes('*')) return 'harmonic';
  return null;
}

// ── Detect key (Krumhansl-Kessler) ──
export function detectKey(notes) {
  const freq = {};
  for (const n of notes) { const nm = noteName(n); freq[nm] = (freq[nm] || 0) + 1; }

  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  let bestKey = '', bestQuality = '', bestScore = -Infinity;
  const all = [];
  for (let rootIdx = 0; rootIdx < 12; rootIdx++) {
    const observed = new Array(12).fill(0);
    for (const [nm, count] of Object.entries(freq)) {
      const idx = NOTE_NAMES.indexOf(nm);
      if (idx >= 0) observed[(idx - rootIdx + 12) % 12] = count;
    }
    const maj = correlation(observed, majorProfile);
    all.push([NOTE_NAMES[rootIdx], 'major', maj]);
    if (maj > bestScore) { bestScore = maj; bestKey = NOTE_NAMES[rootIdx]; bestQuality = 'major'; }
    const min = correlation(observed, minorProfile);
    all.push([NOTE_NAMES[rootIdx], 'minor', min]);
    if (min > bestScore) { bestScore = min; bestKey = NOTE_NAMES[rootIdx]; bestQuality = 'minor'; }
  }
  all.sort((a, b) => b[2] - a[2]);
  const alternateKeys = all.slice(1, 4).map((x) => `${x[0]} ${x[1]}`);
  return {
    rootNote: bestKey,
    quality: bestQuality,
    confidence: Math.min(1, Math.max(0, (bestScore + 1) / 2)),
    alternateKeys,
    scaleNotes: buildScaleNotes(bestKey, bestQuality),
  };
}

export const keyDisplayName = (k) => `${k.rootNote} ${k.quality}`;

function correlation(a, b) {
  const n = a.length;
  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    num += da * db; denA += da * da; denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den > 0 ? num / den : 0;
}

function buildScaleNotes(root, quality) {
  const rootIdx = NOTE_NAMES.indexOf(root);
  if (rootIdx < 0) return [];
  const intervals = quality === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return intervals.map((i) => NOTE_NAMES[(rootIdx + i) % 12]);
}

// ── Detect scale type ──
export function detectScaleType(notes, key) {
  const unique = new Set(notes.map(noteName));
  const rootIdx = NOTE_NAMES.indexOf(key.rootNote);
  if (rootIdx < 0) return keyDisplayName(key);
  const setOf = (ints) => new Set(ints.map((i) => NOTE_NAMES[(rootIdx + i) % 12]));
  const isSubset = (s) => [...unique].every((x) => s.has(x));

  if (isSubset(setOf([0, 3, 5, 7, 10]))) return `${key.rootNote} Minor Pentatonic`;
  if (isSubset(setOf([0, 2, 4, 7, 9]))) return `${key.rootNote} Major Pentatonic`;
  if (isSubset(setOf([0, 3, 5, 6, 7, 10]))) return `${key.rootNote} Blues Scale`;
  if (isSubset(setOf([0, 2, 3, 5, 7, 9, 10])) && key.quality === 'minor') return `${key.rootNote} Dorian`;
  return `${key.rootNote} ${key.quality === 'minor' ? 'Natural Minor' : 'Major'}`;
}

// ── Auto-chunk tab into 2-bar phrases ──
export function autoChunk(notes, tabLines, barsPerChunk = 2) {
  if (!notes.length) return [];
  const maxPosition = Math.max(...notes.map((n) => n.position));
  const estimatedBeats = Math.max(4, Math.floor(maxPosition / 2));
  const beatsPerChunk = barsPerChunk * 4;
  const totalChunks = Math.max(1, Math.floor((estimatedBeats + beatsPerChunk - 1) / beatsPerChunk));
  const positionsPerChunk = Math.max(1, Math.floor((maxPosition + 1) / totalChunks));

  const chunks = [];
  for (let c = 0; c < totalChunks; c++) {
    const startPos = c * positionsPerChunk;
    const endPos = Math.min((c + 1) * positionsPerChunk, maxPosition + 1);
    const chunkNotes = notes.filter((n) => n.position >= startPos && n.position < endPos);
    const chunkTabLines = tabLines.slice(0, 6).map((line) => {
      if (startPos >= line.length) return '';
      return line.slice(Math.min(startPos, line.length), Math.min(endPos, line.length));
    });
    const techniques = [...new Set(chunkNotes.map((n) => n.technique).filter(Boolean))];
    chunks.push({
      id: uuid(),
      chunkNumber: c + 1,
      label: `Chunk ${c + 1}`,
      tabLines: chunkTabLines,
      notes: chunkNotes,
      techniques,
      startBeat: c * beatsPerChunk,
      endBeat: (c + 1) * beatsPerChunk,
      isMastered: false,
      currentTempoPct: 50,
      bestTempoPct: 50,
      practiceCount: 0,
      isFavorite: false,
    });
  }
  return chunks;
}

export function detectAllTechniques(notes) {
  return [...new Set(notes.map((n) => n.technique).filter(Boolean))].sort();
}
