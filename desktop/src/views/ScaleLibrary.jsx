// Port of ScaleLibraryView.swift + ScaleLibrary.swift (GuitarScale helpers)
import { useState } from 'react';
import { T, mono, sys, alpha } from '../theme.js';
import { useStore } from '../store.jsx';
import { FretboardView } from '../components/Fretboard.jsx';
import TabScore from '../score/TabScore.jsx';
import { modelFromPositions } from '../score/parseTab.js';
import Icon from '../components/Icon.jsx';
import { Sheet, NavButton } from '../components/Overlays.jsx';

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CATEGORIES = [
  ['major', 'Major', T.green], ['minor', 'Minor', T.blue], ['pentatonic', 'Pentatonic', T.accent], ['blues', 'Blues', T.purple],
  ['modes', 'Modes', T.yellow], ['metal', 'Metal / Heavy', T.red], ['jazz', 'Jazz', T.blue], ['exotic', 'Exotic', T.purple],
  ['custom', 'Custom', T.accent],
];
const catColor = (c) => (CATEGORIES.find((x) => x[0] === c) || [])[2] || T.accent;

export function notesInKey(scale, root) {
  const r = ALL_NOTES.indexOf(root);
  if (r < 0) return [];
  return scale.intervals.map((i) => ALL_NOTES[(r + i) % 12]);
}

// GuitarScale.fretboardDiagram(root:startFret:)
export function scaleDiagram(scale, root, startFret) {
  const open = [4, 11, 7, 2, 9, 4];
  const r = ALL_NOTES.indexOf(root);
  if (r < 0) return { title: scale.name, subtitle: null, startFret, endFret: startFret + 4, highlights: [] };
  const set = new Set(scale.intervals.map((i) => (r + i) % 12));
  const highlights = [];
  for (let s = 0; s < 6; s++) {
    for (let fret = startFret; fret <= startFret + 5; fret++) {
      const ni = (open[s] + fret) % 12;
      if (!set.has(ni)) continue;
      const interval = (ni - r + 12) % 12;
      const isRoot = interval === 0;
      let di = scale.intervals.indexOf(interval);
      if (di < 0) di = 0;
      const label = di < scale.degreeNames.length ? scale.degreeNames[di] : ALL_NOTES[ni];
      const dn = scale.degreeNames[di] || '';
      const color = isRoot ? 'accent' : dn.includes('b') ? 'blue' : dn.includes('#') ? 'yellow' : 'green';
      highlights.push({ string: s, fret, label, isRoot, color });
    }
  }
  return { title: `${root} ${scale.name}`, subtitle: `Position ${startFret}`, startFret: Math.max(0, startFret - 1), endFret: startFret + 6, highlights };
}

const findRootFret = (root) => {
  const i = ALL_NOTES.indexOf(root);
  return i < 0 ? 0 : (i - 4 + 12) % 12;
};

export default function ScaleLibrary() {
  const st = useStore();
  const [category, setCategory] = useState('metal');
  const [selectedId, setSelectedId] = useState(null);
  const [root, setRoot] = useState('E');
  const [position, setPosition] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const scales = st.allScales.filter((s) => s.category === category);
  const selected = st.allScales.find((s) => s.id === selectedId) || null;

  return (
    <div className="fl-page" style={{ background: T.bg, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ ...sys(26, 800), color: T.text }}>Scale Library</div>
        <span style={{ ...mono(11), color: T.textMuted, flex: 1 }}>{st.allScales.length} scales</span>
        <button className="fl-btn" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono(12, 700), color: T.accent, background: T.accentSoft, padding: '9px 14px', borderRadius: 10 }}>
          <Icon name="plusCircleFill" size={16} color={T.accent} /> Custom Scale
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATEGORIES.map(([id, label, color]) => (
          <div key={id} onClick={() => { setCategory(id); setSelectedId(null); }} style={{
            ...mono(11, 700), whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', padding: '7px 14px', borderRadius: 999,
            color: category === id ? color : T.textMuted, background: category === id ? alpha(color, 0.12) : 'transparent',
            border: `1px solid ${category === id ? alpha(color, 0.3) : T.border}`,
          }}>{label}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {scales.length === 0 && <div style={{ ...sys(13), color: T.textMuted, padding: 20 }}>No scales in this category yet.</div>}
        {scales.map((s) => {
          const color = catColor(s.category);
          const sel = selectedId === s.id;
          return (
            <div key={s.id} className="fl-press" onClick={() => setSelectedId(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, cursor: 'pointer',
              background: sel ? alpha(color, 0.06) : T.card, border: `1px solid ${sel ? alpha(color, 0.3) : T.border}`,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono(14, 800), color, flexShrink: 0 }}>{s.intervals.length}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <div style={{ ...sys(14, 700), color: sel ? T.text : T.textSecondary }}>{s.name}</div>
                <div style={{ ...sys(11), color: T.textMuted }}>{s.mood}</div>
              </div>
              <span style={{ ...mono(9, 600), color, background: alpha(color, 0.1), padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>{s.genre.split(',')[0]}</span>
              <Icon name={sel ? 'chevronDown' : 'chevronRight'} size={11} color={T.textMuted} />
            </div>
          );
        })}
      </div>

      <div style={{ position: 'sticky', top: 16 }}>
      {!selected && (
        <div style={{ padding: 40, background: T.card, borderRadius: 14, border: `1px dashed ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Icon name="music" size={32} color={T.textMuted} />
          <div style={{ ...sys(14, 600), color: T.textSecondary }}>Select a scale to see its notes and fretboard</div>
        </div>
      )}
      {selected && (
        <div style={{ padding: 20, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...sys(13), color: T.textSecondary, lineHeight: 1.5 }}>{selected.description}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1 }}>ROOT NOTE</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ALL_NOTES.map((n) => (
                <div key={n} onClick={() => setRoot(n)} style={{
                  width: 42, height: 36, flexShrink: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  ...mono(12, 700), color: root === n ? '#fff' : T.textSecondary, background: root === n ? T.accent : T.card, border: `1px solid ${T.border}`,
                }}>{n}</div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1 }}>NOTES IN {root} {selected.name.toUpperCase()}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {notesInKey(selected, root).map((note, i) => {
                const deg = selected.degreeNames[i];
                if (deg === undefined) return null;
                return (
                  <div key={i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0', borderRadius: 6, background: deg === 'R' ? T.accentSoft : 'rgba(255,255,255,0.03)' }}>
                    <span style={{ ...mono(13, 800), color: deg === 'R' ? T.accent : T.text }}>{note}</span>
                    <span style={{ ...mono(8), color: deg.includes('b') ? T.blue : deg.includes('#') ? T.yellow : T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{deg}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1 }}>INTERVALS (SEMITONES)</div>
            <div style={{ ...mono(14, 700), color: T.text }}>{selected.intervals.join(' - ')}</div>
          </div>

          {selected.fretPattern && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1 }}>FRET PATTERN</div>
              <div style={{ ...mono(13, 700), color: T.accent }}>{selected.fretPattern}</div>
            </div>
          )}

          {(() => {
            const diagram = scaleDiagram(selected, root, position === 0 ? findRootFret(root) : position);
            return (
              <>
                <FretboardView diagram={diagram} />
                <div style={{ ...mono(9, 700), color: T.textMuted, letterSpacing: 1 }}>TAB — ASCENDING THROUGH THIS POSITION</div>
                <TabScore model={modelFromPositions(diagram.highlights)} />
              </>
            );
          })()}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[0, 3, 5, 7, 10, 12].map((p) => (
              <button key={p} className="fl-btn" onClick={() => setPosition(p)} style={{
                ...mono(10, 600), padding: '6px 10px', borderRadius: 8,
                color: position === p ? T.accent : T.textMuted, background: position === p ? T.accentSoft : T.card,
              }}>Pos {p}</button>
            ))}
          </div>
        </div>
      )}
      </div>
      </div>

      <AddCustomScaleSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={(s) => { st.addCustomScale(s); setShowAdd(false); }} />
    </div>
  );
}

const SEMITONE_LABELS = ['R', 'b2', '2', 'b3', '3', '4', 'b5/Tritone', '5', 'b6', '6', 'b7', '7'];
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: 12, background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, color: T.text, ...sys(15), outline: 'none' };

function AddCustomScaleSheet({ open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [fretPattern, setFretPattern] = useState('');
  const [sel, setSel] = useState(() => new Set([0]));
  const reset = () => { setName(''); setGenre(''); setMood(''); setFretPattern(''); setSel(new Set([0])); };
  const close = () => { reset(); onClose(); };
  const intervals = [...sel].sort((a, b) => a - b);
  const label = (t) => <div style={{ ...mono(10, 700), color: T.textMuted }}>{t}</div>;

  return (
    <Sheet open={open} onClose={close} title="Custom Scale" leading={<NavButton onClick={close}>Cancel</NavButton>}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, background: T.bg }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {label('SCALE NAME')}
          <input style={inputStyle} placeholder="e.g. My Metal Scale" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>{label('GENRE')}<input style={inputStyle} placeholder="Metal" value={genre} onChange={(e) => setGenre(e.target.value)} /></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>{label('MOOD')}<input style={inputStyle} placeholder="Dark" value={mood} onChange={(e) => setMood(e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {label('FRET PATTERN (OPTIONAL)')}
          <input style={inputStyle} placeholder="e.g. 0-1-3-5-7-8-10" value={fretPattern} onChange={(e) => setFretPattern(e.target.value)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {label('SELECT INTERVALS (TAP TO TOGGLE)')}
          <div style={{ ...sys(11), color: T.textMuted }}>Root is always included</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {SEMITONE_LABELS.map((lbl, semitone) => {
              const on = sel.has(semitone);
              return (
                <button key={semitone} disabled={semitone === 0} className="fl-btn" onClick={() => {
                  if (semitone === 0) return;
                  setSel((s) => { const n = new Set(s); if (n.has(semitone)) n.delete(semitone); else n.add(semitone); return n; });
                }} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0', borderRadius: 8,
                  color: on ? '#fff' : T.textSecondary, background: on ? T.accent : T.card, border: `1px solid ${on ? T.accent : T.border}`,
                  opacity: semitone === 0 ? 0.6 : 1, cursor: semitone === 0 ? 'default' : 'pointer',
                }}>
                  <span style={{ ...mono(14, 800) }}>{semitone}</span>
                  <span style={{ ...mono(8) }}>{lbl}</span>
                </button>
              );
            })}
          </div>
        </div>
        {sel.size >= 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {label('PREVIEW')}
            <div style={{ ...mono(13, 700), color: T.accent }}>Intervals: {intervals.join('-')}</div>
            <div style={{ ...mono(11), color: T.textMuted }}>{sel.size} notes</div>
          </div>
        )}
        <button className="fl-btn" disabled={sel.size < 3} onClick={() => {
          onSave({
            name: name || 'Custom Scale', intervals, degreeNames: intervals.map((i) => SEMITONE_LABELS[i]),
            genre: genre || 'Custom', mood: mood || 'Custom', fretPattern: fretPattern || null,
          });
          reset();
        }} style={{ width: '100%', ...mono(15, 700), color: '#fff', padding: '14px 0', borderRadius: 14, background: sel.size >= 3 ? T.accent : T.textMuted, cursor: sel.size >= 3 ? 'pointer' : 'default' }}>
          Save Scale
        </button>
      </div>
    </Sheet>
  );
}
