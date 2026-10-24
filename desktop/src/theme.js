// Port of FLTheme.swift
export const T = {
  bg: '#0A0A0F',
  card: '#141420',
  cardHover: '#1A1A2E',

  accent: '#FF6B35',
  accentSoft: 'rgba(255,107,53,0.12)',
  accentGlow: 'rgba(255,107,53,0.25)',

  green: '#34D399',
  greenSoft: 'rgba(52,211,153,0.12)',
  blue: '#60A5FA',
  blueSoft: 'rgba(96,165,250,0.12)',
  purple: '#A78BFA',
  purpleSoft: 'rgba(167,139,250,0.12)',
  yellow: '#FBBF24',
  yellowSoft: 'rgba(251,191,36,0.12)',
  red: '#F87171',
  redSoft: 'rgba(248,113,113,0.12)',

  text: '#F0F0F8',
  textSecondary: '#8585A0',
  textMuted: '#4A4A62',

  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',

  cardRadius: 14,
  cardPadding: 16,
};

export const MONO = "ui-monospace, 'SF Mono', 'Cascadia Mono', 'Cascadia Code', Consolas, 'Courier New', monospace";
export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif";

// Desktop text scale (iOS point sizes read small at desktop viewing distance)
export const UI_SCALE = 1.15;

// FLTheme.mono(size, weight)
export const mono = (size, weight = 400) => ({ fontFamily: MONO, fontSize: Math.round(size * UI_SCALE * 10) / 10, fontWeight: weight });
export const sys = (size, weight = 400) => ({ fontFamily: SANS, fontSize: Math.round(size * UI_SCALE * 10) / 10, fontWeight: weight });

// SwiftUI Font.Weight → CSS
export const W = { regular: 400, medium: 500, semibold: 600, bold: 700, heavy: 800, light: 300 };

// Hex color + opacity helper (Color.opacity)
export function alpha(hex, a) {
  if (hex.startsWith('rgba')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const courseColor = (level) => ({ foundation: T.green, intermediate: T.blue, advanced: T.purple }[level]);

export const LEVEL_NAME = { foundation: 'Foundation', intermediate: 'Intermediate', advanced: 'Advanced' };

export const SKILL_NAME = {
  rhythm: 'Rhythm', picking: 'Picking', cagedScales: 'Scales', chordVocabulary: 'Chords', triadMastery: 'Triads',
  legato: 'Legato', fretboardFluency: 'Fretboard', intervalKnowledge: 'Intervals', keyScaleTheory: 'Theory',
  modalKnowledge: 'Modes', earTraining: 'Ear', chordProgressionTheory: 'Progressions',
};
export const SKILL_THREADS = Object.keys(SKILL_NAME);

export const BLOCK = {
  warmUp: { name: 'Warm Up', icon: 'flame' },
  corePractice: { name: 'Core Practice', icon: 'guitar' },
  scaleApplication: { name: 'Scale Patterns', icon: 'listMusic' },
  theory: { name: 'Theory', icon: 'book' },
  checkpoint: { name: 'Checkpoint', icon: 'seal' },
};

export const blockColor = (type) => ({
  warmUp: T.yellow, corePractice: T.accent, scaleApplication: T.green, theory: T.blue, checkpoint: T.purple,
}[type]);
