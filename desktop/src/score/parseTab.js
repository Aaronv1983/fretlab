// Parses ASCII guitar tab (as written in the FRETLAB lessons / Woodshed) into a score model:
// { cols, events: [{ col, notes: [{ string, fret, dead, ghost, harm, leg, slide, bend, release, vib }] }], bars: [col] }
// string: 0 = high e … 5 = low E.

const SEQ = ['e', 'b', 'g', 'd', 'a', 'e'];
const LABEL = /^\s*([A-Ga-g])([#b]?)\s*\|(.*)$/;
const isDigit = (c) => c >= '0' && c <= '9';

// Split mixed lesson text into text segments and tab groups (keeps original order)
export function splitTabText(lines, { assumeTab = false } = {}) {
  const segs = [];
  let i = 0;
  let text = [];
  const flushText = () => { if (text.length) { segs.push({ type: 'text', lines: text }); text = []; } };
  while (i < lines.length) {
    const group = [];
    while (i + group.length < lines.length && LABEL.test(lines[i + group.length])) group.push(lines[i + group.length]);
    const single = group.length === 1 && /-/.test(group[0].match(LABEL)[3]) && /[0-9]/.test(group[0].match(LABEL)[3]);
    if (group.length >= 2 || single) {
      flushText();
      segs.push({ type: 'tab', model: parseGroup(labelGroup(group)) });
      i += group.length;
    } else {
      text.push(lines[i]);
      i += 1;
    }
  }
  flushText();

  // Woodshed chunks: 6 raw tab rows with the labels sliced off
  if (assumeTab && !segs.some((s) => s.type === 'tab') && lines.length >= 4 && lines.length <= 6) {
    const strings = lines.map((l, idx) => ({ string: idx, body: l.replace(/^\s*[A-Ga-g][#b]?\s*\|/, '') }));
    return [{ type: 'tab', model: parseGroup(strings) }];
  }
  // Drop blank-only text segments
  return segs.filter((s) => s.type === 'tab' || s.lines.some((l) => l.trim() !== ''));
}

// Side comments after a tab row ("← Start here", "(hold the G…)") are kept as annotations, not parsed as notes
function splitAnnotation(body) {
  const idx = body.search(/\s*←|\s{2,}\(|\s{2,}[A-Za-z]/);
  if (idx < 0) return { body, note: null };
  return { body: body.slice(0, idx), note: body.slice(idx).trim() };
}

function labelGroup(group) {
  const parsed = group.map((l) => {
    const m = l.match(LABEL);
    const { body, note } = splitAnnotation(m[3]);
    return { letter: m[1].toLowerCase(), upper: m[1] === m[1].toUpperCase(), body, note };
  });
  const n = parsed.length;
  let start = -1;
  if (n === 6) start = 0;
  else if (n === 1 && parsed[0].letter === 'e') start = parsed[0].upper ? 5 : 0;
  else {
    for (let k = 0; k + n <= 6; k++) {
      if (parsed.every((p, j) => p.letter === SEQ[k + j])) { start = k; break; }
    }
    if (start < 0) start = 0;
  }
  return parsed.map((p, j) => ({ string: Math.min(5, start + j), body: p.body, note: p.note }));
}

export function parseGroup(strings) {
  const N = Math.max(1, ...strings.map((s) => s.body.length));
  const notes = [];
  for (const { string, body } of strings) {
    const b = body.padEnd(N, '-');
    for (let i = 0; i < b.length; i++) {
      const c = b[i];
      const isX = (c === 'x' || c === 'X') && /^[-|( ]?$/.test(b[i - 1] || '') && /^[-|) ]?$/.test(b[i + 1] || '');
      if (!isDigit(c) && !isX) continue;
      let fret = null, len = 1;
      if (!isX) {
        if (isDigit(b[i + 1]) && parseInt(c + b[i + 1], 10) <= 24) { fret = parseInt(c + b[i + 1], 10); len = 2; }
        else fret = parseInt(c, 10);
      }
      const note = { string, fret, col: i, dead: isX, ghost: b[i - 1] === '(', harm: b[i - 1] === '<', leg: null, slide: null, bend: null, release: false, vib: false };
      let j = i + len;
      if (b[j] === ')' || b[j] === '>') j++;
      const m = b[j];
      if (m === 'h' || m === 'H') note.leg = 'H';
      else if (m === 'p' || m === 'P') note.leg = 'P';
      else if (m === '/' || m === '\\') note.slide = m;
      else if (m === '~') note.vib = true;
      else if (m === '*') note.harm = true;
      else if ((m === 'b' || m === 'B') && fret != null) {
        // Bend: "8b10", "8B(10)", optional release "r8", optional vibrato "~"
        j++;
        const paren = b[j] === '(';
        if (paren) j++;
        let t = '';
        while (isDigit(b[j]) && t.length < 2) { t += b[j]; j++; }
        if (paren && b[j] === ')') j++;
        note.bend = t ? Math.max(0, parseInt(t, 10) - fret) : true; // semitones, or true = amount not written
        if (b[j] === 'r' || b[j] === 'R') { note.release = true; j++; while (isDigit(b[j])) j++; }
        if (b[j] === '~') { note.vib = true; while (b[j] === '~') j++; }
        if (b[j] === 'h' || b[j] === 'H') note.leg = 'H';
        else if (b[j] === 'p' || b[j] === 'P') note.leg = 'P';
        notes.push(note);
        i = j - 1;
        continue;
      }
      // Legato written before the target note ("-P5"): attach to the previous note on this string
      const pre = b[i - 1];
      if ((pre === 'h' || pre === 'H' || pre === 'p' || pre === 'P')) {
        for (let k = notes.length - 1; k >= 0; k--) {
          if (notes[k].string === string) { if (!notes[k].leg) notes[k].leg = pre.toUpperCase(); break; }
        }
      }
      notes.push(note);
      i += len - 1;
    }
  }

  // Barlines: columns where most rows have '|'
  const bars = [];
  const need = Math.max(1, Math.ceil(strings.length * 0.6));
  for (let c = 0; c < N; c++) {
    let count = 0;
    for (const s of strings) if (s.body[c] === '|') count++;
    if (count >= need) bars.push(c);
  }

  const byCol = new Map();
  for (const n of notes) {
    if (!byCol.has(n.col)) byCol.set(n.col, []);
    byCol.get(n.col).push(n);
  }
  const events = [...byCol.entries()].sort((a, b) => a[0] - b[0]).map(([col, ns]) => ({ col, notes: ns.sort((a, b) => a.string - b.string) }));
  const annotations = strings.filter((s) => s.note).map((s) => ({ string: s.string, text: s.note }));
  return { cols: N, events, bars, annotations };
}

// Build a model directly from fretboard positions (e.g. a scale shape), ascending, no repeated pitches
export const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // e B G D A E (sounding)
export function modelFromPositions(positions) {
  const sorted = [...positions].sort((a, b) => b.string - a.string || a.fret - b.fret);
  const picked = [];
  let last = -Infinity;
  for (const p of sorted) {
    const pitch = OPEN_MIDI[p.string] + p.fret;
    if (pitch > last) { picked.push(p); last = pitch; }
  }
  const events = picked.map((p, i) => ({ col: i * 3 + 1, notes: [{ string: p.string, fret: p.fret, dead: false, ghost: false, harm: false, leg: null, slide: null, bend: null, release: false, vib: false }] }));
  const cols = picked.length * 3 + 1;
  return { cols, events, bars: [cols - 1], annotations: [] };
}
