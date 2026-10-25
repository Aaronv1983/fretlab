// Port of FLTheme.swift
// Guitar Pro–inspired palette: charcoal panels, GP red accent, GP blue selection, white score paper
export const T = {
  bg: '#313338',
  sidebar: '#25272B',
  card: '#3B3E44',
  cardHover: '#45484F',

  accent: '#E8312A',
  accentSoft: 'rgba(232,49,42,0.16)',
  accentGlow: 'rgba(232,49,42,0.32)',

  green: '#43C08A',
  greenSoft: 'rgba(67,192,138,0.15)',
  blue: '#4E9BF5',
  blueSoft: 'rgba(78,155,245,0.15)',
  purple: '#9D8DF7',
  purpleSoft: 'rgba(157,141,247,0.15)',
  yellow: '#F0C246',
  yellowSoft: 'rgba(240,194,70,0.14)',
  red: '#FF6B66',
  redSoft: 'rgba(255,107,102,0.15)',

  text: '#EDEDED',
  textSecondary: '#A9ADB4',
  textMuted: '#71767E',

  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.13)',

  cardRadius: 8,
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
