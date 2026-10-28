// Pick strokes and fretting-hand finger numbers for a parsed tab model.
// Strokes: 'd' (down, ⊓) / 'u' (up, V) on every picked event; legato targets (hammer-on / pull-off / slide
// destinations) aren't picked. Fingers: one finger per fret inside a 4-fret position, shifting only when a note
// falls outside it; open strings get none; bends use the ring finger (standard, with support fingers behind).

const STRING_LETTER = ['e', 'b', 'g', 'd', 'a', 'e'];

// Lesson text like "upstroke on D → downstroke on G" fixes the strokes at that string change.
export function strokeRuleFromText(lines) {
  const txt = (lines || []).join(' ');
  const m = txt.match(/\b(up|down)[- ]?stroke on ([A-Ga-g])\b[^→>]*?(?:→|->|then)\s*(up|down)[- ]?stroke on ([A-Ga-g])\b/i);
  if (!m) return null;
  return { from: m[2].toLowerCase(), fromStroke: m[1].toLowerCase()[0], to: m[4].toLowerCase(), toStroke: m[3].toLowerCase()[0] };
}

export function pickingStyle(text) {
  if (/\bsweep/i.test(text || '')) return 'sweep';
  if (/\beconomy/i.test(text || '')) return 'economy';
  return 'alternate';
}

export function annotateTechnique(model, { style = 'alternate', rule = null } = {}) {
  const events = model.events;
  const strokes = new Map(); // col → 'd' | 'u'
  const fingers = new Map(); // `${col}:${string}` → 1-4

  // ── Which events are picked ──
  const lastOn = new Map(); // string → previous note on that string
  const picked = events.map((e) => {
    let anyPicked = false;
    for (const n of e.notes) {
      const prev = lastOn.get(n.string);
      const legatoTarget = prev && (prev.leg || prev.slide) && prev.col < e.col;
      if (!legatoTarget) anyPicked = true;
    }
    e.notes.forEach((n) => lastOn.set(n.string, n));
    return anyPicked;
  });

  // ── Stroke directions ──
  const seq = []; // picked events in order
  events.forEach((e, i) => { if (picked[i] && e.notes.some((n) => n.fret != null || n.dead)) seq.push(e); });
  const low = (e) => Math.max(...e.notes.map((n) => n.string)); // lowest-pitched string in the event
  if (style === 'economy' || style === 'sweep') {
    let prev = null, dir = 'd';
    for (const e of seq) {
      if (e.notes.length > 1) dir = 'd';
      else if (prev) {
        const a = low(prev), b = low(e);
        if (b < a) dir = 'd';            // toward the floor (higher string): keep moving down
        else if (b > a) dir = 'u';       // toward the ceiling: up
        else dir = dir === 'd' ? 'u' : 'd';
      }
      strokes.set(e.col, dir);
      prev = e;
    }
  } else {
    // Strict alternate; a chord (2+ notes) is a downstroke and alternation carries on after it
    let dir = 'd';
    let offset = 0;
    if (rule) {
      // find the first from→to string change and choose the starting stroke so it matches the lesson's words
      const sIdx = (letter, ev) => ev.notes.some((n) => STRING_LETTER[n.string] === letter);
      for (let i = 0; i + 1 < seq.length; i++) {
        if (seq[i].notes.length === 1 && seq[i + 1].notes.length === 1 && sIdx(rule.from, seq[i]) && sIdx(rule.to, seq[i + 1])) {
          offset = (i % 2 === 0) === (rule.fromStroke === 'd') ? 0 : 1;
          break;
        }
      }
    }
    let k = offset;
    for (const e of seq) {
      if (e.notes.length > 1) { strokes.set(e.col, 'd'); k = 1; continue; }
      dir = k % 2 === 0 ? 'd' : 'u';
      strokes.set(e.col, dir);
      k++;
    }
  }

  // ── Fingering ──
  // fretted notes in playing order
  const flat = [];
  for (const e of events) for (const n of e.notes) if (n.fret != null && n.fret > 0 && !n.dead) flat.push({ e, n });
  let pos = null; // first fret covered by the index finger
  let i = 0;
  while (i < flat.length) {
    // longest run starting at i that fits in 4 frets
    let lo = flat[i].n.fret, hi = lo, j = i + 1;
    while (j < flat.length) {
      const f = flat[j].n.fret;
      if (Math.max(hi, f) - Math.min(lo, f) > 3) break;
      lo = Math.min(lo, f); hi = Math.max(hi, f); j++;
    }
    // keep the current hand position if the run fits; otherwise move as little as possible
    if (pos == null) pos = lo;
    else if (lo < pos || hi > pos + 3) pos = lo < pos ? lo : hi - 3;
    pos = Math.max(1, pos);
    for (let q = i; q < j; q++) {
      const { e, n } = flat[q];
      fingers.set(`${e.col}:${n.string}`, n.bend ? 3 : n.fret - pos + 1);
    }
    i = j;
  }
  // Two notes of one chord on the same finger at different strings above the index: give the higher string the next finger
  for (const e of events) {
    if (e.notes.length < 2) continue;
    const used = new Set();
    for (const n of [...e.notes].sort((a, b) => b.string - a.string)) {
      const key = `${e.col}:${n.string}`;
      let f = fingers.get(key);
      if (f == null) continue;
      if (f > 1) { while (used.has(f) && f < 4) f++; fingers.set(key, f); }
      used.add(f);
    }
  }
  return { strokes, fingers };
}
