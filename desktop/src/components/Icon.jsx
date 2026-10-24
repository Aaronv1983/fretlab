// SF Symbols → Lucide equivalents
import {
  House, Library, Play, ListMusic, CircleCheck, Flame, Guitar, BookOpen, BadgeCheck, Lock, ChevronLeft, ChevronRight,
  ChevronDown, ArrowRight, RotateCw, Metronome, Piano, Brain, Lightbulb, Trophy, CirclePlus, Camera, Keyboard, Image,
  Music, Heart, Hammer, CircleArrowUp, ArrowDownLeft, AudioWaveform, Pointer, Diamond, Hand, Wind, Zap, Square, ScanLine,
  CircleX, Check, HeartHandshake, ClipboardPaste, Trash2,
} from 'lucide-react';

const TuningFork = ({ size = 18, color = 'currentColor', strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2v8a3 3 0 0 0 6 0V2" />
    <path d="M12 13v9" />
    <path d="M10 22h4" />
  </svg>
);

const MAP = {
  house: House, courses: Library, play: Play, listMusic: ListMusic, checkCircle: CircleCheck, flame: Flame, guitar: Guitar,
  book: BookOpen, seal: BadgeCheck, lock: Lock, chevronLeft: ChevronLeft, chevronRight: ChevronRight, chevronDown: ChevronDown,
  arrowRight: ArrowRight, rotate: RotateCw, metronome: Metronome, tuningFork: TuningFork, piano: Piano, brain: Brain,
  lightbulb: Lightbulb, trophy: Trophy, plusCircle: CirclePlus, camera: Camera, keyboard: Keyboard, photo: Image,
  music: Music, heart: Heart, hammer: Hammer, arrowUpCircle: CircleArrowUp, arrowDownLeft: ArrowDownLeft,
  waveform: AudioWaveform, tap: Pointer, diamond: Diamond, hand: Hand, wind: Wind, bolt: Zap, stop: Square,
  viewfinder: ScanLine, xCircle: CircleX, check: Check, heartText: HeartHandshake, paste: ClipboardPaste, trash: Trash2,
};

// SF ".fill" symbols are solid; mimic with a fill for the shapes where it reads well
const FILLED = new Set(['house', 'play', 'flame', 'lock', 'stop', 'heartFill', 'trophy', 'bolt', 'camera', 'hand']);

export default function Icon({ name, size = 16, color = 'currentColor', fill, strokeWidth = 2, style }) {
  if (name === 'heartFill') return <Heart size={size} color={color} fill={color} strokeWidth={strokeWidth} style={style} />;
  if (name === 'checkCircleFill') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        <circle cx="12" cy="12" r="11" fill={color} />
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#0A0A0F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'plusCircleFill') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        <circle cx="12" cy="12" r="11" fill={color} />
        <path d="M12 7v10M7 12h10" stroke="#0A0A0F" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === 'xCircleFill') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        <circle cx="12" cy="12" r="11" fill={color} />
        <path d="M8 8l8 8M16 8l-8 8" stroke="#0A0A0F" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  const C = MAP[name];
  if (!C) return null;
  const doFill = fill ?? FILLED.has(name);
  return <C size={size} color={color} fill={doFill ? color : 'none'} strokeWidth={strokeWidth} style={style} />;
}
