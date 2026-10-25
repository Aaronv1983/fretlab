// Port of FretboardView.swift (display + interactive quiz mode)
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { T, MONO, alpha, sys } from '../theme.js';
import { useStore } from '../store.jsx';

// Left-handed: mirror the whole diagram, then un-mirror each label so it stays readable
function useMirror(width) {
  const lefty = !!useStore()?.settings?.leftHanded;
  return {
    lefty,
    group: lefty ? `matrix(-1 0 0 1 ${width} 0)` : undefined,
    flip: (x) => (lefty ? `translate(${2 * x} 0) scale(-1 1)` : undefined),
  };
}

export function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setW(ref.current.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const HL = { accent: T.accent, green: T.green, blue: T.blue, yellow: T.yellow, purple: T.purple };
const highlightColor = (color, isRoot) => (isRoot ? T.accent : HL[color] || T.accent);

const boxStyle = {
  padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${T.border}`,
};

// ── Display mode ──
export function FretboardView({ diagram }) {
  const [ref, width] = useWidth();
  const mir = useMirror(width);
  // Desktop: scale the diagram up as it gets wider (1.0 at phone width)
  const k = Math.max(1, Math.min(1.45, width / 400));
  const stringNames = ['E', 'B', 'G', 'D', 'A', 'E'];
  const stringLabelWidth = 22 * k;
  const fretNumberHeight = 18 * k;
  const dotSize = 24 * k;
  const stringSpacing = 28 * k;
  const fretCount = diagram.endFret - diagram.startFret + 1;
  const totalWidth = Math.max(0, width - stringLabelWidth);
  const fretWidth = totalWidth / fretCount;
  const totalHeight = stringSpacing * 5 + fretNumberHeight + 8;
  const originX = stringLabelWidth;
  const originY = 8 * k;
  const markerFrets = [3, 5, 7, 9, 12, 15, 17, 19, 21];

  const els = [];
  if (width > 0) {
    for (let f = 0; f <= fretCount; f++) {
      const x = originX + f * fretWidth;
      const nut = f === 0 && diagram.startFret === 0;
      els.push(<line key={`f${f}`} x1={x} y1={originY} x2={x} y2={originY + stringSpacing * 5} stroke={`rgba(255,255,255,${nut ? 0.4 : 0.08})`} strokeWidth={nut ? 3 : 1} />);
    }
    for (let s = 0; s < 6; s++) {
      const y = originY + s * stringSpacing;
      const th = s < 2 ? 1 : s < 4 ? 1.5 : 2;
      els.push(<line key={`s${s}`} x1={originX} y1={y} x2={originX + totalWidth} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth={th} />);
    }
    for (let fret = diagram.startFret; fret <= diagram.endFret; fret++) {
      if (!markerFrets.includes(fret)) continue;
      const x = originX + (fret - diagram.startFret + 0.5) * fretWidth;
      const my = originY + 2.5 * stringSpacing;
      if (fret === 12) {
        els.push(<circle key={`m${fret}a`} cx={x} cy={my - stringSpacing} r={3 * k} fill="rgba(255,255,255,0.06)" />);
        els.push(<circle key={`m${fret}b`} cx={x} cy={my + stringSpacing} r={3 * k} fill="rgba(255,255,255,0.06)" />);
      } else {
        els.push(<circle key={`m${fret}`} cx={x} cy={my} r={3 * k} fill="rgba(255,255,255,0.06)" />);
      }
    }
    for (let f = 0; f < fretCount; f++) {
      const n = diagram.startFret + f;
      if (n > 0) {
        els.push(<text key={`n${f}`} x={originX + (f + 0.5) * fretWidth} transform={mir.flip(originX + (f + 0.5) * fretWidth)} y={originY + stringSpacing * 5 + 12 * k} fill={T.textMuted} fontFamily={MONO} fontSize={9 * k} textAnchor="middle" dominantBaseline="central">{n}</text>);
      }
    }
    for (let s = 0; s < 6; s++) {
      els.push(<text key={`l${s}`} x={10 * k} transform={mir.flip(10 * k)} y={originY + s * stringSpacing} fill={T.textMuted} fontFamily={MONO} fontSize={9 * k} textAnchor="middle" dominantBaseline="central">{stringNames[s]}</text>);
    }
    diagram.highlights.forEach((hl, i) => {
      const fi = hl.fret - diagram.startFret;
      if (fi < 0 || fi >= fretCount) return;
      const x = hl.fret === 0 ? originX - 2 * k : originX + (fi + 0.5) * fretWidth;
      const y = originY + hl.string * stringSpacing;
      const color = highlightColor(hl.color, hl.isRoot);
      if (hl.isRoot) els.push(<circle key={`g${i}`} cx={x} cy={y} r={dotSize / 2 + 4 * k} fill={alpha(color, 0.2)} />);
      els.push(<circle key={`d${i}`} cx={x} cy={y} r={dotSize / 2} fill={color} />);
      if (hl.label) {
        els.push(<text key={`t${i}`} x={x} y={y} transform={mir.flip(x)} fill="#000" fontFamily={MONO} fontWeight={800} fontSize={(hl.label.length > 2 ? 7 : 9) * k} textAnchor="middle" dominantBaseline="central">{hl.label}</text>);
      }
    });
  }

  return (
    <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {diagram.title ? <div style={{ ...sys(12, 700), color: T.text, textAlign: 'center' }}>{diagram.title}</div> : null}
      {diagram.subtitle != null ? <div style={{ ...sys(10), color: T.textSecondary, textAlign: 'center' }}>{diagram.subtitle}</div> : null}
      <div ref={ref} style={{ width: '100%', height: totalHeight + 14 * k }}>
        <div style={{ position: 'relative', height: totalHeight, borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
          <svg width={width} height={totalHeight} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}><g transform={mir.group}>{els}</g></svg>
        </div>
      </div>
    </div>
  );
}

// ── Interactive quiz mode ──
export function InteractiveFretboard({ targetString, targetFret, targetNote, onAnswer }) {
  const [ref, width] = useWidth();
  const mir = useMirror(width);
  const [tapped, setTapped] = useState(null);
  const answeredRef = useRef(false);
  const stringNames = ['e', 'B', 'G', 'D', 'A', 'E'];
  const startFret = 0, endFret = 12;
  const fretCount = endFret - startFret + 1;
  const k = Math.max(1, Math.min(1.6, width / 400));
  const labelWidth = 20 * k;
  const totalWidth = Math.max(0, width - labelWidth);
  const fretWidth = totalWidth / fretCount;
  const stringSpacing = 30 * k;
  const originX = labelWidth, originY = 10 * k;
  const stringDisplayName = ['high E', 'B', 'G', 'D', 'A', 'low E'][targetString] || '';

  useEffect(() => { setTapped(null); answeredRef.current = false; }, [targetString, targetFret, targetNote]);

  const handleTap = (s, f) => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setTapped({ s, f });
    const correct = s === targetString && f === targetFret;
    setTimeout(() => onAnswer(correct), 1000);
  };

  const els = [];
  if (width > 0) {
    for (let f = 0; f <= fretCount; f++) {
      const x = originX + f * fretWidth;
      els.push(<line key={`f${f}`} x1={x} y1={originY} x2={x} y2={originY + stringSpacing * 5} stroke={`rgba(255,255,255,${f === 0 ? 0.4 : 0.06})`} strokeWidth={f === 0 ? 3 : 1} />);
    }
    for (let s = 0; s < 6; s++) {
      const y = originY + s * stringSpacing;
      els.push(<line key={`s${s}`} x1={originX} y1={y} x2={originX + totalWidth} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth={s < 2 ? 1 : s < 4 ? 1.5 : 2} />);
      els.push(<text key={`l${s}`} x={8 * k} transform={mir.flip(8 * k)} y={y} fill={T.textMuted} fontFamily={MONO} fontSize={8 * k} textAnchor="middle" dominantBaseline="central">{stringNames[s]}</text>);
    }
    // Fret numbers: each column is labeled with the fret it represents (open column unlabeled)
    for (let f = 1; f < fretCount; f++) {
      els.push(<text key={`n${f}`} x={labelWidth + (f + 0.5) * fretWidth} transform={mir.flip(labelWidth + (f + 0.5) * fretWidth)} y={originY + stringSpacing * 5 + 14 * k} fill={T.textMuted} fontFamily={MONO} fontSize={7 * k} textAnchor="middle" dominantBaseline="central">{startFret + f}</text>);
    }
    for (let s = 0; s < 6; s++) {
      for (let f = 0; f < fretCount; f++) {
        const x = labelWidth + (f + 0.5) * fretWidth;
        const y = originY + s * stringSpacing;
        els.push(<rect key={`z${s}-${f}`} x={x - fretWidth / 2} y={y - stringSpacing / 2} width={fretWidth} height={stringSpacing} fill="transparent" style={{ cursor: tapped ? 'default' : 'pointer' }} onClick={() => handleTap(s, startFret + f)} />);
      }
    }
  }

  const dot = (key, f, s, color, label, fontSize) => {
    const x = labelWidth + (f - startFret + 0.5) * fretWidth;
    const y = originY + s * stringSpacing;
    return (
      <g key={key} style={{ pointerEvents: 'none' }}>
        <circle cx={x} cy={y} r={14 * k} fill={alpha(color, 0.35)} filter="url(#fl-blur)" />
        <circle cx={x} cy={y} r={12 * k} fill={color} />
        <text x={x} y={y} transform={mir.flip(x)} fill="#000" fontFamily={label.length > 1 && fontSize === 8 ? MONO : undefined} fontWeight={800} fontSize={fontSize * k} textAnchor="middle" dominantBaseline="central">{label}</text>
      </g>
    );
  };

  const correct = tapped && tapped.s === targetString && tapped.f === targetFret;

  return (
    <div style={{ ...boxStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ ...sys(13), color: T.textSecondary }}>Find</span>
        <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: T.accent }}>{targetNote}</span>
        <span style={{ ...sys(13), color: T.textSecondary }}>on the {stringDisplayName} string</span>
      </div>
      <div ref={ref} style={{ width: '100%', height: stringSpacing * 5 + 36 * k + 12 }}>
        <div style={{ position: 'relative', height: stringSpacing * 5 + 36 * k, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>
          <svg width={width} height={stringSpacing * 5 + 36 * k} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs><filter id="fl-blur"><feGaussianBlur stdDeviation="3" /></filter></defs>
            <g transform={mir.group}>
              {els}
              {tapped && dot('tap', tapped.f, tapped.s, correct ? T.green : T.red, correct ? '✓' : '✗', 11)}
              {tapped && !correct && dot('ans', targetFret, targetString, T.green, targetNote, 8)}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
