// Port of WoodshedViews.swift (WoodshedView, NewProjectSheet, SoloDetailView)
import { useRef, useState } from 'react';
import { T, mono, sys, alpha } from '../theme.js';
import { useStore } from '../store.jsx';
import { keyDisplayName } from '../services/tabParser.js';
import Icon from '../components/Icon.jsx';
import { Sheet, NavButton } from '../components/Overlays.jsx';
import { useMetronome } from './Session.jsx';
import TabScore from '../score/TabScore.jsx';

const DIFF = {
  beginner: ['Beginner', T.green], intermediate: ['Intermediate', T.blue], advanced: ['Advanced', T.purple], expert: ['Expert', T.red],
};
const TECH = {
  bend: ['Bend', 'arrowUpCircle', T.accent], hammerOn: ['Hammer-On', 'hammer', T.green], pullOff: ['Pull-Off', 'arrowDownLeft', T.blue],
  slide: ['Slide', 'arrowRight', T.yellow], vibrato: ['Vibrato', 'waveform', T.purple], tap: ['Tap', 'tap', T.red],
  harmonic: ['Harmonic', 'diamond', T.blue], palmMute: ['Palm Mute', 'hand', T.textSecondary], sweep: ['Sweep', 'wind', T.accent],
  tremoloPick: ['Tremolo Pick', 'bolt', T.yellow],
};

// Sample tab used by the iOS photo import until OCR is implemented (WoodshedViews.swift extractTabFromImage)
const PHOTO_PLACEHOLDER_TAB = [
  'e|--5-8-5-----------5-8-5---------|',
  'B|--------8-5-----------8-5-------|',
  'G|------------7-5-----------7-5---|',
  'D|-7----------------------------7-|',
  'A|--------------------------------|',
  'E|--------------------------------|',
];

function MasteryRing({ value, size, width, color, fontSize }) {
  const r = size / 2 - width / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={width} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} style={{ opacity: value > 0 ? 1 : 0, transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono(fontSize, 700), color: T.text }}>{Math.trunc(value * 100)}%</div>
    </div>
  );
}

function TechTag({ t, small }) {
  const [label, icon, color] = TECH[t] || [t, 'music', T.textSecondary];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...sys(small ? 9 : 10, 600), color, background: alpha(color, 0.1), padding: small ? '3px 6px' : '5px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
      <Icon name={icon} size={small ? 9 : 10} color={color} /> {label}
    </span>
  );
}

export default function Woodshed() {
  const st = useStore();
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState(0);
  const [openProjectId, setOpenProjectId] = useState(null);
  const openProject = st.projects.find((p) => p.id === openProjectId);

  if (openProject) return <SoloDetail project={openProject} onBack={() => setOpenProjectId(null)} />;

  const seg = (title, i) => (
    <button className="fl-btn" onClick={() => setTab(i)} style={{ flex: 1, ...mono(12, 700), padding: '10px 0', borderRadius: 10, color: tab === i ? T.accent : T.textMuted, background: tab === i ? T.accentSoft : 'transparent', transition: 'all .2s' }}>{title}</button>
  );

  return (
    <div className="fl-scroll" style={{ height: '100%', overflowY: 'auto', background: T.bg }}>
      <div className="fl-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <div style={{ ...sys(26, 800), color: T.text }}>Solo Woodshed</div>
        <div style={{ display: 'flex', width: 340, background: T.card, borderRadius: 12, padding: 4, border: `1px solid ${T.border}` }}>{seg('My Solos', 0)}{seg('Lick Library', 1)}</div>
        <div style={{ flex: 1 }} />
        <button className="fl-btn" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono(12, 700), color: T.accent, background: T.accentSoft, padding: '9px 14px', borderRadius: 10 }}>
          <Icon name="plusCircleFill" size={16} color={T.accent} /> New Solo
        </button>
      </div>
        <div className={(tab === 0 ? st.projects.length : st.lickLibrary.length) ? 'fl-grid-cards' : ''} style={{ gap: 14 }}>
          {tab === 0 ? (
            st.projects.length === 0 ? (
              <Empty icon="listMusic" title="No solos yet" text="Take a photo of guitar tab to start learning a solo in chunks">
                <button className="fl-btn" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono(14, 700), color: '#fff', background: T.accent, padding: '13px 28px', borderRadius: 14 }}>
                  <Icon name="camera" size={14} color="#fff" /> Import Tab
                </button>
              </Empty>
            ) : st.projects.map((p) => <ProjectCard key={p.id} p={p} onOpen={() => setOpenProjectId(p.id)} />)
          ) : st.lickLibrary.length === 0 ? (
            <Empty icon="heartText" title="No saved licks yet" text="Favorite chunks from your solos to build your personal lick library" />
          ) : st.lickLibrary.map((l) => <LickCard key={l.id} lick={l} />)}
        </div>
      </div>
      <NewProjectSheet open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function Empty({ icon, title, text, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 80 }}>
      <Icon name={icon} size={56} color={T.textMuted} />
      <div style={{ ...sys(18, 700), color: T.text }}>{title}</div>
      <div style={{ ...sys(13), color: T.textSecondary, textAlign: 'center', maxWidth: 420 }}>{text}</div>
      {children}
    </div>
  );
}

function ProjectCard({ p, onOpen }) {
  const [dName, dColor] = DIFF[p.difficulty];
  const mastered = p.chunks.filter((c) => c.isMastered).length;
  return (
    <div className="fl-press" onClick={onOpen} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, cursor: 'pointer' }}>
      <MasteryRing value={p.overallMastery} size={50} width={4} color={dColor} fontSize={10} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ ...sys(15, 700), color: T.text }}>{p.title}</div>
        <div style={{ ...sys(12), color: T.textSecondary }}>{p.artist}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {p.detectedKey && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...sys(10, 600), color: T.blue }}><Icon name="music" size={10} color={T.blue} /> {keyDisplayName(p.detectedKey)}</span>}
          <span style={{ ...mono(10), color: T.textMuted }}>{mastered}/{p.chunks.length} chunks</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ ...mono(9, 700), color: dColor }}>{dName}</span>
        <Icon name="chevronRight" size={11} color={T.textMuted} />
      </div>
    </div>
  );
}

function LickCard({ lick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, background: T.card, borderRadius: 14, border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ ...sys(14, 700), color: T.text, flex: 1 }}>{lick.title}</div>
        <span style={{ ...mono(10, 600), color: T.blue, background: T.blueSoft, padding: '3px 8px', borderRadius: 999 }}>{lick.key}</span>
      </div>
      <div className="fl-hscroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>{lick.techniques.map((t) => <TechTag key={t} t={t} small />)}</div>
      <TabScore lines={lick.tabLines.slice(0, 6)} assumeTab compact notation={false} />
    </div>
  );
}

const field = { width: '100%', boxSizing: 'border-box', padding: 14, background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, color: T.text, ...sys(15), outline: 'none' };

function NewProjectSheet({ open, onClose }) {
  const st = useStore();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [targetBPM, setTargetBPM] = useState('120');
  const [image, setImage] = useState(null);
  const [manualTab, setManualTab] = useState('');
  const [processing, setProcessing] = useState(false);
  const [inputMode, setInputMode] = useState(0);
  const fileRef = useRef(null);

  const reset = () => { setTitle(''); setArtist(''); setTargetBPM('120'); setImage(null); setManualTab(''); setProcessing(false); setInputMode(0); };
  const close = () => { reset(); onClose(); };
  const canCreate = title !== '' && artist !== '' && (image != null || manualTab !== '');

  const pickFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };
  const pasteImage = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith('image/'));
        if (type) { pickFile(new File([await it.getType(type)], 'clipboard', { type })); return; }
      }
    } catch { /* clipboard unavailable */ }
  };

  const create = () => {
    setProcessing(true);
    const tabLines = inputMode === 0 && image ? PHOTO_PLACEHOLDER_TAB : manualTab.replace(/\r/g, '').split('\n');
    const bpm = parseInt(targetBPM, 10) || 120;
    setTimeout(() => {
      st.createProject({ title, artist, tabLines, targetBPM: bpm });
      close();
    }, 1000);
  };

  const modeBtn = (i, icon, label) => (
    <button className="fl-btn" onClick={() => setInputMode(i)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...mono(12, 700), padding: '10px 0', borderRadius: 10, color: inputMode === i ? T.accent : T.textMuted, background: inputMode === i ? T.accentSoft : 'transparent' }}>
      <Icon name={icon} size={13} color={inputMode === i ? T.accent : T.textMuted} /> {label}
    </button>
  );

  return (
    <Sheet open={open} onClose={close} title="New Solo" leading={<NavButton onClick={close}>Cancel</NavButton>}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20, background: T.bg }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...mono(10, 700), color: T.textMuted, letterSpacing: 1 }}>SONG INFO</div>
          <input style={field} placeholder="Solo / Song Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input style={field} placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ ...sys(13), color: T.textSecondary, flex: 1 }}>Target BPM</span>
            <input style={{ ...field, width: 80, padding: 10, textAlign: 'center', borderRadius: 8 }} placeholder="120" inputMode="numeric" value={targetBPM} onChange={(e) => setTargetBPM(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ ...mono(10, 700), color: T.textMuted, letterSpacing: 1 }}>TAB INPUT</div>
          <div style={{ display: 'flex' }}>{modeBtn(0, 'camera', 'Photo')}{modeBtn(1, 'keyboard', 'Type Tab')}</div>
        </div>

        {inputMode === 0 ? (
          image ? (
            <div style={{ position: 'relative' }}>
              <img src={image} alt="" style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 12, display: 'block' }} />
              <button className="fl-btn" onClick={() => setImage(null)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', padding: 0, filter: 'drop-shadow(0 0 4px rgba(0,0,0,.6))' }}><Icon name="xCircleFill" size={24} color="#fff" /></button>
            </div>
          ) : (
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 30, background: T.card, borderRadius: 14, border: `2px dashed ${T.border}` }}>
              <Icon name="viewfinder" size={40} color={T.accent} />
              <div style={{ ...sys(14, 600), color: T.text }}>Take a photo of guitar tab</div>
              <div style={{ ...sys(12), color: T.textSecondary, textAlign: 'center' }}>Snap a picture of tab from a book, printout, or screen</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="fl-btn" onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono(12, 700), color: T.accent, background: T.accentSoft, padding: '10px 20px', borderRadius: 10 }}>
                  <Icon name="photo" size={13} color={T.accent} /> Choose File
                </button>
                <button className="fl-btn" onClick={pasteImage} style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono(12, 700), color: T.blue, background: T.blueSoft, padding: '10px 20px', borderRadius: 10 }}>
                  <Icon name="paste" size={13} color={T.blue} /> Paste
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { pickFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...sys(12), color: T.textSecondary }}>Paste or type tab (6 lines: e, B, G, D, A, E)</div>
            <textarea value={manualTab} onChange={(e) => setManualTab(e.target.value)} spellCheck={false}
              style={{ ...mono(11), color: T.text, minHeight: 160, padding: 10, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, outline: 'none', resize: 'vertical', whiteSpace: 'pre', overflowWrap: 'normal' }} />
            <div style={{ ...sys(10), color: T.textMuted }}>Example format:</div>
            <div style={{ ...mono(9), color: T.textMuted, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8, whiteSpace: 'pre' }}>
              {'e|--5-8-5---------|\nB|--------8-5------|\nG|------------7-5--|\nD|-----------------|\nA|-----------------|\nE|-----------------|'}
            </div>
          </div>
        )}

        <button className="fl-btn" disabled={!canCreate || processing} onClick={create} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...mono(15, 700), color: '#fff', padding: '14px 0', borderRadius: 14, background: canCreate ? T.accent : T.textMuted, cursor: canCreate && !processing ? 'pointer' : 'default' }}>
          {processing && <span className="fl-spinner" />}
          {processing ? 'Processing...' : 'Create Solo Project'}
        </button>
      </div>
    </Sheet>
  );
}

function SoloDetail({ project, onBack }) {
  const st = useStore();
  const m = useMetronome();
  const [idx, setIdx] = useState(0);
  const [dName, dColor] = DIFF[project.difficulty];
  const mastered = project.chunks.filter((c) => c.isMastered).length;
  const key = project.detectedKey;
  const allTech = [...new Set(project.chunks.flatMap((c) => c.techniques))];
  const chunk = project.chunks[idx];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      {/* Navigation bar (inline title) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '14px 28px', borderBottom: `1px solid ${T.border}` }}>
        <button className="fl-link" onClick={onBack} style={{ justifySelf: 'start', display: 'flex', alignItems: 'center', gap: 2, color: T.blue, ...sys(16) }}>
          <Icon name="chevronLeft" size={20} color={T.blue} strokeWidth={2.5} /> Back
        </button>
        <div style={{ ...sys(17, 700), color: T.text, maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.title}</div>
        <div />
      </div>
      <div className="fl-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="fl-page" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 28, alignItems: 'start' }}>
         <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <MasteryRing value={project.overallMastery} size={60} width={5} color={T.accent} fontSize={14} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ ...sys(14), color: T.textSecondary }}>{project.artist}</div>
              <div style={{ ...mono(11), color: T.textMuted }}>{mastered}/{project.chunks.length} chunks mastered</div>
              <div style={{ ...mono(11), color: T.accent }}>Target: {project.targetBPM} BPM</div>
            </div>
            <span style={{ ...mono(10, 700), color: dColor, background: alpha(dColor, 0.12), padding: '5px 10px', borderRadius: 999 }}>{dName}</span>
          </div>

          {key && (
            <div style={{ padding: 14, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="music" size={13} color={T.blue} />
                <span style={{ ...sys(13, 700), color: T.text, flex: 1 }}>Detected Key &amp; Scale</span>
                <span style={{ ...mono(9), color: T.textMuted }}>{Math.trunc(key.confidence * 100)}% confidence</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ ...mono(8, 700), color: T.textMuted }}>KEY</span>
                  <span style={{ ...sys(18, 800), color: T.blue }}>{keyDisplayName(key)}</span>
                </div>
                <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.12)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ ...mono(8, 700), color: T.textMuted }}>SCALE</span>
                  <span style={{ ...sys(14, 700), color: T.green }}>{project.detectedScale || keyDisplayName(key)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ ...mono(9), color: T.textMuted }}>Notes:</span>
                {key.scaleNotes.map((n) => (
                  <span key={n} style={{ ...mono(10, 700), color: n === key.rootNote ? T.accent : T.text, background: n === key.rootNote ? T.accentSoft : 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>{n}</span>
                ))}
              </div>
            </div>
          )}

          {allTech.length > 0 && <div className="fl-hscroll" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>{allTech.map((t) => <TechTag key={t} t={t} />)}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...mono(10, 700), color: T.textMuted, letterSpacing: 1 }}>CHUNKS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {project.chunks.map((c, i) => (
                <div key={c.id} onClick={() => setIdx(i)} style={{
                  width: 56, height: 56, flexShrink: 0, borderRadius: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  background: idx === i ? T.accentSoft : c.isMastered ? T.greenSoft : T.card,
                  border: `1px solid ${idx === i ? alpha(T.accent, 0.4) : c.isMastered ? alpha(T.green, 0.3) : T.border}`,
                }}>
                  <span style={{ ...mono(12, 700), color: c.isMastered ? T.green : idx === i ? T.accent : T.textMuted }}>{c.isMastered ? '✓' : i + 1}</span>
                  <span style={{ ...mono(8), color: T.textMuted }}>{c.bestTempoPct}%</span>
                </div>
              ))}
            </div>
          </div>

         </div>
          {chunk && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 22, background: T.card, borderRadius: 16, border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ ...sys(20, 800), color: T.text, flex: 1 }}>{chunk.label}</span>
                <div style={{ display: 'flex', gap: 4 }}>{chunk.techniques.slice(0, 3).map((t) => <Icon key={t} name={TECH[t]?.[1]} size={10} color={TECH[t]?.[2]} />)}</div>
              </div>
              <TabScore lines={chunk.tabLines} assumeTab tempo={Math.trunc((chunk.currentTempoPct * project.targetBPM) / 100)} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...mono(9, 700), color: T.textMuted, flex: 1 }}>PRACTICE SPEED</span>
                  <span style={{ ...mono(10), color: T.accent }}>{chunk.currentTempoPct}% of {project.targetBPM} BPM = {Math.trunc((chunk.currentTempoPct * project.targetBPM) / 100)} BPM</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[25, 50, 75, 100].map((pct) => (
                    <button key={pct} className="fl-btn" onClick={() => { st.updateChunkTempo(chunk.id, project.id, pct); m.setBPM(Math.trunc((pct * project.targetBPM) / 100)); }}
                      style={{ flex: 1, ...mono(12, 700), padding: '10px 0', borderRadius: 8, border: `1px solid ${T.border}`, color: chunk.currentTempoPct === pct ? '#fff' : T.textSecondary, background: chunk.currentTempoPct === pct ? T.accent : T.card }}>{pct}%</button>
                  ))}
                </div>
                <button className="fl-btn" onClick={() => { if (!m.isPlaying) m.setBPM(Math.trunc((chunk.currentTempoPct * project.targetBPM) / 100)); m.toggle(); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...mono(13, 700), padding: '12px 0', borderRadius: 10, color: m.isPlaying ? T.red : T.green, background: m.isPlaying ? T.redSoft : T.greenSoft }}>
                  <Icon name={m.isPlaying ? 'stop' : 'metronome'} size={14} color={m.isPlaying ? T.red : T.green} /> {m.isPlaying ? 'Stop Metronome' : 'Start Metronome'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="fl-btn" onClick={() => st.markChunkMastered(chunk.id, project.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...mono(12, 700), padding: '12px 0', borderRadius: 10, color: chunk.isMastered ? T.green : T.text, background: chunk.isMastered ? T.greenSoft : T.card, border: `1px solid ${chunk.isMastered ? alpha(T.green, 0.3) : T.border}` }}>
                  <Icon name={chunk.isMastered ? 'checkCircleFill' : 'checkCircle'} size={14} color={chunk.isMastered ? T.green : T.text} /> {chunk.isMastered ? 'Mastered' : 'Mark Mastered'}
                </button>
                <button className="fl-btn" onClick={() => st.saveToLickLibrary(chunk, project)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...mono(12, 700), padding: '12px 0', borderRadius: 10, color: chunk.isFavorite ? T.red : T.text, background: chunk.isFavorite ? T.redSoft : T.card, border: `1px solid ${chunk.isFavorite ? alpha(T.red, 0.3) : T.border}` }}>
                  <Icon name={chunk.isFavorite ? 'heartFill' : 'heart'} size={14} color={chunk.isFavorite ? T.red : T.text} /> Save Lick
                </button>
              </div>
              <div style={{ ...mono(10), color: T.textMuted }}>Practiced {chunk.practiceCount} times · Best speed: {chunk.bestTempoPct}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
