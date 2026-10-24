// Port of ChartComponents.swift
import { T, MONO, alpha, sys } from '../theme.js';

export function SkillRadarChart({ data, size = 220, accentColor = T.accent }) {
  const labels = Object.keys(data).sort();
  const values = labels.map((l) => data[l] || 0);
  const count = labels.length;
  const c = size / 2;
  const radius = size * 0.36;
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    const d = radius * (v / 100);
    return [c + d * Math.cos(a), c + d * Math.sin(a)];
  };
  if (count < 3) return <svg width={size} height={size} />;
  const poly = (v) => labels.map((_, i) => pt(i, typeof v === 'function' ? v(i) : v).join(',')).join(' ');
  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map((lv) => (
        <polygon key={lv} points={poly(lv * 100)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      {labels.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />; })}
      <polygon points={poly((i) => values[i])} fill={alpha(accentColor, 0.12)} stroke={accentColor} strokeWidth={2} strokeLinejoin="round" style={{ transition: 'all .6s' }} />
      {labels.map((_, i) => { const [x, y] = pt(i, values[i]); return <circle key={i} cx={x} cy={y} r={3} fill={accentColor} />; })}
      {labels.map((l, i) => { const [x, y] = pt(i, 120); return <text key={l} x={x} y={y} fill={T.textSecondary} fontFamily={MONO} fontWeight={500} fontSize={9} textAnchor="middle" dominantBaseline="central">{l}</text>; })}
    </svg>
  );
}

export function ProgressRing({ progress, size = 56, lineWidth = 5, color = T.accent, showLabel = true }) {
  const p = Math.max(0, Math.min(1, progress));
  const r = size / 2 - lineWidth / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={lineWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={lineWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - p)} style={{ transition: 'stroke-dashoffset .8s ease-in-out', opacity: p > 0 ? 1 : 0 }} />
      </svg>
      {showLabel && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 700, fontSize: size * 0.22, color: T.text }}>
          {Math.trunc(progress * 100)}%
        </div>
      )}
    </div>
  );
}

export function StreakBadge({ count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: T.yellowSoft, borderRadius: 999 }}>
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: T.yellow }}>{count}</span>
    </div>
  );
}

export function SkillBar({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ ...sys(11, 500), color: T.textSecondary }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color }}>{Math.trunc(value)}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ height: 4, borderRadius: 2, background: color, width: `${value}%`, transition: 'width .6s' }} />
      </div>
    </div>
  );
}
