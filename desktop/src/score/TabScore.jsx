// Guitar Pro–style score: standard notation staff over a TAB staff on a light "paper" page.
// Pitches come from string + fret (standard tuning, guitar written an octave above sounding).
// The lesson tabs carry no rhythm, so notation shows noteheads without stems.
import { useMemo } from 'react';
import { useStore } from '../store.jsx';
import { useWidth } from '../components/Fretboard.jsx';
import { GLYPHS } from './glyphs.js';
import { splitTabText, OPEN_MIDI } from './parseTab.js';
import { annotateTechnique, pickingStyle, strokeRuleFromText } from './technique.js';

export const PAPER = {
  bg: '#F7F7F5', ink: '#151515', line: '#3F3F3F', tabLine: '#7A7A7A', soft: '#6B6B6B', red: '#D0302A', shadow: '0 1px 0 rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.28)',
};
export const SERIF = "'Times New Roman', Times, Georgia, serif";
const NUMFONT = "Arial, 'Segoe UI', Helvetica, sans-serif";
const MONO = "Consolas, 'Cascadia Mono', ui-monospace, monospace";
const STRING_LABEL = ['e', 'B', 'G', 'D', 'A', 'E'];

const LETTER_SHARP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const ALTER_SHARP = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const LETTER_FLAT = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
const ALTER_FLAT = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];
function spell(midi, flats) {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  const L = flats ? LETTER_FLAT : LETTER_SHARP;
  const A = flats ? ALTER_FLAT : ALTER_SHARP;
  return { step: oct * 7 + L[pc], alter: A[pc], key: `${L[pc]}_${oct}` };
}

// Spell with flats only when the notes fit a flat key and no sharp/natural key (as an engraver would):
// F minor (F A♭ C) → flats; F major, A minor pentatonic, chromatic runs → sharps/naturals.
const KEYS = [
  [0, 0], [7, 1], [2, 2], [9, 3], [4, 4], [11, 5], [6, 6], // C G D A E B F#  (sharps)
  [5, -1], [10, -2], [3, -3], [8, -4], [1, -5],           // F Bb Eb Ab Db    (flats)
];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export function prefersFlats(model) {
  const pcs = [...new Set(model.events.flatMap((e) => e.notes.filter((n) => n.fret != null).map((n) => (OPEN_MIDI[n.string] + n.fret) % 12)))];
  if (!pcs.length) return false;
  const fits = (tonic) => { const sc = new Set(MAJOR.map((i) => (tonic + i) % 12)); return pcs.every((p) => sc.has(p)); };
  const flatFit = KEYS.some(([t, acc]) => acc < 0 && fits(t));
  const sharpFit = KEYS.some(([t, acc]) => acc >= 0 && fits(t));
  return flatFit && !sharpFit;
}

const writtenMidi = (n) => OPEN_MIDI[n.string] + n.fret + 12;

function Glyph({ name, x, y, s, fill = PAPER.ink }) {
  const g = GLYPHS[name];
  return <path d={g.d} transform={`translate(${x} ${y}) scale(${s / 250})`} fill={fill} />;
}
const glyphW = (name, s) => (GLYPHS[name].xMax - GLYPHS[name].xMin) * (s / 250);

// Guitar Pro–style spacing: every note/chord gets an even slot (ASCII column offsets are ignored),
// barlines get a narrower slot, and full lines are justified to the page width.
const BAR_W = 16, LEAD = 14, TAIL = 10;
function layoutSystems(model, avail, EV_W = 26) {
  const items = [
    ...model.bars.map((col) => ({ kind: 'bar', col })),
    ...model.events.map((e) => ({ kind: 'ev', col: e.col, e })),
  ].sort((a, b) => a.col - b.col || (a.kind === 'bar' ? -1 : 1));
  const w = (it) => (it.kind === 'bar' ? BAR_W : EV_W);

  const groups = [];
  let cur = [], width = LEAD + TAIL;
  for (const it of items) {
    if (cur.some((x) => x.kind === 'ev') && width + w(it) > avail && !(it.kind === 'bar' && it.col === model.cols - 1)) {
      // prefer to break right after a barline in the last 40% of the line
      let cut = -1;
      for (let i = cur.length - 1; i >= 0; i--) {
        if (cur[i].kind === 'bar') { if (i >= cur.length * 0.6) cut = i + 1; break; }
      }
      if (cut > 0 && cut < cur.length) { groups.push(cur.slice(0, cut)); cur = cur.slice(cut); }
      else { groups.push(cur); cur = []; }
      width = LEAD + TAIL + cur.reduce((sum, x) => sum + w(x), 0);
    }
    cur.push(it);
    width += w(it);
  }
  if (cur.length) groups.push(cur);
  // Avoid a short orphan last line: rebalance the last two lines by width
  if (groups.length > 1) {
    const last = groups[groups.length - 1];
    const evs = last.filter((x) => x.kind === 'ev').length;
    if (evs < 4) {
      const all = groups[groups.length - 2].concat(last);
      const total = all.reduce((sum, x) => sum + w(x), 0);
      let acc = 0, cut = 0;
      while (cut < all.length && acc + w(all[cut]) <= total / 2) { acc += w(all[cut]); cut++; }
      groups.splice(groups.length - 2, 2, all.slice(0, cut), all.slice(cut));
    }
  }
  // a line never starts with a barline
  for (const g of groups) while (g.length > 1 && g[0].kind === 'bar') g.shift();
  if (!groups.length) groups.push([]);

  const out = [];
  let prevStretch = 1;
  groups.forEach((g, gi) => {
    const nat = LEAD + TAIL + g.reduce((sum, x) => sum + w(x), 0);
    const isLast = gi === groups.length - 1;
    let stretch;
    if (groups.length === 1) stretch = Math.min(2.2, avail / nat);
    else if (!isLast) stretch = avail / nat;
    else stretch = Math.min(prevStretch, avail / nat);
    stretch = Math.max(0.6, stretch);
    prevStretch = stretch;

    let cursor = LEAD * stretch;
    const evX = new Map();
    const bars = [];
    g.forEach((it) => {
      const cw = w(it) * stretch;
      const cx = cursor + cw / 2;
      if (it.kind === 'ev') evX.set(it.col, cx); else bars.push({ col: it.col, x: cx });
      cursor += cw;
    });
    const lastIsBar = g.length && g[g.length - 1].kind === 'bar';
    const endX = lastIsBar ? bars[bars.length - 1].x : cursor + TAIL * stretch * 0.6;
    const innerBars = lastIsBar ? bars.slice(0, -1) : bars;
    out.push({ evX, innerBars, endX, cols: new Set(g.filter((x) => x.kind === 'ev').map((x) => x.col)) });
  });
  return out;
}

function bendLabel(b) {
  if (b === true) return '';
  return { 1: '½', 2: 'full', 3: '1½', 4: '2' }[b] ?? `${b / 2}`;
}

function System({ model, sys, showNotation, isFinal, measureStart, showMeasureNumbers, tech }) {
  const s = 8;          // staff space
  const t = 13;         // tab line gap
  const L = 2;
  const x0 = L + 34;
  const X = (col) => x0 + sys.evX.get(col);
  const inSys = (col) => sys.evX.has(col);
  const events = model.events.filter((e) => inSys(e.col));
  const innerBars = sys.innerBars.map((b) => b.col);
  const barX = new Map(sys.innerBars.map((b) => [b.col, x0 + b.x]));
  const endX = x0 + sys.endX;
  const start = events[0]?.col ?? 0;

  const flats = sys.flats;
  const pitched = events.flatMap((e) => e.notes.filter((n) => !n.dead && n.fret != null).map((n) => spell(writtenMidi(n), flats).step));
  const maxStep = pitched.length ? Math.max(...pitched) : 34;
  const minStep = pitched.length ? Math.min(...pitched) : 34;
  const hasBend = events.some((e) => e.notes.some((n) => n.bend));
  const hasArc = events.some((e) => e.notes.some((n) => n.leg || n.vib));
  const hasBendVib = events.some((e) => e.notes.some((n) => n.bend && n.vib));

  const strokesHere = tech?.strokes && events.some((e) => tech.strokes.has(e.col));
  const strokeBase = 16;            // baseline of the pick-stroke row (glyphs sit above it)
  const y0 = strokesHere ? strokeBase + 10 : 14;
  let staffTop = 0, staffBot = 0, cursor = y0;
  if (showNotation) {
    staffTop = y0 + Math.max(s * 1.2, Math.max(0, maxStep - 38) * (s / 2) + s * 0.6);
    staffBot = staffTop + 4 * s;
    cursor = staffBot + Math.max(s * 1.4, Math.max(0, 30 - minStep) * (s / 2) + s * 0.8) + 8;
  }
  const tabTop = cursor + (hasBendVib ? 40 : hasBend ? 30 : hasArc ? 18 : 6);
  const tabBot = tabTop + 5 * t;
  const H = tabBot + 12;
  const tabY = (string) => tabTop + string * t;
  const staffY = (step) => staffBot - (step - 30) * (s / 2);

  const els = [];
  const k = (key) => `${start}-${key}`;

  // ── Notation staff ──
  if (showNotation) {
    for (let i = 0; i < 5; i++) els.push(<line key={k(`sl${i}`)} x1={L} x2={endX} y1={staffTop + i * s} y2={staffTop + i * s} stroke={PAPER.line} strokeWidth={0.9} />);
    els.push(<line key={k('sL')} x1={L} x2={L} y1={staffTop} y2={staffBot} stroke={PAPER.line} strokeWidth={1} />);
    els.push(<Glyph key={k('clef')} name="gClef" x={L + 6} y={staffBot - s} s={s} />);

    // Noteheads, accidentals, ledger lines (accidentals last for the measure, reset at barlines)
    let acc = new Map();
    const timeline = [...events.map((e) => ({ col: e.col, e })), ...innerBars.map((b) => ({ col: b, bar: true }))].sort((a, b) => a.col - b.col || (a.bar ? -1 : 1));
    const nw = glyphW('noteheadBlack', s);
    for (const item of timeline) {
      if (item.bar) { acc = new Map(); continue; }
      const x = X(item.col);
      const spelled = item.e.notes.filter((n) => !n.dead && n.fret != null).map((n) => ({ n, ...spell(writtenMidi(n), flats) })).sort((a, b) => a.step - b.step);
      // seconds: shift the upper note right
      let prev = null;
      let accIdx = 0;
      for (const sp of spelled) {
        const dx = prev && sp.step - prev.step === 1 && !prev.shifted ? nw : 0;
        sp.shifted = dx !== 0;
        prev = sp;
        const nx = x - nw / 2 + dx;
        const ny = staffY(sp.step);
        // ledger lines
        for (let st = 40; st <= sp.step; st += 2) els.push(<line key={k(`la${item.col}-${sp.step}-${st}`)} x1={nx - 3.5} x2={nx + nw + 3.5} y1={staffY(st)} y2={staffY(st)} stroke={PAPER.line} strokeWidth={0.9} />);
        for (let st = 28; st >= sp.step; st -= 2) els.push(<line key={k(`lb${item.col}-${sp.step}-${st}`)} x1={nx - 3.5} x2={nx + nw + 3.5} y1={staffY(st)} y2={staffY(st)} stroke={PAPER.line} strokeWidth={0.9} />);
        els.push(<Glyph key={k(`nh${item.col}-${sp.step}`)} name="noteheadBlack" x={nx} y={ny} s={s} />);
        const current = acc.get(sp.key) ?? 0;
        if (sp.alter !== current) {
          const name = sp.alter === 1 ? 'accidentalSharp' : sp.alter === -1 ? 'accidentalFlat' : 'accidentalNatural';
          const aw = glyphW(name, s);
          els.push(<Glyph key={k(`ac${item.col}-${sp.step}`)} name={name} x={x - nw / 2 - aw - 2.5 - accIdx * (aw + 1.5)} y={ny} s={s} />);
          acc.set(sp.key, sp.alter);
          accIdx++;
        }
      }
    }
  }

  // ── TAB staff ──
  for (let i = 0; i < 6; i++) els.push(<line key={k(`tl${i}`)} x1={L} x2={endX} y1={tabY(i)} y2={tabY(i)} stroke={PAPER.tabLine} strokeWidth={0.9} />);
  els.push(<line key={k('tL')} x1={L} x2={L} y1={tabTop} y2={tabBot} stroke={PAPER.line} strokeWidth={1} />);
  ['T', 'A', 'B'].forEach((ch, i) => {
    els.push(<text key={k(`tab${ch}`)} x={L + 15} y={tabTop + (5 * t) * (0.2 + i * 0.3)} fill={PAPER.ink} fontFamily={SERIF} fontWeight={700} fontSize={t * 1.15} textAnchor="middle" dominantBaseline="central">{ch}</text>);
  });

  // Barlines + measure numbers
  const drawBar = (x, key) => {
    if (showNotation) els.push(<line key={k(`bn${key}`)} x1={x} x2={x} y1={staffTop} y2={staffBot} stroke={PAPER.line} strokeWidth={1} />);
    els.push(<line key={k(`bt${key}`)} x1={x} x2={x} y1={tabTop} y2={tabBot} stroke={PAPER.line} strokeWidth={1} />);
  };
  innerBars.forEach((b) => drawBar(barX.get(b), b));
  if (isFinal) {
    const thin = endX - 4.5;
    drawBar(thin, 'fin');
    if (showNotation) els.push(<rect key={k('fn')} x={endX - 2} y={staffTop} width={3} height={4 * s} fill={PAPER.ink} />);
    els.push(<rect key={k('ft')} x={endX - 2} y={tabTop} width={3} height={5 * t} fill={PAPER.ink} />);
  } else drawBar(endX, 'end');

  if (showMeasureNumbers) {
    const numY = (showNotation ? staffTop : tabTop) - 5;
    els.push(<text key={k('m0')} x={L + 2} y={numY} fill={PAPER.red} fontFamily={NUMFONT} fontSize={9}>{measureStart}</text>);
    innerBars.forEach((b, i) => {
      els.push(<text key={k(`m${b}`)} x={barX.get(b) + 3} y={numY} fill={PAPER.red} fontFamily={NUMFONT} fontSize={9}>{measureStart + i + 1}</text>);
    });
  }

  // Next note on the same string (for slurs / slides)
  const nextOn = (string, col) => {
    for (const e of model.events) if (e.col > col) { const n = e.notes.find((m) => m.string === string); if (n) return { e, n }; }
    return null;
  };
  const nextEventCol = (col) => model.events.find((e) => e.col > col)?.col;

  // Techniques (drawn under the numbers so numbers stay on top)
  for (const e of events) {
    const x = X(e.col);
    for (const n of e.notes) {
      const y = tabY(n.string);
      if (n.leg) {
        const nx = nextOn(n.string, e.col);
        if (nx && inSys(nx.e.col)) {
          const x2 = X(nx.e.col);
          const top = y - 15;
          els.push(<path key={k(`lg${e.col}-${n.string}`)} d={`M${x + 3} ${y - 7} Q${(x + x2) / 2} ${top - 2} ${x2 - 3} ${y - 7}`} fill="none" stroke={PAPER.ink} strokeWidth={1} />);
          els.push(<text key={k(`lgt${e.col}-${n.string}`)} x={n.bend ? x + (x2 - x) * 0.68 : (x + x2) / 2} y={top - 3} fill={PAPER.ink} fontFamily={NUMFONT} fontSize={9} fontWeight={700} textAnchor="middle">{n.leg}</text>);
        }
      }
      if (n.slide) {
        const nx = nextOn(n.string, e.col);
        if (nx && inSys(nx.e.col)) {
          const x2 = X(nx.e.col);
          const up = (nx.n.fret ?? 0) >= (n.fret ?? 0);
          els.push(<line key={k(`sl${e.col}-${n.string}`)} x1={x + 7} x2={x2 - 7} y1={y + (up ? 3 : -3)} y2={y + (up ? -3 : 3)} stroke={PAPER.ink} strokeWidth={1.1} />);
        }
      }
      if (n.bend) {
        const tx = x + 15;
        const ty = tabTop - 16;
        els.push(<path key={k(`bd${e.col}-${n.string}`)} d={`M${x + 6} ${y} Q${tx} ${y} ${tx} ${ty + 4}`} fill="none" stroke={PAPER.ink} strokeWidth={1} />);
        els.push(<path key={k(`ba${e.col}-${n.string}`)} d={`M${tx - 3} ${ty + 6} L${tx} ${ty} L${tx + 3} ${ty + 6} Z`} fill={PAPER.ink} />);
        const lbl = bendLabel(n.bend);
        if (lbl) els.push(<text key={k(`bl${e.col}-${n.string}`)} x={tx} y={ty - 3} fill={PAPER.ink} fontFamily={NUMFONT} fontSize={9} textAnchor="middle">{lbl}</text>);
        if (n.release) {
          els.push(<path key={k(`br${e.col}-${n.string}`)} d={`M${tx} ${ty + 4} Q${tx} ${y} ${tx + 12} ${y - 2}`} fill="none" stroke={PAPER.ink} strokeWidth={1} strokeDasharray="2 2" />);
        }
      }
      if (n.vib) {
        const nc = nextEventCol(e.col);
        const x2 = Math.min(nc != null && inSys(nc) ? X(nc) - 6 : x + 30, endX - 4);
        const vy = tabTop - (n.bend ? 34 : 8);
        let d = `M${x + 4} ${vy}`;
        for (let px = x + 4, up = true; px < x2; px += 3, up = !up) d += ` L${px + 3} ${vy + (up ? -2 : 2)}`;
        els.push(<path key={k(`vb${e.col}-${n.string}`)} d={d} fill="none" stroke={PAPER.ink} strokeWidth={1.1} />);
      }
    }
  }

  // Fret numbers on the lines
  for (const e of events) {
    const x = X(e.col);
    for (const n of e.notes) {
      const y = tabY(n.string);
      const label = n.dead ? 'X' : n.harm ? `<${n.fret}>` : n.ghost ? `(${n.fret})` : String(n.fret);
      const w = label.length * 6.6 + 3;
      els.push(<rect key={k(`fb${e.col}-${n.string}`)} x={x - w / 2} y={y - 6.5} width={w} height={13} fill={PAPER.bg} />);
      els.push(<text key={k(`fn${e.col}-${n.string}`)} x={x} y={y + 0.5} fill={PAPER.ink} fontFamily={NUMFONT} fontSize={12} textAnchor="middle" dominantBaseline="central">{label}</text>);
      const fing = tech?.fingers?.get(`${e.col}:${n.string}`);
      if (fing) els.push(<text key={k(`ft${e.col}-${n.string}`)} x={x + w / 2 - 0.5} y={y - 4} fill={PAPER.red} fontFamily={NUMFONT} fontSize={8.5} fontWeight={700}>{fing}</text>);
    }
  }

  // Pick strokes (Guitar Pro: ⊓ downstroke, V upstroke) in a row above the system
  if (strokesHere) {
    for (const e of events) {
      const d = tech.strokes.get(e.col);
      if (!d) continue;
      const name = d === 'd' ? 'stringsDownBow' : 'stringsUpBow';
      els.push(<Glyph key={k(`pk${e.col}`)} name={name} x={X(e.col) - glyphW(name, s) / 2} y={strokeBase} s={s} />);
    }
  }

  return <svg width={Math.ceil(endX + 4)} height={H} style={{ display: 'block', overflow: 'visible' }}>{els}</svg>;
}

function TabSegment({ model, avail, showNotation, tech }) {
  const systems = useMemo(() => {
    const flats = prefersFlats(model);
    return layoutSystems(model, Math.max(160, avail - 44), tech?.fingers?.size ? 28 : 26).map((sy) => ({ ...sy, flats }));
  }, [model, avail, tech, showNotation]);
  const measureCount = model.bars.filter((b) => b !== model.cols - 1).length + 1;
  const showNums = measureCount >= 2;
  let m = 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {systems.map((sy, i) => {
        const startNo = m;
        m += sy.innerBars.filter((b) => b.col !== model.cols - 1).length + (i < systems.length - 1 && !sy.innerBars.length ? 0 : 0);
        return <System key={i} model={model} sys={sy} tech={tech} showNotation={showNotation} isFinal={i === systems.length - 1} measureStart={startNo} showMeasureNumbers={showNums} />;
      })}
      {model.annotations?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 36 }}>
          {model.annotations.map((a, i) => (
            <div key={i} style={{ fontFamily: SERIF, fontSize: 13.5, color: PAPER.soft, fontStyle: 'italic' }}>
              <span style={{ fontFamily: MONO, fontStyle: 'normal', fontSize: 12, color: PAPER.ink, marginRight: 8 }}>{STRING_LABEL[a.string]}|</span>{a.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// lines: lesson/Woodshed tab text. model: prebuilt score model. assumeTab: lines are raw tab rows (Woodshed chunks).
// context: exercise name/description, used to pick the picking style (alternate / economy / sweep)
export default function TabScore({ lines, model, tempo, title, subtitle, assumeTab = false, compact = false, notation, context = '' }) {
  const st = useStore();
  const showNotation = notation ?? (st?.settings?.showNotation ?? true);
  const showPicking = st?.settings?.showPicking ?? true;
  const showFingering = st?.settings?.showFingering ?? true;
  const [ref, width] = useWidth();
  const segments = useMemo(() => {
    const segs = model ? [{ type: 'tab', model }] : splitTabText(lines || [], { assumeTab });
    const style = pickingStyle(context);
    return segs.map((seg, i) => {
      if (seg.type !== 'tab') return seg;
      const prev = segs[i - 1];
      const rule = prev?.type === 'text' ? strokeRuleFromText(prev.lines.slice(-2)) : null;
      return { ...seg, tech: annotateTechnique(seg.model, { style, rule }) };
    });
  }, [lines, model, assumeTab, context]);
  const techFor = (seg) => (seg.tech ? { strokes: showPicking ? seg.tech.strokes : null, fingers: showFingering ? seg.tech.fingers : null } : null);

  return (
    <div style={{ background: PAPER.bg, color: PAPER.ink, borderRadius: 3, boxShadow: PAPER.shadow, padding: compact ? '10px 14px 8px' : '16px 22px 14px' }}>
      {(title || subtitle) && (
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          {title && <div style={{ fontFamily: SERIF, fontSize: 20, color: PAPER.ink }}>{title}</div>}
          {subtitle && <div style={{ fontFamily: SERIF, fontSize: 13.5, fontWeight: 700, color: PAPER.ink }}>{subtitle}</div>}
        </div>
      )}
      {tempo > 0 && (
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14, color: PAPER.ink, margin: '0 0 2px 36px' }}>
          <span style={{ fontFamily: "'Segoe UI Symbol', 'Noto Music', 'DejaVu Sans', serif", fontWeight: 400, fontSize: 17 }}>♩</span> = {tempo}
        </div>
      )}
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {width > 0 && segments.map((seg, i) => (seg.type === 'tab' ? (
          <TabSegment key={i} model={seg.model} avail={width} showNotation={showNotation} tech={techFor(seg)} />
        ) : (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {seg.lines.map((l, j) => (l.trim() === '' ? <div key={j} style={{ height: 6 }} /> : /\S\s{2,}\S|\|/.test(l.trim()) ? (
              <div key={j} style={{ fontFamily: MONO, fontSize: 12.5, whiteSpace: 'pre', color: PAPER.ink, overflowX: 'auto' }}>{l}</div>
            ) : (
              <div key={j} style={{ fontFamily: SERIF, fontSize: 15, color: PAPER.ink }}>{l}</div>
            )))}
          </div>
        )))}
      </div>
    </div>
  );
}
