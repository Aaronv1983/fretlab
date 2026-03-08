import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "guitar_practice_state";

// ─── Spaced Repetition (SM-2 simplified) ───
function nextReview(item, quality) {
  let { interval = 1, easeFactor = 2.5, repetitions = 0 } = item;
  if (quality >= 3) {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * easeFactor);
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  } else {
    repetitions = 0;
    interval = 1;
  }
  return { ...item, interval, easeFactor, repetitions, lastReview: Date.now(), nextDue: Date.now() + interval * 86400000 };
}

// ─── Default Exercise Library ───
const DEFAULT_EXERCISES = [
  { id: "ex1", name: "Chromatic Warm-Up", category: "technique", description: "1-2-3-4 across all strings, ascending and descending", targetBPM: 120, currentBPM: 60 },
  { id: "ex2", name: "Major Scale (All Positions)", category: "scales", description: "Play through all 5 CAGED positions in the key of your choice", targetBPM: 100, currentBPM: 50 },
  { id: "ex3", name: "Minor Pentatonic Box Shapes", category: "scales", description: "All 5 box shapes, connected runs up and down the neck", targetBPM: 110, currentBPM: 55 },
  { id: "ex4", name: "Open Chord Transitions", category: "chords", description: "G-C-D-Em-Am, 4 beats each, clean transitions", targetBPM: 90, currentBPM: 50 },
  { id: "ex5", name: "Barre Chord Circuit", category: "chords", description: "F-Bm-Bb-C#m, hold each 4 beats, check each string rings clean", targetBPM: 80, currentBPM: 40 },
  { id: "ex6", name: "Fingerpicking Pattern (Travis Pick)", category: "fingerstyle", description: "Thumb alternates bass, fingers pick melody on top", targetBPM: 80, currentBPM: 40 },
  { id: "ex7", name: "Interval Recognition", category: "ear", description: "Play two notes, identify the interval. Start with 3rds and 5ths", targetBPM: 0, currentBPM: 0 },
  { id: "ex8", name: "Chord Tone Soloing", category: "improvisation", description: "Solo over a ii-V-I backing, target chord tones on beat 1", targetBPM: 90, currentBPM: 50 },
  { id: "ex9", name: "Rhythm Accuracy Drill", category: "rhythm", description: "8th notes, 16th notes, triplets — stay locked to the click", targetBPM: 100, currentBPM: 60 },
  { id: "ex10", name: "String Skipping Arpeggios", category: "technique", description: "Arpeggio patterns skipping strings for accuracy and stretch", targetBPM: 100, currentBPM: 50 },
];

const CATEGORIES = {
  technique: { label: "Technique", color: "#E8453C" },
  scales: { label: "Scales", color: "#D4A017" },
  chords: { label: "Chords", color: "#2E8B57" },
  fingerstyle: { label: "Fingerstyle", color: "#4682B4" },
  ear: { label: "Ear Training", color: "#9B59B6" },
  improvisation: { label: "Improvisation", color: "#E67E22" },
  rhythm: { label: "Rhythm", color: "#1ABC9C" },
};

const RATINGS = [
  { value: 0, label: "Blackout", desc: "Couldn't do it" },
  { value: 1, label: "Rough", desc: "Barely got through" },
  { value: 2, label: "Shaky", desc: "Major hesitations" },
  { value: 3, label: "Decent", desc: "Got through with effort" },
  { value: 4, label: "Solid", desc: "Minor mistakes" },
  { value: 5, label: "Locked In", desc: "Nailed it" },
];

// ═══════════════════════════════════════════════════════════════
// SCALE DATABASE
// Each scale stores patterns as fret numbers per string [e,B,G,D,A,E]
// baseFret = starting position. Transpose by adding semitones for key.
// ═══════════════════════════════════════════════════════════════

const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

const SCALE_PATTERNS = {
  major: {
    name: "Major (Ionian)",
    formula: "1 2 3 4 5 6 7",
    positions: {
      "Position 1 (E shape)": {
        baseFret: 0,
        tab: [[0,1,3],[0,1,3],[0,2],[0,2,3],[0,2,3],[0,1,3]]
      },
      "Position 2 (D shape)": {
        baseFret: 2,
        tab: [[0,2,3],[0,2,3],[0,2,4],[0,2,4],[0,2],[0,2,3]]
      },
      "Position 3 (C shape)": {
        baseFret: 4,
        tab: [[0,1,3],[0,1,3],[0,1,3],[0,2,4],[0,2,4],[0,1]]
      },
      "Position 4 (A shape)": {
        baseFret: 5,
        tab: [[0,2,3],[0,2],[0,2,4],[0,2,3],[0,2,4],[0,2,3]]
      },
      "Position 5 (G shape)": {
        baseFret: 7,
        tab: [[0,2],[0,2,3],[0,2,4],[0,2],[0,2,3],[0,2]]
      },
    }
  },
  natural_minor: {
    name: "Natural Minor (Aeolian)",
    formula: "1 2 ♭3 4 5 ♭6 ♭7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,3],[0,1,3],[0,2,3],[0,1,3],[0,1,3],[0,1,3]]
      },
      "Position 2": {
        baseFret: 2,
        tab: [[0,2,3],[0,2,3],[0,1,3],[0,2,3],[0,2,3],[0,2,3]]
      },
      "Position 3": {
        baseFret: 3,
        tab: [[0,2,3],[0,2],[0,2,3],[0,2],[0,2,3],[0,2,3]]
      },
      "Position 4": {
        baseFret: 5,
        tab: [[0,1,3],[0,1,3],[0,2,3],[0,2,3],[0,1,3],[0,1,3]]
      },
      "Position 5": {
        baseFret: 7,
        tab: [[0,2,3],[0,2,3],[0,2],[0,2,3],[0,2,3],[0,2]]
      },
    }
  },
  minor_pentatonic: {
    name: "Minor Pentatonic",
    formula: "1 ♭3 4 5 ♭7",
    positions: {
      "Box 1 (Root)": {
        baseFret: 0,
        tab: [[0,3],[0,3],[0,2],[0,2],[0,2],[0,3]]
      },
      "Box 2": {
        baseFret: 3,
        tab: [[0,2],[0,2],[0,2],[0,2],[0,2],[0,2]]
      },
      "Box 3": {
        baseFret: 5,
        tab: [[0,2],[0,3],[0,2],[0,2],[0,2],[0,2]]
      },
      "Box 4": {
        baseFret: 7,
        tab: [[0,3],[0,2],[0,2],[0,2],[0,3],[0,3]]
      },
      "Box 5": {
        baseFret: 10,
        tab: [[0,2],[0,2],[0,2],[0,3],[0,2],[0,2]]
      },
    }
  },
  major_pentatonic: {
    name: "Major Pentatonic",
    formula: "1 2 3 5 6",
    positions: {
      "Box 1 (Root)": {
        baseFret: 0,
        tab: [[0,2],[0,2],[0,2],[0,2],[0,2],[0,2]]
      },
      "Box 2": {
        baseFret: 2,
        tab: [[0,2],[0,2],[0,2],[0,2],[0,3],[0,2]]
      },
      "Box 3": {
        baseFret: 4,
        tab: [[0,3],[0,2],[0,2],[0,2],[0,2],[0,3]]
      },
      "Box 4": {
        baseFret: 7,
        tab: [[0,2],[0,2],[0,2],[0,2],[0,2],[0,2]]
      },
      "Box 5": {
        baseFret: 9,
        tab: [[0,3],[0,3],[0,2],[0,2],[0,2],[0,3]]
      },
    }
  },
  blues: {
    name: "Blues Scale",
    formula: "1 ♭3 4 ♭5 5 ♭7",
    positions: {
      "Box 1 (Root)": {
        baseFret: 0,
        tab: [[0,3],[0,3],[0,1,2],[0,2],[0,2],[0,3]]
      },
      "Box 2": {
        baseFret: 3,
        tab: [[0,2],[0,1,2],[0,2],[0,2],[0,2],[0,2]]
      },
      "Box 3": {
        baseFret: 5,
        tab: [[0,2],[0,3],[0,1,2],[0,2],[0,2],[0,2]]
      },
      "Box 4": {
        baseFret: 7,
        tab: [[0,3],[0,2],[0,2],[0,1,2],[0,3],[0,3]]
      },
      "Box 5": {
        baseFret: 10,
        tab: [[0,2],[0,2],[0,1,2],[0,3],[0,2],[0,2]]
      },
    }
  },
  harmonic_minor: {
    name: "Harmonic Minor",
    formula: "1 2 ♭3 4 5 ♭6 7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,3],[0,1,4],[0,2,3],[0,1,3],[0,1,3],[0,1,3]]
      },
      "Position 2": {
        baseFret: 2,
        tab: [[0,2,3],[0,3,4],[0,1,3],[0,2,3],[0,2,3],[0,2,3]]
      },
      "Position 3": {
        baseFret: 3,
        tab: [[0,2,4],[0,2],[0,2,3],[0,2],[0,2,3],[0,2,4]]
      },
      "Position 4": {
        baseFret: 5,
        tab: [[0,1,4],[0,1,3],[0,2,3],[0,2,3],[0,1,4],[0,1,3]]
      },
      "Position 5": {
        baseFret: 7,
        tab: [[0,3,4],[0,2,3],[0,2],[0,2,4],[0,2,3],[0,2]]
      },
    }
  },
  melodic_minor: {
    name: "Melodic Minor (Asc)",
    formula: "1 2 ♭3 4 5 6 7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,3],[0,1,3],[0,2,4],[0,1,3],[0,1,3],[0,1,3]]
      },
      "Position 2": {
        baseFret: 2,
        tab: [[0,2,3],[0,2,3],[0,2,4],[0,2,3],[0,2,3],[0,2,3]]
      },
      "Position 3": {
        baseFret: 3,
        tab: [[0,2,4],[0,2],[0,2,3],[0,2,3],[0,2,4],[0,2,3]]
      },
    }
  },
  dorian: {
    name: "Dorian",
    formula: "1 2 ♭3 4 5 6 ♭7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,3],[0,1,3],[0,2,4],[0,1,3],[0,1,3],[0,1,3]]
      },
      "Position 2": {
        baseFret: 2,
        tab: [[0,2,3],[0,2,3],[0,2,3],[0,2,3],[0,2,3],[0,2,3]]
      },
      "Position 3": {
        baseFret: 3,
        tab: [[0,2,3],[0,2],[0,2,3],[0,2,3],[0,2,3],[0,2,3]]
      },
      "Position 4": {
        baseFret: 5,
        tab: [[0,1,3],[0,1,3],[0,2,3],[0,2,4],[0,1,3],[0,1,3]]
      },
      "Position 5": {
        baseFret: 7,
        tab: [[0,2,3],[0,2,3],[0,2],[0,2,3],[0,2,3],[0,2,3]]
      },
    }
  },
  mixolydian: {
    name: "Mixolydian",
    formula: "1 2 3 4 5 6 ♭7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,3],[0,1,3],[0,2],[0,2,3],[0,2,3],[0,1,3]]
      },
      "Position 2": {
        baseFret: 2,
        tab: [[0,2,3],[0,2,3],[0,2,3],[0,2,4],[0,2],[0,2,3]]
      },
      "Position 3": {
        baseFret: 5,
        tab: [[0,2,3],[0,2],[0,2,3],[0,2,3],[0,2,4],[0,2,3]]
      },
      "Position 4": {
        baseFret: 7,
        tab: [[0,2],[0,2,3],[0,2,3],[0,2],[0,2,3],[0,2]]
      },
      "Position 5": {
        baseFret: 9,
        tab: [[0,2,3],[0,1,3],[0,2,4],[0,2,3],[0,1,3],[0,2,3]]
      },
    }
  },
  phrygian: {
    name: "Phrygian",
    formula: "1 ♭2 ♭3 4 5 ♭6 ♭7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,3],[0,1,3],[0,2,3],[0,1,3],[0,1,3],[0,1,3]]
      },
      "Position 2": {
        baseFret: 1,
        tab: [[0,2,4],[0,2,4],[0,1,3],[0,2,4],[0,2,4],[0,2,4]]
      },
      "Position 3": {
        baseFret: 3,
        tab: [[0,2,3],[0,2],[0,2,3],[0,2,3],[0,2,3],[0,2,3]]
      },
      "Position 4": {
        baseFret: 5,
        tab: [[0,1,3],[0,1,3],[0,1,3],[0,2,3],[0,1,3],[0,1,3]]
      },
      "Position 5": {
        baseFret: 7,
        tab: [[0,2,3],[0,2,3],[0,2,3],[0,1,3],[0,2,3],[0,2,3]]
      },
    }
  },
  lydian: {
    name: "Lydian",
    formula: "1 2 3 ♯4 5 6 7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,2,4],[0,2,3],[0,1,3],[0,2,4],[0,2,3],[0,2,4]]
      },
      "Position 2": {
        baseFret: 2,
        tab: [[0,2,3],[0,2],[0,2,4],[0,2,3],[0,2],[0,2,3]]
      },
      "Position 3": {
        baseFret: 4,
        tab: [[0,1,3],[0,1,3],[0,2],[0,2,3],[0,2,4],[0,1,3]]
      },
    }
  },
  locrian: {
    name: "Locrian",
    formula: "1 ♭2 ♭3 4 ♭5 ♭6 ♭7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,3],[0,1,3],[0,1,3],[0,1,3],[0,1,3],[0,1,3]]
      },
      "Position 2": {
        baseFret: 1,
        tab: [[0,2,4],[0,2,4],[0,2,4],[0,2,4],[0,2,4],[0,2,4]]
      },
      "Position 3": {
        baseFret: 3,
        tab: [[0,2,3],[0,2,3],[0,2,3],[0,2,3],[0,2,3],[0,2,3]]
      },
    }
  },
  whole_tone: {
    name: "Whole Tone",
    formula: "1 2 3 ♯4 ♯5 ♭7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,2,4],[0,2,4],[0,2],[0,2,4],[0,2,4],[0,2,4]]
      },
      "Position 2": {
        baseFret: 2,
        tab: [[0,2,4],[0,2],[0,2,4],[0,2,4],[0,2,4],[0,2,4]]
      },
    }
  },
  phrygian_dominant: {
    name: "Phrygian Dominant",
    formula: "1 ♭2 3 4 5 ♭6 ♭7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,4],[0,1,3],[0,2,3],[0,1,4],[0,1,3],[0,1,4]]
      },
      "Position 2": {
        baseFret: 1,
        tab: [[0,3,4],[0,2,4],[0,1,3],[0,3,4],[0,2,4],[0,3,4]]
      },
      "Position 3": {
        baseFret: 4,
        tab: [[0,1,3],[0,2],[0,2,3],[0,1,3],[0,2],[0,1,3]]
      },
    }
  },
  diminished_hw: {
    name: "Diminished (H-W)",
    formula: "1 ♭2 ♭3 3 ♯4 5 6 ♭7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,1,2,4],[0,1,2,4],[0,1,3,4],[0,1,2,4],[0,1,2,4],[0,1,2,4]]
      },
    }
  },
  diminished_wh: {
    name: "Diminished (W-H)",
    formula: "1 2 ♭3 4 ♭5 ♭6 6 7",
    positions: {
      "Position 1": {
        baseFret: 0,
        tab: [[0,2,3,5],[0,2,3,5],[0,2,3,4],[0,2,3,5],[0,2,3,5],[0,2,3,5]]
      },
    }
  },
};

const SCALE_GROUPS = {
  "Essential": ["major", "natural_minor", "minor_pentatonic", "major_pentatonic", "blues"],
  "Modes": ["dorian", "phrygian", "lydian", "mixolydian", "locrian"],
  "Harmonic / Melodic": ["harmonic_minor", "melodic_minor"],
  "Exotic / Symmetric": ["whole_tone", "phrygian_dominant", "diminished_hw", "diminished_wh"],
};

// ═══════════════════════════════════════════════════════════════
// CHORD DATABASE
// Each chord: frets [E,A,D,G,B,e] where -1 = muted, 0 = open
// fingers [E,A,D,G,B,e] where 0 = open/muted, 1-4 = finger
// barreeFret: if barre chord, the fret of the barre
// Multiple voicings per chord type, stored at C root then transposed
// ═══════════════════════════════════════════════════════════════

const CHORD_TYPES = {
  major: {
    name: "Major",
    symbol: "",
    formula: "1 3 5",
    voicings: {
      "Open (C shape)": { frets: [null,3,2,0,1,0], fingers: [0,3,2,0,1,0], baseFret: 0, rootString: 1 },
      "E Barre Shape": { frets: [null,3,5,5,5,3], fingers: [0,1,2,3,4,1], baseFret: 3, barre: 3, rootString: 1 },
      "A Barre Shape": { frets: [null,null,null,5,5,5], fingers: [0,0,0,2,3,4], baseFret: 3, rootString: 3, partial: true },
    }
  },
  minor: {
    name: "Minor",
    symbol: "m",
    formula: "1 ♭3 5",
    voicings: {
      "Open (Am shape)": { frets: [null,3,5,5,4,3], fingers: [0,1,3,4,2,1], baseFret: 3, barre: 3, rootString: 1 },
      "Em Barre Shape": { frets: [null,null,5,5,4,3], fingers: [0,0,3,4,2,1], baseFret: 3, rootString: 2 },
      "Open (Cm shape)": { frets: [null,3,1,0,1,0], fingers: [0,3,1,0,2,0], baseFret: 0, rootString: 1 },
    }
  },
  dom7: {
    name: "Dominant 7",
    symbol: "7",
    formula: "1 3 5 ♭7",
    voicings: {
      "Open (C7 shape)": { frets: [null,3,2,3,1,0], fingers: [0,3,2,4,1,0], baseFret: 0, rootString: 1 },
      "E7 Barre Shape": { frets: [null,3,5,3,5,3], fingers: [0,1,3,1,4,1], baseFret: 3, barre: 3, rootString: 1 },
      "A7 Barre Shape": { frets: [null,null,null,5,5,6], fingers: [0,0,0,1,1,2], baseFret: 5, rootString: 3 },
    }
  },
  maj7: {
    name: "Major 7",
    symbol: "maj7",
    formula: "1 3 5 7",
    voicings: {
      "Open (Cmaj7 shape)": { frets: [null,3,2,0,0,0], fingers: [0,3,2,0,0,0], baseFret: 0, rootString: 1 },
      "A Shape Barre": { frets: [null,3,5,4,5,3], fingers: [0,1,3,2,4,1], baseFret: 3, barre: 3, rootString: 1 },
      "Compact Voicing": { frets: [null,null,5,4,5,3], fingers: [0,0,3,2,4,1], baseFret: 3, rootString: 2 },
    }
  },
  min7: {
    name: "Minor 7",
    symbol: "m7",
    formula: "1 ♭3 5 ♭7",
    voicings: {
      "Am7 Barre Shape": { frets: [null,3,5,3,4,3], fingers: [0,1,3,1,2,1], baseFret: 3, barre: 3, rootString: 1 },
      "Em7 Barre Shape": { frets: [null,null,5,3,4,3], fingers: [0,0,4,1,2,1], baseFret: 3, rootString: 2 },
      "Open (Cm7 shape)": { frets: [null,3,1,3,1,0], fingers: [0,2,1,3,1,0], baseFret: 0, rootString: 1 },
    }
  },
  dim: {
    name: "Diminished",
    symbol: "dim",
    formula: "1 ♭3 ♭5",
    voicings: {
      "Position 1": { frets: [null,3,4,2,4,null], fingers: [0,2,3,1,4,0], baseFret: 2, rootString: 1 },
      "Position 2": { frets: [null,null,5,3,4,null], fingers: [0,0,3,1,2,0], baseFret: 3, rootString: 2 },
    }
  },
  aug: {
    name: "Augmented",
    symbol: "aug",
    formula: "1 3 ♯5",
    voicings: {
      "Position 1": { frets: [null,3,2,1,1,null], fingers: [0,4,3,1,2,0], baseFret: 0, rootString: 1 },
      "Position 2": { frets: [null,null,null,5,5,4], fingers: [0,0,0,2,3,1], baseFret: 4, rootString: 3 },
    }
  },
  sus2: {
    name: "Suspended 2",
    symbol: "sus2",
    formula: "1 2 5",
    voicings: {
      "Open (Csus2 shape)": { frets: [null,3,0,0,1,0], fingers: [0,3,0,0,1,0], baseFret: 0, rootString: 1 },
      "Barre Shape": { frets: [null,3,5,5,3,3], fingers: [0,1,3,4,1,1], baseFret: 3, barre: 3, rootString: 1 },
    }
  },
  sus4: {
    name: "Suspended 4",
    symbol: "sus4",
    formula: "1 4 5",
    voicings: {
      "Open (Csus4 shape)": { frets: [null,3,3,0,1,0], fingers: [0,3,4,0,1,0], baseFret: 0, rootString: 1 },
      "Barre Shape": { frets: [null,3,5,5,6,3], fingers: [0,1,2,3,4,1], baseFret: 3, barre: 3, rootString: 1 },
    }
  },
  dom9: {
    name: "Dominant 9",
    symbol: "9",
    formula: "1 3 5 ♭7 9",
    voicings: {
      "Position 1": { frets: [null,3,2,3,3,0], fingers: [0,2,1,3,4,0], baseFret: 0, rootString: 1 },
      "Compact": { frets: [null,null,null,3,3,4], fingers: [0,0,0,1,2,3], baseFret: 3, rootString: 3 },
    }
  },
  min9: {
    name: "Minor 9",
    symbol: "m9",
    formula: "1 ♭3 5 ♭7 9",
    voicings: {
      "Position 1": { frets: [null,3,1,3,3,0], fingers: [0,2,1,3,4,0], baseFret: 0, rootString: 1 },
      "Compact": { frets: [null,null,null,3,4,3], fingers: [0,0,0,1,3,2], baseFret: 3, rootString: 3 },
    }
  },
  dim7: {
    name: "Diminished 7",
    symbol: "dim7",
    formula: "1 ♭3 ♭5 ♭♭7",
    voicings: {
      "Position 1": { frets: [null,3,4,2,4,2], fingers: [0,2,3,1,4,1], baseFret: 2, rootString: 1 },
      "Position 2": { frets: [null,null,5,3,4,2], fingers: [0,0,4,2,3,1], baseFret: 2, rootString: 2 },
    }
  },
  m7b5: {
    name: "Half-Diminished",
    symbol: "m7♭5",
    formula: "1 ♭3 ♭5 ♭7",
    voicings: {
      "Position 1": { frets: [null,3,4,3,4,null], fingers: [0,1,3,2,4,0], baseFret: 3, rootString: 1 },
      "Position 2": { frets: [null,null,5,3,4,3], fingers: [0,0,4,1,2,1], baseFret: 3, rootString: 2 },
    }
  },
  add9: {
    name: "Add 9",
    symbol: "add9",
    formula: "1 3 5 9",
    voicings: {
      "Open Shape": { frets: [null,3,2,0,3,0], fingers: [0,2,1,0,3,0], baseFret: 0, rootString: 1 },
    }
  },
  power: {
    name: "Power Chord",
    symbol: "5",
    formula: "1 5",
    voicings: {
      "6th String Root": { frets: [null,3,5,null,null,null], fingers: [0,1,3,0,0,0], baseFret: 3, rootString: 1 },
      "5th String Root": { frets: [null,null,3,5,null,null], fingers: [0,0,1,3,0,0], baseFret: 3, rootString: 2 },
      "6th + Octave": { frets: [null,3,5,5,null,null], fingers: [0,1,3,4,0,0], baseFret: 3, rootString: 1 },
    }
  },
  dom7sharp9: {
    name: "7♯9 (Hendrix)",
    symbol: "7♯9",
    formula: "1 3 5 ♭7 ♯9",
    voicings: {
      "E Shape": { frets: [null,3,2,3,3,4], fingers: [0,2,1,3,3,4], baseFret: 0, rootString: 1 },
    }
  },
  maj9: {
    name: "Major 9",
    symbol: "maj9",
    formula: "1 3 5 7 9",
    voicings: {
      "Open Shape": { frets: [null,3,2,0,0,0], fingers: [0,2,1,0,0,0], baseFret: 0, rootString: 1 },
      "Compact": { frets: [null,null,null,4,5,3], fingers: [0,0,0,2,3,1], baseFret: 3, rootString: 3 },
    }
  },
  "6": {
    name: "Major 6",
    symbol: "6",
    formula: "1 3 5 6",
    voicings: {
      "Open Shape": { frets: [null,3,2,2,1,0], fingers: [0,4,2,3,1,0], baseFret: 0, rootString: 1 },
      "Barre Shape": { frets: [null,3,5,5,5,5], fingers: [0,1,2,3,3,3], baseFret: 3, rootString: 1 },
    }
  },
  min6: {
    name: "Minor 6",
    symbol: "m6",
    formula: "1 ♭3 5 6",
    voicings: {
      "Position 1": { frets: [null,3,1,2,1,0], fingers: [0,4,1,3,2,0], baseFret: 0, rootString: 1 },
      "Barre Shape": { frets: [null,3,5,5,4,5], fingers: [0,1,2,3,1,4], baseFret: 3, rootString: 1 },
    }
  },
};

const CHORD_GROUPS = {
  "Triads": ["major","minor","dim","aug","power"],
  "7th Chords": ["dom7","maj7","min7","dim7","m7b5"],
  "Suspended": ["sus2","sus4"],
  "Extended": ["dom9","min9","maj9","add9"],
  "Color / Other": ["6","min6","dom7sharp9"],
};

// Transpose chord: shift all non-null/non-zero frets by semitone offset
function transposeChord(voicing, semitones) {
  if (semitones === 0) return voicing;
  return {
    ...voicing,
    frets: voicing.frets.map(f => {
      if (f === null) return null;
      if (f === 0) return f + semitones; // open strings become fretted
      return f + semitones;
    }),
    baseFret: voicing.baseFret + semitones,
    barre: voicing.barre ? voicing.barre + semitones : undefined,
  };
}

// ═══════════════════════════════════════
// CHORD DIAGRAM (box-style)
// ═══════════════════════════════════════
function ChordDiagram({ voicing, chordName, size = "normal" }) {
  const { frets, fingers, barre } = voicing;
  // frets: [E, A, D, G, B, e] — null = muted
  const activeFrets = frets.filter(f => f !== null && f > 0);
  const minFret = activeFrets.length > 0 ? Math.min(...activeFrets) : 1;
  const maxFret = activeFrets.length > 0 ? Math.max(...activeFrets) : 1;

  // Determine if we show from fret 1 (open position) or from a higher fret
  const span = maxFret - minFret;
  let startFret = 1;
  if (minFret > 2 || span > 4) {
    startFret = minFret;
  }
  const numFrets = 5;

  const isCompact = size === "compact";
  const sw = isCompact ? 20 : 28; // string spacing
  const fh = isCompact ? 22 : 30; // fret height
  const padTop = isCompact ? 28 : 36;
  const padLeft = isCompact ? 24 : 32;
  const padBottom = isCompact ? 8 : 12;
  const padRight = isCompact ? 8 : 12;
  const w = padLeft + 5 * sw + padRight;
  const h = padTop + numFrets * fh + padBottom;
  const dotR = isCompact ? 6 : 8;
  const fontSize = isCompact ? 8 : 10;

  return (
    <div style={{ display: "inline-block", verticalAlign: "top" }}>
      <svg width={w} height={h} style={{ display: "block" }}>
        {/* Chord name */}
        <text x={w / 2} y={isCompact ? 12 : 14} fill="#fff" fontSize={isCompact ? 12 : 14} fontWeight={700} textAnchor="middle" fontFamily="monospace">
          {chordName}
        </text>

        {/* Nut (thick line at top if starting at fret 1) */}
        {startFret <= 1 && (
          <line x1={padLeft} y1={padTop} x2={padLeft + 5 * sw} y2={padTop} stroke="#ccc" strokeWidth={3} />
        )}

        {/* Fret position indicator */}
        {startFret > 1 && (
          <text x={padLeft - (isCompact ? 10 : 14)} y={padTop + fh / 2 + 4} fill="#888" fontSize={fontSize} textAnchor="middle" fontFamily="monospace">
            {startFret}
          </text>
        )}

        {/* Fret lines */}
        {Array.from({ length: numFrets + 1 }, (_, i) => (
          <line key={`fl${i}`} x1={padLeft} y1={padTop + i * fh} x2={padLeft + 5 * sw} y2={padTop + i * fh} stroke="#333" strokeWidth={1} />
        ))}

        {/* String lines */}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`sl${i}`} x1={padLeft + i * sw} y1={padTop} x2={padLeft + i * sw} y2={padTop + numFrets * fh} stroke="#444" strokeWidth={i >= 4 ? 1 : i >= 2 ? 1.5 : 2} />
        ))}

        {/* Barre indicator */}
        {barre && barre >= startFret && barre < startFret + numFrets && (
          <rect
            x={padLeft - dotR}
            y={padTop + (barre - startFret) * fh + fh / 2 - dotR / 1.5}
            width={5 * sw + dotR * 2}
            height={dotR * 1.3}
            rx={dotR / 1.5}
            fill="#D4A017"
            opacity={0.7}
          />
        )}

        {/* Muted / Open indicators above nut */}
        {frets.map((f, i) => {
          const x = padLeft + i * sw;
          const y = padTop - (isCompact ? 8 : 10);
          if (f === null) {
            return <text key={`m${i}`} x={x} y={y} fill="#E8453C" fontSize={isCompact ? 10 : 13} textAnchor="middle" fontFamily="monospace">×</text>;
          }
          if (f === 0 || (startFret > 1 && f < startFret)) {
            return <circle key={`o${i}`} cx={x} cy={y - 3} r={isCompact ? 3.5 : 4.5} fill="none" stroke="#2E8B57" strokeWidth={1.5} />;
          }
          return null;
        })}

        {/* Finger dots */}
        {frets.map((f, i) => {
          if (f === null || f === 0) return null;
          if (f < startFret) return null; // open string relative to position
          const x = padLeft + i * sw;
          const relFret = f - startFret;
          const y = padTop + relFret * fh + fh / 2;
          const isRoot = i === (voicing.rootString || 0);
          return (
            <g key={`dot${i}`}>
              <circle cx={x} cy={y} r={dotR} fill={isRoot ? "#E8453C" : "#D4A017"} />
              {fingers && fingers[i] > 0 && (
                <text x={x} y={y + (isCompact ? 3 : 3.5)} fill="#000" fontSize={fontSize} textAnchor="middle" fontWeight={700} fontFamily="monospace">
                  {fingers[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════
// CHORDS VIEW
// ═══════════════════════════════════════
function ChordsView() {
  const [selectedType, setSelectedType] = useState("major");
  const [selectedKey, setSelectedKey] = useState(0); // C default
  const [selectedVoicing, setSelectedVoicing] = useState(null);

  const chordType = CHORD_TYPES[selectedType];
  const voicingNames = Object.keys(chordType.voicings);

  useEffect(() => { setSelectedVoicing(voicingNames[0]); }, [selectedType]);

  const activeVoicing = (selectedVoicing && chordType.voicings[selectedVoicing]) ? selectedVoicing : voicingNames[0];
  const rawVoicing = chordType.voicings[activeVoicing];

  if (!rawVoicing) return <div style={{color:"#555",padding:40,textAlign:"center"}}>Loading...</div>;

  const transposed = transposeChord(rawVoicing, selectedKey);
  const chordLabel = `${NOTES[selectedKey]}${chordType.symbol}`;

  // Generate tab line for chord
  const STRING_LABELS = ["E","A","D","G","B","e"];
  const tabLine = transposed.frets.map((f, i) => {
    if (f === null) return `${STRING_LABELS[i]}|--x--`;
    return `${STRING_LABELS[i]}|--${f}--`;
  });

  return (
    <div>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 4px",color:"#fff"}}>CHORDS</h2>
      <p style={{color:"#555",fontSize:11,margin:"0 0 20px",letterSpacing:1}}>CHORD DIAGRAM REFERENCE</p>

      {/* Chord Type */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:6}}>CHORD TYPE</label>
        {Object.entries(CHORD_GROUPS).map(([group, types])=>(
          <div key={group} style={{marginBottom:8}}>
            <div style={{fontSize:9,color:"#444",letterSpacing:1,marginBottom:4}}>{group.toUpperCase()}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {types.map(t=>(
                <button key={t} onClick={()=>setSelectedType(t)} style={{background:selectedType===t?"rgba(46,139,87,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${selectedType===t?"#2E8B57":"#1a1a1d"}`,color:selectedType===t?"#2E8B57":"#666",padding:"6px 10px",fontSize:11,fontFamily:"inherit",cursor:"pointer",transition:"all 0.15s"}}>
                  {CHORD_TYPES[t].name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Key */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:6}}>ROOT NOTE</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {NOTES.map((n,i)=>(
            <button key={n} onClick={()=>setSelectedKey(i)} style={{background:selectedKey===i?"rgba(232,69,60,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${selectedKey===i?"#E8453C":"#1a1a1d"}`,color:selectedKey===i?"#E8453C":"#666",padding:"6px 10px",fontSize:12,fontFamily:"inherit",fontWeight:600,cursor:"pointer",minWidth:36,textAlign:"center",transition:"all 0.15s"}}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Formula */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"10px 14px",marginBottom:16}}>
        <span style={{fontSize:10,color:"#555",letterSpacing:1}}>FORMULA: </span>
        <span style={{fontSize:13,color:"#2E8B57",fontWeight:600}}>{chordType.formula}</span>
      </div>

      {/* Voicing selector */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:6}}>VOICING</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {voicingNames.map(v=>(
            <button key={v} onClick={()=>setSelectedVoicing(v)} style={{background:activeVoicing===v?"rgba(212,160,23,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${activeVoicing===v?"#D4A017":"#1a1a1d"}`,color:activeVoicing===v?"#D4A017":"#666",padding:"6px 10px",fontSize:11,fontFamily:"inherit",cursor:"pointer",transition:"all 0.15s"}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Chord Diagram */}
      <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
        <ChordDiagram voicing={transposed} chordName={chordLabel} />
      </div>

      {/* Tab notation */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"16px",fontFamily:"'JetBrains Mono',monospace",fontSize:13,lineHeight:1.8,marginBottom:20}}>
        <div style={{color:"#666",fontSize:10,letterSpacing:1,marginBottom:4}}>TAB</div>
        <div style={{whiteSpace:"pre",color:"#ccc"}}>
          {tabLine.map((line,i)=><div key={i}>{line}</div>)}
        </div>
      </div>

      {/* All voicings */}
      <div>
        <h3 style={{fontSize:11,letterSpacing:2,color:"#555",margin:"0 0 12px"}}>ALL VOICINGS — {chordLabel}</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>
          {voicingNames.map(v => {
            const tv = transposeChord(chordType.voicings[v], selectedKey);
            return (
              <div key={v} style={{cursor:"pointer",opacity:activeVoicing===v?1:0.6,transition:"opacity 0.15s"}} onClick={()=>setSelectedVoicing(v)}>
                <ChordDiagram voicing={tv} chordName={v.length > 16 ? v.slice(0,14)+"…" : v} size="compact" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// KEY DETECTOR — listens to mic, collects notes, suggests key
// ═══════════════════════════════════════
function KeyDetectorView() {
  const [detectedNotes, setDetectedNotes] = useState({}); // { noteName: count }
  const [isListening, setIsListening] = useState(false);
  const [suggestedKeys, setSuggestedKeys] = useState([]);
  const animRef = useRef(null);
  const streamRef = useRef(null);
  const lastNoteRef = useRef(null);
  const lastTimeRef = useRef(0);

  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  // All major keys and their scale notes
  const KEY_SCALES = {};
  const MAJOR_INTERVALS = [0,2,4,5,7,9,11];
  const MINOR_INTERVALS = [0,2,3,5,7,8,10];
  NN.forEach((root, ri) => {
    KEY_SCALES[`${root} Major`] = MAJOR_INTERVALS.map(i => NN[(ri + i) % 12]);
    KEY_SCALES[`${root} Minor`] = MINOR_INTERVALS.map(i => NN[(ri + i) % 12]);
  });

  const autoCorrelate = (buf, sr) => {
    let sz = buf.length, rms = 0;
    for (let i = 0; i < sz; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / sz);
    if (rms < 0.01) return -1;
    let r1 = 0, r2 = sz - 1;
    const th = 0.2;
    for (let i = 0; i < sz / 2; i++) { if (Math.abs(buf[i]) < th) { r1 = i; break; } }
    for (let i = 1; i < sz / 2; i++) { if (Math.abs(buf[sz - i]) < th) { r2 = sz - i; break; } }
    buf = buf.slice(r1, r2); sz = buf.length;
    const c = new Array(sz).fill(0);
    for (let i = 0; i < sz; i++) for (let j = 0; j < sz - i; j++) c[i] += buf[j] * buf[j + i];
    let d = 0; while (c[d] > c[d + 1]) d++;
    let mx = -1, mp = -1;
    for (let i = d; i < sz; i++) { if (c[i] > mx) { mx = c[i]; mp = i; } }
    let t0 = mp;
    const x1 = c[t0 - 1], x2 = c[t0], x3 = c[t0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
    if (a) t0 = t0 - b / (2 * a);
    return sr / t0;
  };

  const analyzeKey = useCallback((notes) => {
    const noteNames = Object.keys(notes);
    if (noteNames.length < 3) return [];

    // Score each key by how many detected notes match
    const scores = Object.entries(KEY_SCALES).map(([keyName, scaleNotes]) => {
      let matchCount = 0;
      let totalWeight = 0;
      noteNames.forEach(n => {
        totalWeight += notes[n];
        if (scaleNotes.includes(n)) matchCount += notes[n];
      });
      return { key: keyName, score: totalWeight > 0 ? matchCount / totalWeight : 0, matchCount };
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, 6);
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);

      const detect = () => {
        an.getFloatTimeDomainData(buf);
        const freq = autoCorrelate(buf, ctx.sampleRate);
        if (freq > 60 && freq < 1500) {
          const noteNum = 12 * (Math.log2(freq / 440)) + 69;
          const rounded = Math.round(noteNum);
          const noteName = NN[((rounded % 12) + 12) % 12];
          const now = Date.now();
          // Debounce: only count if different note or >200ms passed
          if (noteName !== lastNoteRef.current || now - lastTimeRef.current > 200) {
            lastNoteRef.current = noteName;
            lastTimeRef.current = now;
            setDetectedNotes(prev => {
              const updated = { ...prev, [noteName]: (prev[noteName] || 0) + 1 };
              setSuggestedKeys(analyzeKey(updated));
              return updated;
            });
          }
        }
        animRef.current = requestAnimationFrame(detect);
      };
      detect();
      setIsListening(true);
    } catch (e) {
      console.error("Mic denied:", e);
    }
  }, [analyzeKey]);

  const stopListening = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsListening(false);
  }, []);

  const reset = () => {
    setDetectedNotes({});
    setSuggestedKeys([]);
    lastNoteRef.current = null;
  };

  const totalHits = Object.values(detectedNotes).reduce((s, v) => s + v, 0);

  // Manual entry mode
  const [manualNotes, setManualNotes] = useState([]);
  const [mode, setMode] = useState("listen"); // listen | manual

  const toggleManualNote = (n) => {
    setManualNotes(prev => {
      const updated = prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n];
      // Analyze manual notes
      const noteObj = {};
      updated.forEach(nn => noteObj[nn] = 1);
      setSuggestedKeys(analyzeKey(noteObj));
      return updated;
    });
  };

  return (
    <div>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 4px",color:"#fff"}}>KEY FINDER</h2>
      <p style={{color:"#555",fontSize:11,margin:"0 0 20px",letterSpacing:1}}>DETECT THE KEY OF A SONG</p>

      {/* Mode toggle */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {[{key:"listen",label:"🎤 LISTEN"},{key:"manual",label:"✎ MANUAL"}].map(opt=>(
          <button key={opt.key} onClick={()=>{setMode(opt.key);reset();setManualNotes([]);}} style={{flex:1,background:mode===opt.key?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${mode===opt.key?"#333":"#1a1a1d"}`,color:mode===opt.key?"#fff":"#555",padding:"10px",fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:1}}>
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "listen" ? (
        <>
          {/* Mic controls */}
          <div style={{display:"flex",gap:12,marginBottom:20}}>
            <button onClick={()=>isListening?stopListening():startListening()} style={{flex:1,background:isListening?"#E8453C":"rgba(255,255,255,0.05)",border:isListening?"none":"1px solid #333",color:"#fff",padding:"14px",fontSize:14,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:1,transition:"all 0.2s"}}>
              {isListening ? "■  STOP LISTENING" : "●  START LISTENING"}
            </button>
            <button onClick={reset} style={{background:"none",border:"1px solid #333",color:"#666",padding:"14px 16px",fontSize:11,fontFamily:"inherit",cursor:"pointer",letterSpacing:1}}>
              RESET
            </button>
          </div>

          {isListening && (
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#E8453C",display:"inline-block",marginRight:8,animation:"pulse 1s infinite"}}/>
              <span style={{color:"#888",fontSize:12}}>Listening... play the song or strum chords</span>
            </div>
          )}

          {/* Detected notes visualization */}
          {totalHits > 0 && (
            <div style={{marginBottom:20}}>
              <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:8}}>DETECTED NOTES ({totalHits} samples)</label>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {NN.map(n => {
                  const count = detectedNotes[n] || 0;
                  const pct = totalHits > 0 ? count / totalHits : 0;
                  return (
                    <div key={n} style={{textAlign:"center",flex:"1 0 30px",minWidth:30}}>
                      <div style={{height:60,display:"flex",alignItems:"flex-end",justifyContent:"center",marginBottom:4}}>
                        <div style={{width:16,height:`${Math.max(2, pct * 60)}px`,background:count>0?"#D4A017":"#1a1a1d",transition:"height 0.3s"}}/>
                      </div>
                      <div style={{fontSize:10,color:count>0?"#D4A017":"#444",fontWeight:count>0?600:400}}>{n}</div>
                      <div style={{fontSize:8,color:"#444"}}>{count>0?count:""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Manual mode — tap notes you hear */
        <div style={{marginBottom:20}}>
          <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:8}}>TAP THE NOTES YOU HEAR IN THE SONG</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {NN.map(n=>(
              <button key={n} onClick={()=>toggleManualNote(n)} style={{background:manualNotes.includes(n)?"rgba(212,160,23,0.2)":"rgba(255,255,255,0.03)",border:`1px solid ${manualNotes.includes(n)?"#D4A017":"#1a1a1d"}`,color:manualNotes.includes(n)?"#D4A017":"#666",padding:"10px 14px",fontSize:14,fontFamily:"inherit",fontWeight:600,cursor:"pointer",minWidth:42,textAlign:"center",transition:"all 0.15s"}}>
                {n}
              </button>
            ))}
          </div>
          {manualNotes.length > 0 && (
            <button onClick={()=>{setManualNotes([]);setSuggestedKeys([]);}} style={{marginTop:8,background:"none",border:"1px solid #333",color:"#666",padding:"6px 12px",fontSize:10,fontFamily:"inherit",cursor:"pointer",letterSpacing:1}}>CLEAR</button>
          )}
        </div>
      )}

      {/* Results */}
      {suggestedKeys.length > 0 && (
        <div>
          <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:8}}>LIKELY KEYS</label>
          {suggestedKeys.map((sk, i) => {
            const pct = Math.round(sk.score * 100);
            const isTop = i === 0;
            return (
              <div key={sk.key} style={{display:"flex",alignItems:"center",gap:12,marginBottom:6,padding:"10px 12px",background:isTop?"rgba(46,139,87,0.1)":"rgba(255,255,255,0.02)",border:`1px solid ${isTop?"#2E8B57":"#1a1a1d"}`,transition:"all 0.2s"}}>
                <div style={{fontSize:isTop?16:13,fontWeight:isTop?700:500,color:isTop?"#2E8B57":"#ccc",minWidth:100}}>{sk.key}</div>
                <div style={{flex:1,height:6,background:"#1a1a1d",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:isTop?"#2E8B57":"#444",borderRadius:3,transition:"width 0.3s"}}/>
                </div>
                <div style={{fontSize:12,color:isTop?"#2E8B57":"#666",fontWeight:600,minWidth:36,textAlign:"right"}}>{pct}%</div>
              </div>
            );
          })}
          {suggestedKeys.length > 0 && (
            <div style={{marginTop:16,background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"12px"}}>
              <div style={{fontSize:10,color:"#555",letterSpacing:1,marginBottom:6}}>NOTES IN {suggestedKeys[0].key.toUpperCase()}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {KEY_SCALES[suggestedKeys[0].key]?.map(n=>(
                  <span key={n} style={{background:"rgba(46,139,87,0.15)",border:"1px solid #2E8B57",color:"#2E8B57",padding:"4px 10px",fontSize:12,fontWeight:600}}>{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// CIRCLE OF FIFTHS — Interactive SVG
// ═══════════════════════════════════════
function CircleOfFifthsView() {
  const [selectedKey, setSelectedKey] = useState(null);
  const [showMinor, setShowMinor] = useState(true);
  const [expandedChord, setExpandedChord] = useState(null);

  const majorKeys = ["C","G","D","A","E","B","F#","Db","Ab","Eb","Bb","F"];
  const minorKeys = ["Am","Em","Bm","F#m","C#m","G#m","D#m","Bbm","Fm","Cm","Gm","Dm"];

  const keySigs = {
    "C":"","G":"1♯","D":"2♯","A":"3♯","E":"4♯","B":"5♯","F#":"6♯",
    "Db":"5♭","Ab":"4♭","Eb":"3♭","Bb":"2♭","F":"1♭",
    "Am":"","Em":"1♯","Bm":"2♯","F#m":"3♯","C#m":"4♯","G#m":"5♯","D#m":"6♯",
    "Bbm":"5♭","Fm":"4♭","Cm":"3♭","Gm":"2♭","Dm":"1♭",
  };

  // Enharmonic mapping for display
  const flatToSharp = {"Db":"C#","Eb":"D#","Ab":"G#","Bb":"A#","Gb":"F#"};
  const sharpToFlat = {"C#":"Db","D#":"Eb","G#":"Ab","A#":"Bb","F#":"Gb"};

  // Get scale notes for ANY key (major or minor)
  const getScaleNotes = (key) => {
    const isMajor = !key.endsWith("m");
    let rootName = isMajor ? key : key.slice(0, -1);
    // Normalize to NOTES array index
    let rootIdx = NOTES.indexOf(rootName);
    if (rootIdx < 0 && flatToSharp[rootName]) rootIdx = NOTES.indexOf(flatToSharp[rootName]);
    if (rootIdx < 0) return [];

    const intervals = isMajor ? [0,2,4,5,7,9,11] : [0,2,3,5,7,8,10];
    return intervals.map(i => NOTES[(rootIdx + i) % 12]);
  };

  // Get diatonic chords with chord tones
  const getDiatonicChords = (key) => {
    const isMajor = !key.endsWith("m");
    let rootName = isMajor ? key : key.slice(0, -1);
    let rootIdx = NOTES.indexOf(rootName);
    if (rootIdx < 0 && flatToSharp[rootName]) rootIdx = NOTES.indexOf(flatToSharp[rootName]);
    if (rootIdx < 0) return [];

    const scaleNotes = getScaleNotes(key);

    if (isMajor) {
      const qualities = ["","m","m","","","m","dim"];
      const romans = ["I","ii","iii","IV","V","vi","vii°"];
      const sevenths = ["maj7","m7","m7","maj7","7","m7","m7♭5"];
      // Chord tones: 1-3-5 from each scale degree
      return scaleNotes.map((root, i) => ({
        root,
        quality: qualities[i],
        roman: romans[i],
        full: `${root}${qualities[i]}`,
        seventh: `${root}${sevenths[i]}`,
        tones: [scaleNotes[i], scaleNotes[(i+2)%7], scaleNotes[(i+4)%7]],
        seventhTone: scaleNotes[(i+6)%7],
      }));
    } else {
      const qualities = ["m","dim","","m","m","",""];
      const romans = ["i","ii°","III","iv","v","VI","VII"];
      const sevenths = ["m7","m7♭5","maj7","m7","m7","maj7","7"];
      return scaleNotes.map((root, i) => ({
        root,
        quality: qualities[i],
        roman: romans[i],
        full: `${root}${qualities[i]}`,
        seventh: `${root}${sevenths[i]}`,
        tones: [scaleNotes[i], scaleNotes[(i+2)%7], scaleNotes[(i+4)%7]],
        seventhTone: scaleNotes[(i+6)%7],
      }));
    }
  };

  const cx = 200, cy = 200;
  const outerR = 160, innerR = showMinor ? 105 : 130;
  const minorR = 70;

  const getXY = (angle, radius) => ({
    x: cx + radius * Math.cos(angle - Math.PI / 2),
    y: cy + radius * Math.sin(angle - Math.PI / 2),
  });

  const getRelated = (key) => {
    if (!key) return {};
    const majIdx = majorKeys.indexOf(key);
    const minIdx = minorKeys.indexOf(key);
    if (majIdx >= 0) return { selected: key, relative: minorKeys[majIdx], dominant: majorKeys[(majIdx+1)%12], subdominant: majorKeys[(majIdx+11)%12] };
    if (minIdx >= 0) return { selected: key, relative: majorKeys[minIdx], dominant: minorKeys[(minIdx+1)%12], subdominant: minorKeys[(minIdx+11)%12] };
    return { selected: key };
  };

  const related = getRelated(selectedKey);
  const scaleNotes = selectedKey ? getScaleNotes(selectedKey) : [];
  const diatonicChords = selectedKey ? getDiatonicChords(selectedKey) : [];

  const getKeyColor = (key) => {
    if (key === related.selected) return "#E8453C";
    if (key === related.relative) return "#9B59B6";
    if (key === related.dominant) return "#D4A017";
    if (key === related.subdominant) return "#4682B4";
    return null;
  };

  return (
    <div>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 4px",color:"#fff"}}>CIRCLE OF FIFTHS</h2>
      <p style={{color:"#555",fontSize:11,margin:"0 0 16px",letterSpacing:1}}>TAP A KEY TO SEE PLAYABLE NOTES</p>

      {/* Controls */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        <button onClick={()=>setShowMinor(!showMinor)} style={{background:showMinor?"rgba(155,89,182,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${showMinor?"#9B59B6":"#1a1a1d"}`,color:showMinor?"#9B59B6":"#666",padding:"8px 16px",fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:1}}>
          {showMinor ? "HIDE" : "SHOW"} MINOR
        </button>
        {selectedKey && (
          <button onClick={()=>{setSelectedKey(null);setExpandedChord(null);}} style={{background:"none",border:"1px solid #333",color:"#666",padding:"8px 16px",fontSize:11,fontFamily:"inherit",cursor:"pointer",letterSpacing:1}}>
            CLEAR
          </button>
        )}
      </div>

      {/* SVG Circle */}
      <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
        <svg width={400} height={400} viewBox="0 0 400 400" style={{maxWidth:"100%"}}>
          {selectedKey && (() => {
            const majIdx = majorKeys.indexOf(selectedKey);
            const minIdx = minorKeys.indexOf(selectedKey);
            const idx = majIdx >= 0 ? majIdx : minIdx;
            if (idx < 0) return null;
            const angle = (idx/12)*Math.PI*2;
            const sa = Math.PI*2/12;
            const s1=getXY(angle-sa/2,outerR+10);const e1=getXY(angle+sa/2,outerR+10);
            const s2=getXY(angle+sa/2,40);const e2=getXY(angle-sa/2,40);
            return <path d={`M ${s1.x} ${s1.y} A ${outerR+10} ${outerR+10} 0 0 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A 40 40 0 0 0 ${e2.x} ${e2.y} Z`} fill="rgba(232,69,60,0.08)"/>;
          })()}

          {majorKeys.map((key,i)=>{
            const angle=(i/12)*Math.PI*2;const pos=getXY(angle,(outerR+innerR)/2);const hl=getKeyColor(key);
            return(
              <g key={`maj-${key}`} style={{cursor:"pointer"}} onClick={()=>{setSelectedKey(selectedKey===key?null:key);setExpandedChord(null);}}>
                <circle cx={pos.x} cy={pos.y} r={22} fill={hl?`${hl}22`:"rgba(255,255,255,0.03)"} stroke={hl||"#2a2a2d"} strokeWidth={hl?2:1}/>
                <text x={pos.x} y={pos.y+1} fill={hl||"#ccc"} fontSize={14} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fontFamily="monospace">{key}</text>
                <text x={pos.x} y={pos.y+14} fill="#444" fontSize={7} textAnchor="middle" fontFamily="monospace">{keySigs[key]}</text>
              </g>
            );
          })}

          {showMinor && minorKeys.map((key,i)=>{
            const angle=(i/12)*Math.PI*2;const pos=getXY(angle,minorR);const hl=getKeyColor(key);
            return(
              <g key={`min-${key}`} style={{cursor:"pointer"}} onClick={()=>{setSelectedKey(selectedKey===key?null:key);setExpandedChord(null);}}>
                <circle cx={pos.x} cy={pos.y} r={18} fill={hl?`${hl}22`:"rgba(255,255,255,0.02)"} stroke={hl||"#1a1a1d"} strokeWidth={hl?2:1}/>
                <text x={pos.x} y={pos.y+1} fill={hl||"#888"} fontSize={11} fontWeight={600} textAnchor="middle" dominantBaseline="middle" fontFamily="monospace">{key}</text>
              </g>
            );
          })}

          {!showMinor && <text x={cx} y={cy} fill="#333" fontSize={9} textAnchor="middle" fontFamily="monospace">{selectedKey||""}</text>}
          {showMinor && <>
            <text x={cx} y={cy-6} fill="#333" fontSize={9} textAnchor="middle" fontFamily="monospace">MINOR</text>
            <text x={cx} y={cy+6} fill="#333" fontSize={7} textAnchor="middle" fontFamily="monospace">KEYS</text>
          </>}
        </svg>
      </div>

      {/* Legend */}
      {selectedKey && (
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
            {[
              {label:"Selected",color:"#E8453C",val:related.selected},
              {label:"Relative",color:"#9B59B6",val:related.relative},
              {label:"Dominant (V)",color:"#D4A017",val:related.dominant},
              {label:"Subdominant (IV)",color:"#4682B4",val:related.subdominant},
            ].filter(x=>x.val).map(item=>(
              <div key={item.label} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:item.color}}/>
                <span style={{fontSize:11,color:"#888"}}>{item.label}: </span>
                <span style={{fontSize:12,color:item.color,fontWeight:600}}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ NOTES IN KEY — Chromatic note map ═══ */}
      {selectedKey && scaleNotes.length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:"#555",letterSpacing:2,marginBottom:8}}>NOTES YOU CAN PLAY IN {selectedKey.toUpperCase()}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
            {NOTES.map(n => {
              const inKey = scaleNotes.includes(n);
              const isRoot = n === scaleNotes[0];
              return (
                <div key={n} style={{
                  textAlign:"center",
                  background: isRoot ? "rgba(232,69,60,0.2)" : inKey ? "rgba(46,139,87,0.15)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isRoot ? "#E8453C" : inKey ? "#2E8B57" : "#1a1a1d"}`,
                  padding:"8px 0",
                  flex:"1 0 28px",
                  minWidth:28,
                }}>
                  <div style={{fontSize:13,fontWeight:600,color: isRoot ? "#E8453C" : inKey ? "#2E8B57" : "#333"}}>{n}</div>
                  {!inKey && <div style={{fontSize:8,color:"#333",marginTop:2}}>avoid</div>}
                  {isRoot && <div style={{fontSize:8,color:"#E8453C",marginTop:2}}>root</div>}
                </div>
              );
            })}
          </div>
          <div style={{fontSize:11,color:"#777",lineHeight:1.5}}>
            <span style={{color:"#2E8B57",fontWeight:600}}>{scaleNotes.length} notes</span> are safe to play: <span style={{color:"#ccc"}}>{scaleNotes.join(" – ")}</span>
          </div>
        </div>
      )}

      {/* ═══ DIATONIC CHORDS with chord tones ═══ */}
      {selectedKey && diatonicChords.length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:"#555",letterSpacing:2,marginBottom:8}}>
            CHORDS IN {selectedKey.toUpperCase()} {selectedKey.endsWith("m") ? "MINOR" : "MAJOR"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {diatonicChords.map((ch, i) => {
              const isExpanded = expandedChord === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setExpandedChord(isExpanded ? null : i)}
                    style={{
                      width:"100%",
                      background: isExpanded ? "rgba(212,160,23,0.1)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isExpanded ? "#D4A017" : "#1a1a1d"}`,
                      padding:"10px 12px",
                      fontFamily:"inherit",
                      cursor:"pointer",
                      textAlign:"left",
                      display:"flex",
                      justifyContent:"space-between",
                      alignItems:"center",
                      transition:"all 0.15s",
                    }}
                  >
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:11,color:"#555",minWidth:32}}>{ch.roman}</span>
                      <span style={{fontSize:15,fontWeight:700,color:isExpanded?"#D4A017":"#ccc"}}>{ch.full}</span>
                    </div>
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <span style={{fontSize:10,color:"#555"}}>{ch.tones.join("-")}</span>
                      <span style={{fontSize:12,color:"#444"}}>{isExpanded?"▾":"▸"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",borderTop:"none",padding:"12px"}}>
                      {/* Triad tones */}
                      <div style={{marginBottom:10}}>
                        <div style={{fontSize:9,color:"#555",letterSpacing:1,marginBottom:4}}>TRIAD — {ch.full}</div>
                        <div style={{display:"flex",gap:6}}>
                          {ch.tones.map((t,ti) => (
                            <div key={ti} style={{textAlign:"center",background:"rgba(212,160,23,0.1)",border:"1px solid #D4A017",padding:"6px 12px"}}>
                              <div style={{fontSize:8,color:"#888"}}>{["R","3","5"][ti]}</div>
                              <div style={{fontSize:14,fontWeight:700,color:"#D4A017"}}>{t}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 7th chord tones */}
                      <div style={{marginBottom:10}}>
                        <div style={{fontSize:9,color:"#555",letterSpacing:1,marginBottom:4}}>7TH CHORD — {ch.seventh}</div>
                        <div style={{display:"flex",gap:6}}>
                          {[...ch.tones, ch.seventhTone].map((t,ti) => (
                            <div key={ti} style={{textAlign:"center",background:ti===3?"rgba(155,89,182,0.1)":"rgba(212,160,23,0.1)",border:`1px solid ${ti===3?"#9B59B6":"#D4A017"}`,padding:"6px 12px"}}>
                              <div style={{fontSize:8,color:"#888"}}>{["R","3","5","7"][ti]}</div>
                              <div style={{fontSize:14,fontWeight:700,color:ti===3?"#9B59B6":"#D4A017"}}>{t}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Where these notes live on the fretboard (low E string) */}
                      <div>
                        <div style={{fontSize:9,color:"#555",letterSpacing:1,marginBottom:4}}>CHORD TONES ON LOW E STRING</div>
                        <div style={{display:"flex",gap:2,overflowX:"auto"}}>
                          {Array.from({length:13},(_, fret) => {
                            const noteAtFret = NOTES[(4 + fret) % 12]; // E=4
                            const isTone = ch.tones.includes(noteAtFret);
                            const isRoot = noteAtFret === ch.tones[0];
                            const is7th = noteAtFret === ch.seventhTone;
                            return (
                              <div key={fret} style={{textAlign:"center",minWidth:24}}>
                                <div style={{fontSize:8,color:"#444"}}>{fret}</div>
                                <div style={{
                                  width:20,height:20,borderRadius:"50%",margin:"2px auto",
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  fontSize:8,fontWeight:600,
                                  background: isRoot?"#E8453C":isTone?"#D4A017":is7th?"#9B59B6":"transparent",
                                  color: isRoot||isTone||is7th?"#000":"#333",
                                  border: isRoot||isTone||is7th?"none":"1px solid #1a1a1d",
                                }}>
                                  {noteAtFret}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How to use */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"14px"}}>
        <div style={{fontSize:10,color:"#555",letterSpacing:1,marginBottom:8}}>HOW TO USE</div>
        <div style={{fontSize:12,color:"#777",lineHeight:1.6}}>
          Tap any key to see every note you can play, plus all the chords that belong in that key. Tap a chord to expand it and see the individual chord tones (root, 3rd, 5th, 7th) and where they fall on the fretboard. Clockwise = up a fifth. Counter-clockwise = up a fourth. Adjacent keys share the most common tones.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// THEORY HUB — Sub-navigation for theory tools
// ═══════════════════════════════════════
function TheoryView() {
  const [subView, setSubView] = useState("scales");
  const tabs = [
    { id: "scales", label: "Scales" },
    { id: "chords", label: "Chords" },
    { id: "keyfinder", label: "Key Finder" },
    { id: "circle", label: "Circle of 5ths" },
  ];

  return (
    <div>
      {/* Sub-navigation */}
      <div style={{display:"flex",gap:4,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {tabs.map(tab=>(
          <button key={tab.id} onClick={()=>setSubView(tab.id)} style={{background:subView===tab.id?"rgba(232,69,60,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${subView===tab.id?"#E8453C":"#1a1a1d"}`,color:subView===tab.id?"#E8453C":"#666",padding:"8px 14px",fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:0.5,whiteSpace:"nowrap",transition:"all 0.15s"}}>
            {tab.label}
          </button>
        ))}
      </div>

      {subView === "scales" && <ScalesView />}
      {subView === "chords" && <ChordsView />}
      {subView === "keyfinder" && <KeyDetectorView />}
      {subView === "circle" && <CircleOfFifthsView />}
    </div>
  );
}

function transposeTab(pattern, keyIndex) {
  return pattern.tab.map(stringFrets =>
    stringFrets.map(f => f + pattern.baseFret + keyIndex)
  );
}

// ─── Metronome Engine ───
function useMetronome() {
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const beatCountRef = useRef(0);
  const [beat, setBeat] = useState(0);
  const start = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    beatCountRef.current = 0; setBeat(0);
    const tick = () => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const db = beatCountRef.current % 4 === 0;
      osc.frequency.value = db ? 1000 : 700; gain.gain.value = db ? 0.3 : 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
      setBeat(beatCountRef.current % 4); beatCountRef.current++;
    };
    tick(); intervalRef.current = setInterval(tick, (60 / bpm) * 1000); setIsPlaying(true);
  }, [bpm]);
  const stop = useCallback(() => { clearInterval(intervalRef.current); setIsPlaying(false); setBeat(0); beatCountRef.current = 0; }, []);
  const updateBpm = useCallback((newBpm) => {
    setBpm(newBpm);
    if (isPlaying) {
      clearInterval(intervalRef.current);
      const ctx = audioCtxRef.current; beatCountRef.current = 0;
      const tick = () => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        const db = beatCountRef.current % 4 === 0;
        osc.frequency.value = db ? 1000 : 700; gain.gain.value = db ? 0.3 : 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
        setBeat(beatCountRef.current % 4); beatCountRef.current++;
      };
      tick(); intervalRef.current = setInterval(tick, (60 / newBpm) * 1000);
    }
  }, [isPlaying]);
  useEffect(() => () => clearInterval(intervalRef.current), []);
  return { isPlaying, bpm, beat, start, stop, setBpm: updateBpm };
}

// ─── Pitch Detection ───
function usePitchDetection() {
  const [pitch, setPitch] = useState(null);
  const [note, setNote] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const animRef = useRef(null); const streamRef = useRef(null);
  const NN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const freqToNote = (freq) => {
    const n = 12*(Math.log2(freq/440))+69; const r = Math.round(n);
    return { name: NN[r%12], octave: Math.floor(r/12)-1, cents: Math.round((n-r)*100), full: `${NN[r%12]}${Math.floor(r/12)-1}` };
  };
  const autoCorrelate = (buf, sr) => {
    let sz = buf.length, rms = 0;
    for (let i=0;i<sz;i++) rms+=buf[i]*buf[i];
    rms=Math.sqrt(rms/sz); if(rms<0.01)return -1;
    let r1=0,r2=sz-1; const th=0.2;
    for(let i=0;i<sz/2;i++){if(Math.abs(buf[i])<th){r1=i;break;}}
    for(let i=1;i<sz/2;i++){if(Math.abs(buf[sz-i])<th){r2=sz-i;break;}}
    buf=buf.slice(r1,r2);sz=buf.length;
    const c=new Array(sz).fill(0);
    for(let i=0;i<sz;i++)for(let j=0;j<sz-i;j++)c[i]+=buf[j]*buf[j+i];
    let d=0;while(c[d]>c[d+1])d++;
    let mx=-1,mp=-1;for(let i=d;i<sz;i++){if(c[i]>mx){mx=c[i];mp=i;}}
    let t0=mp;const x1=c[t0-1],x2=c[t0],x3=c[t0+1];
    const a=(x1+x3-2*x2)/2,b=(x3-x1)/2;if(a)t0=t0-b/(2*a);
    return sr/t0;
  };
  const startListening = useCallback(async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current=stream;
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const src=ctx.createMediaStreamSource(stream);const an=ctx.createAnalyser();an.fftSize=2048;src.connect(an);
      const buf=new Float32Array(an.fftSize);
      const detect=()=>{an.getFloatTimeDomainData(buf);const f=autoCorrelate(buf,ctx.sampleRate);if(f>0&&f<2000){setPitch(Math.round(f));setNote(freqToNote(f));}animRef.current=requestAnimationFrame(detect);};
      detect();setIsListening(true);
    }catch(e){console.error("Mic denied:",e);}
  },[]);
  const stopListening = useCallback(()=>{cancelAnimationFrame(animRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());setIsListening(false);setPitch(null);setNote(null);},[]);
  return { pitch, note, isListening, startListening, stopListening };
}

function useTimer() {
  const [seconds,setSeconds]=useState(0);const [isRunning,setIsRunning]=useState(false);const ref=useRef(null);
  const start=useCallback(()=>{setIsRunning(true);ref.current=setInterval(()=>setSeconds(s=>s+1),1000);},[]);
  const stop=useCallback(()=>{clearInterval(ref.current);setIsRunning(false);},[]);
  const reset=useCallback(()=>{clearInterval(ref.current);setIsRunning(false);setSeconds(0);},[]);
  useEffect(()=>()=>clearInterval(ref.current),[]);
  return { seconds, isRunning, start, stop, reset, formatted: `${Math.floor(seconds/60)}:${(seconds%60).toString().padStart(2,"0")}` };
}

// ═══════════════════════════════════════
// TAB RENDERER
// ═══════════════════════════════════════
function TabDisplay({ tab }) {
  const SL = ["e","B","G","D","A","E"];
  const asc = tab.slice().reverse();
  const ascL = SL.slice().reverse();
  const fmt = (frets) => frets.map(f => { const s=String(f); return s.length===1?s+"-":s; }).join("-");

  return (
    <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid #1a1a1d", padding:"16px", overflowX:"auto", fontFamily:"'JetBrains Mono',monospace", fontSize:13, lineHeight:1.8 }}>
      <div style={{color:"#666",fontSize:10,letterSpacing:1,marginBottom:4}}>ASCENDING (Low → High)</div>
      <div style={{whiteSpace:"pre",color:"#ccc"}}>
        {asc.map((frets,i) => {
          const sorted=[...frets].sort((a,b)=>a-b);
          return <div key={`a${i}`} style={{display:"flex",alignItems:"center"}}><span style={{color:"#D4A017",width:20,display:"inline-block",textAlign:"right",marginRight:4}}>{ascL[i]}</span><span style={{color:"#333"}}>|</span><span>--{fmt(sorted)}--</span></div>;
        })}
      </div>
      <div style={{color:"#666",fontSize:10,letterSpacing:1,marginTop:12,marginBottom:4}}>DESCENDING (High → Low)</div>
      <div style={{whiteSpace:"pre",color:"#ccc"}}>
        {tab.map((frets,i) => {
          const sorted=[...frets].sort((a,b)=>b-a);
          return <div key={`d${i}`} style={{display:"flex",alignItems:"center"}}><span style={{color:"#D4A017",width:20,display:"inline-block",textAlign:"right",marginRight:4}}>{SL[i]}</span><span style={{color:"#333"}}>|</span><span>--{fmt(sorted)}--</span></div>;
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// FRETBOARD DIAGRAM
// ═══════════════════════════════════════
function FretboardDiagram({ tab, compact }) {
  const allFrets = tab.flat();
  const minF = Math.min(...allFrets);
  const maxF = Math.max(...allFrets);
  const startF = Math.max(0, minF);
  const endF = maxF + 1;
  const numF = endF - startF + 1;
  const SL = ["e","B","G","D","A","E"];
  const fw = compact ? 32 : 40;
  const ss = compact ? 18 : 22;
  const lp = 24; const tp = 20;
  const w = lp + numF * fw + 10;
  const h = tp + 5 * ss + (compact ? 10 : 20);
  const dots = [3,5,7,9,12,15,17,19,21];

  return (
    <div style={{ overflowX:"auto", marginTop:4 }}>
      <svg width={w} height={h} style={{ display:"block", minWidth:w }}>
        {Array.from({length:numF},(_,i)=>startF+i).map((fn,i)=>(
          <text key={`fn${i}`} x={lp+i*fw+fw/2} y={12} fill="#444" fontSize={9} textAnchor="middle" fontFamily="monospace">{fn}</text>
        ))}
        {Array.from({length:numF},(_,i)=>startF+i).map((fn,i)=>{
          if(!dots.includes(fn))return null;
          const x=lp+i*fw+fw/2;
          if(fn===12)return <g key={`dt${fn}`}><circle cx={x} cy={h-8} r={2.5} fill="#333"/><circle cx={x} cy={h-2} r={2.5} fill="#333"/></g>;
          return <circle key={`dt${fn}`} cx={x} cy={h-5} r={2.5} fill="#333"/>;
        })}
        {SL.map((l,si)=>{
          const y=tp+si*ss;
          return <g key={`s${si}`}><text x={8} y={y+4} fill="#555" fontSize={9} textAnchor="middle" fontFamily="monospace">{l}</text><line x1={lp} y1={y} x2={w-10} y2={y} stroke="#222" strokeWidth={si>=4?1.5:1}/></g>;
        })}
        {Array.from({length:numF+1},(_,i)=>(
          <line key={`f${i}`} x1={lp+i*fw} y1={tp} x2={lp+i*fw} y2={tp+5*ss} stroke={startF+i===0?"#888":"#1a1a1d"} strokeWidth={startF+i===0?3:1}/>
        ))}
        {tab.map((frets,si)=>{
          const y=tp+si*ss;
          return frets.map((fret,fi)=>{
            const rf=fret-startF;const x=lp+rf*fw+fw/2;const isRoot=fi===0;
            return <g key={`n${si}${fi}`}><circle cx={x} cy={y} r={compact?7:9} fill={isRoot?"#E8453C":"#D4A017"} opacity={0.9}/><text x={x} y={y+3.5} fill="#000" fontSize={compact?8:9} textAnchor="middle" fontWeight={700} fontFamily="monospace">{fret}</text></g>;
          });
        })}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════
// SCALES VIEW
// ═══════════════════════════════════════
function ScalesView() {
  const [selectedScale, setSelectedScale] = useState("minor_pentatonic");
  const [selectedKey, setSelectedKey] = useState(4); // E by default
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [displayMode, setDisplayMode] = useState("diagram"); // diagram | tab | all

  const scale = SCALE_PATTERNS[selectedScale];
  const posNames = Object.keys(scale.positions);
  const activePos = (selectedPosition && scale.positions[selectedPosition]) ? selectedPosition : posNames[0];

  useEffect(() => { setSelectedPosition(posNames[0]); }, [selectedScale]);

  const currentPattern = scale.positions[activePos];
  const transposedTab = currentPattern ? transposeTab(currentPattern, selectedKey) : null;

  if (!currentPattern || !transposedTab) return <div style={{color:"#555",padding:40,textAlign:"center"}}>Loading...</div>;

  return (
    <div>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 4px",color:"#fff"}}>SCALES</h2>
      <p style={{color:"#555",fontSize:11,margin:"0 0 20px",letterSpacing:1}}>TAB & FRETBOARD REFERENCE</p>

      {/* Scale Type */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:6}}>SCALE TYPE</label>
        {Object.entries(SCALE_GROUPS).map(([group, keys])=>(
          <div key={group} style={{marginBottom:8}}>
            <div style={{fontSize:9,color:"#444",letterSpacing:1,marginBottom:4}}>{group.toUpperCase()}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {keys.map(sk=>(
                <button key={sk} onClick={()=>setSelectedScale(sk)} style={{background:selectedScale===sk?"rgba(212,160,23,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${selectedScale===sk?"#D4A017":"#1a1a1d"}`,color:selectedScale===sk?"#D4A017":"#666",padding:"6px 10px",fontSize:11,fontFamily:"inherit",cursor:"pointer",transition:"all 0.15s"}}>
                  {SCALE_PATTERNS[sk].name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Key */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:6}}>KEY</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {NOTES.map((n,i)=>(
            <button key={n} onClick={()=>setSelectedKey(i)} style={{background:selectedKey===i?"rgba(232,69,60,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${selectedKey===i?"#E8453C":"#1a1a1d"}`,color:selectedKey===i?"#E8453C":"#666",padding:"6px 10px",fontSize:12,fontFamily:"inherit",fontWeight:600,cursor:"pointer",minWidth:36,textAlign:"center",transition:"all 0.15s"}}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Formula */}
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"10px 14px",marginBottom:16}}>
        <span style={{fontSize:10,color:"#555",letterSpacing:1}}>FORMULA: </span>
        <span style={{fontSize:13,color:"#D4A017",fontWeight:600}}>{scale.formula}</span>
      </div>

      {/* Position */}
      <div style={{marginBottom:16}}>
        <label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:6}}>POSITION</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {posNames.map(pos=>(
            <button key={pos} onClick={()=>setSelectedPosition(pos)} style={{background:activePos===pos?"rgba(46,139,87,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${activePos===pos?"#2E8B57":"#1a1a1d"}`,color:activePos===pos?"#2E8B57":"#666",padding:"6px 10px",fontSize:11,fontFamily:"inherit",cursor:"pointer",transition:"all 0.15s"}}>
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* View Toggle */}
      <div style={{display:"flex",gap:4,marginBottom:12}}>
        {[{key:"diagram",label:"DIAGRAM"},{key:"tab",label:"TAB"},{key:"all",label:"ALL POSITIONS"}].map(opt=>(
          <button key={opt.key} onClick={()=>setDisplayMode(opt.key)} style={{flex:1,background:displayMode===opt.key?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)",border:`1px solid ${displayMode===opt.key?"#333":"#1a1a1d"}`,color:displayMode===opt.key?"#fff":"#555",padding:"8px",fontSize:10,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:1}}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Title */}
      <div style={{marginBottom:8}}>
        <span style={{fontSize:16,fontWeight:700,color:"#fff"}}>{NOTES[selectedKey]} {scale.name}</span>
        {displayMode !== "all" && <span style={{fontSize:12,color:"#555",marginLeft:8}}>{activePos}</span>}
      </div>

      {/* Display */}
      {displayMode === "diagram" && <FretboardDiagram tab={transposedTab} />}
      {displayMode === "tab" && <TabDisplay tab={transposedTab} />}
      {displayMode === "all" && (
        <div>
          {posNames.map(pos => {
            const pat = scale.positions[pos];
            const tr = transposeTab(pat, selectedKey);
            return (
              <div key={pos} style={{marginBottom:20}}>
                <div style={{fontSize:13,fontWeight:600,color:activePos===pos?"#2E8B57":"#ccc",marginBottom:4,cursor:"pointer"}} onClick={()=>setSelectedPosition(pos)}>
                  {pos} {activePos===pos && "●"}
                </div>
                <FretboardDiagram tab={tr} compact />
                <div style={{marginTop:4}}>
                  <TabDisplay tab={tr} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function GuitarPracticeApp() {
  const [view, setView] = useState("home");
  const [exercises, setExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [activeExercise, setActiveExercise] = useState(null);
  const [sessionExercises, setSessionExercises] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  useEffect(()=>{try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(s){setExercises(s.exercises||[]);setSessions(s.sessions||[]);setProfile(s.profile||null);}}catch(e){}},[]);
  useEffect(()=>{if(exercises.length||sessions.length||profile)localStorage.setItem(STORAGE_KEY,JSON.stringify({exercises,sessions,profile}));},[exercises,sessions,profile]);

  const completeAssessment=(p)=>{setProfile(p);if(exercises.length===0)setExercises(DEFAULT_EXERCISES.map(ex=>({...ex,interval:1,easeFactor:2.5,repetitions:0,lastReview:null,nextDue:Date.now()})));setView("home");};
  const getDueExercises=()=>{const now=Date.now();return exercises.filter(ex=>!ex.nextDue||ex.nextDue<=now).sort((a,b)=>(a.nextDue||0)-(b.nextDue||0));};
  const startSession=()=>{const due=getDueExercises();const sel=due.length>0?due.slice(0,5):exercises.slice(0,5);setSessionExercises(sel.map(ex=>({...ex,completed:false,rating:null,timeSpent:0,bpmUsed:ex.currentBPM})));setSessionStartTime(Date.now());setView("session");};
  const rateExercise=(exId,quality,timeSpent,bpmUsed)=>{setSessionExercises(prev=>prev.map(ex=>ex.id===exId?{...ex,completed:true,rating:quality,timeSpent,bpmUsed}:ex));setExercises(prev=>prev.map(ex=>{if(ex.id!==exId)return ex;const u=nextReview(ex,quality);if(quality>=4&&bpmUsed&&ex.targetBPM&&bpmUsed<ex.targetBPM)u.currentBPM=Math.min(ex.targetBPM,bpmUsed+5);return u;}));};
  const finishSession=()=>{const s={id:`sess_${Date.now()}`,date:sessionStartTime,duration:Math.round((Date.now()-sessionStartTime)/1000),exercises:sessionExercises.map(ex=>({id:ex.id,name:ex.name,rating:ex.rating,timeSpent:ex.timeSpent,bpmUsed:ex.bpmUsed})),avgRating:sessionExercises.filter(e=>e.rating!==null).reduce((s,e)=>s+e.rating,0)/Math.max(1,sessionExercises.filter(e=>e.rating!==null).length)};setSessions(prev=>[s,...prev]);setView("home");};
  const addCustomExercise=(ex)=>{setExercises(prev=>[...prev,{...ex,id:`ex_${Date.now()}`,interval:1,easeFactor:2.5,repetitions:0,lastReview:null,nextDue:Date.now()}]);setView("library");};

  const S={
    app:{fontFamily:"'JetBrains Mono','Fira Code','SF Mono',monospace",background:"#0A0A0B",color:"#E8E6E3",minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative",overflow:"hidden"},
    grain:{position:"fixed",top:0,left:0,right:0,bottom:0,background:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,pointerEvents:"none",zIndex:0},
    content:{position:"relative",zIndex:1,padding:"20px 16px 100px"},
    nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(10,10,11,0.95)",backdropFilter:"blur(20px)",borderTop:"1px solid #1a1a1d",display:"flex",justifyContent:"space-around",padding:"12px 0 20px",zIndex:10},
    nb:(a)=>({background:"none",border:"none",color:a?"#E8453C":"#555",fontSize:10,fontFamily:"inherit",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"color 0.2s"}),
  };

  if(!profile&&view!=="assess"){
    return(
      <div style={S.app}><div style={S.grain}/>
        <div style={{...S.content,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"20px"}}>
          <div style={{fontSize:48,marginBottom:8}}>🎸</div>
          <h1 style={{fontSize:28,fontWeight:700,letterSpacing:-1,margin:"0 0 4px",color:"#fff"}}>FRETLAB</h1>
          <p style={{color:"#666",fontSize:12,letterSpacing:3,textTransform:"uppercase",margin:"0 0 40px"}}>Practice System</p>
          <button onClick={()=>setView("assess")} style={{background:"#E8453C",color:"#fff",border:"none",padding:"14px 40px",fontSize:14,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:1}}>GET STARTED</button>
        </div>
      </div>
    );
  }

  return(
    <div style={S.app}><div style={S.grain}/>
      <div style={S.content}>
        {view==="assess"&&<AssessmentView onComplete={completeAssessment}/>}
        {view==="home"&&<HomeView profile={profile} exercises={exercises} sessions={sessions} dueCount={getDueExercises().length} onStartSession={startSession}/>}
        {view==="session"&&<SessionView exercises={sessionExercises} onRate={rateExercise} onFinish={finishSession} onOpenExercise={(ex)=>{setActiveExercise(ex);setView("exercise");}}/>}
        {view==="exercise"&&<ExerciseView exercise={activeExercise} onRate={(q,t,b)=>{rateExercise(activeExercise.id,q,t,b);setView("session");}} onBack={()=>setView("session")}/>}
        {view==="library"&&<LibraryView exercises={exercises} onAdd={()=>setView("addExercise")}/>}
        {view==="addExercise"&&<AddExerciseView onSave={addCustomExercise} onBack={()=>setView("library")}/>}
        {view==="theory"&&<TheoryView/>}
        {view==="history"&&<HistoryView sessions={sessions}/>}
      </div>
      {!["assess","exercise"].includes(view)&&(
        <div style={S.nav}>
          {[{id:"home",icon:"⌂",label:"Home"},{id:"session",icon:"▶",label:"Practice"},{id:"theory",icon:"♫",label:"Theory"},{id:"library",icon:"☰",label:"Library"},{id:"history",icon:"◷",label:"History"}].map(tab=>(
            <button key={tab.id} style={S.nb(view===tab.id)} onClick={()=>{if(tab.id==="session")startSession();else setView(tab.id);}}>
              <span style={{fontSize:20}}>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ASSESSMENT VIEW
// ═══════════════════════════════════════
function AssessmentView({onComplete}){
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState({level:"",genres:[],goals:[],struggles:[]});
  const questions=[
    {key:"level",q:"Where are you at?",type:"single",options:[{value:"beginner",label:"Beginner",desc:"< 1 year"},{value:"intermediate",label:"Intermediate",desc:"1-3 years"},{value:"advanced",label:"Advanced",desc:"3-10 years"},{value:"pro",label:"Seasoned",desc:"10+ years"}]},
    {key:"genres",q:"What do you play?",type:"multi",options:[{value:"rock",label:"Rock"},{value:"blues",label:"Blues"},{value:"country",label:"Country"},{value:"jazz",label:"Jazz"},{value:"folk",label:"Folk/Acoustic"},{value:"metal",label:"Metal"},{value:"funk",label:"Funk/R&B"},{value:"indie",label:"Indie/Alt"}]},
    {key:"goals",q:"What are you working toward?",type:"multi",options:[{value:"speed",label:"Speed & Accuracy"},{value:"theory",label:"Music Theory"},{value:"improv",label:"Improvisation"},{value:"songs",label:"Learn Songs"},{value:"writing",label:"Songwriting"},{value:"gigging",label:"Gig-Ready Chops"}]},
    {key:"struggles",q:"Where do you get stuck?",type:"multi",options:[{value:"barre",label:"Barre Chords"},{value:"timing",label:"Timing/Rhythm"},{value:"fretboard",label:"Fretboard Knowledge"},{value:"ear",label:"Playing by Ear"},{value:"speed",label:"Speed"},{value:"consistency",label:"Consistent Practice"}]},
  ];
  const cur=questions[step];
  const sel=(val)=>{if(cur.type==="single")setAnswers(p=>({...p,[cur.key]:val}));else setAnswers(p=>({...p,[cur.key]:p[cur.key].includes(val)?p[cur.key].filter(v=>v!==val):[...p[cur.key],val]}));};
  const canN=cur.type==="single"?answers[cur.key]:answers[cur.key].length>0;
  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center"}}>
      <div style={{marginBottom:40}}>
        <div style={{display:"flex",gap:6,marginBottom:32}}>{questions.map((_,i)=>(<div key={i} style={{flex:1,height:3,background:i<=step?"#E8453C":"#1a1a1d",transition:"background 0.3s"}}/>))}</div>
        <h2 style={{fontSize:24,fontWeight:700,margin:"0 0 24px",color:"#fff"}}>{cur.q}</h2>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {cur.options.map(opt=>{const s=cur.type==="single"?answers[cur.key]===opt.value:answers[cur.key].includes(opt.value);return(
            <button key={opt.value} onClick={()=>sel(opt.value)} style={{background:s?"rgba(232,69,60,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${s?"#E8453C":"#1a1a1d"}`,color:s?"#fff":"#999",padding:"14px 16px",fontSize:14,fontFamily:"inherit",cursor:"pointer",textAlign:"left",transition:"all 0.2s",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>{opt.label}</span>{opt.desc&&<span style={{fontSize:11,color:"#555"}}>{opt.desc}</span>}
            </button>);})}
        </div>
      </div>
      <div style={{display:"flex",gap:12}}>
        {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:"none",border:"1px solid #333",color:"#999",padding:"12px",fontSize:13,fontFamily:"inherit",cursor:"pointer"}}>BACK</button>}
        <button onClick={()=>step<questions.length-1?setStep(s=>s+1):onComplete(answers)} disabled={!canN} style={{flex:2,background:canN?"#E8453C":"#1a1a1d",border:"none",color:canN?"#fff":"#555",padding:"12px",fontSize:13,fontFamily:"inherit",fontWeight:600,cursor:canN?"pointer":"default",letterSpacing:1,transition:"all 0.2s"}}>{step<questions.length-1?"NEXT":"LET'S GO"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// HOME VIEW
// ═══════════════════════════════════════
function HomeView({profile,exercises,sessions,dueCount,onStartSession}){
  const streak=(()=>{let c=0;const t=new Date();for(let i=0;i<30;i++){const d=new Date(t);d.setDate(d.getDate()-i);if(sessions.some(s=>new Date(s.date).toDateString()===d.toDateString()))c++;else if(i>0)break;}return c;})();
  const totalTime=sessions.reduce((s,x)=>s+x.duration,0);
  const avgR=sessions.length?(sessions.reduce((s,x)=>s+(x.avgRating||0),0)/sessions.length).toFixed(1):"—";
  return(
    <div>
      <div style={{marginBottom:32}}><h1 style={{fontSize:22,fontWeight:700,margin:"0 0 2px",color:"#fff"}}>FRETLAB</h1><p style={{color:"#555",fontSize:11,letterSpacing:2,margin:0}}>PRACTICE SYSTEM</p></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:28}}>
        {[{label:"Streak",value:`${streak}d`,color:streak>0?"#E8453C":"#333"},{label:"Total Time",value:`${Math.round(totalTime/60)}m`,color:"#D4A017"},{label:"Avg Rating",value:avgR,color:"#2E8B57"}].map((st,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"16px 12px",textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:st.color}}>{st.value}</div><div style={{fontSize:10,color:"#555",letterSpacing:1,marginTop:4}}>{st.label.toUpperCase()}</div></div>
        ))}
      </div>
      <button onClick={onStartSession} style={{width:"100%",background:"linear-gradient(135deg,#E8453C 0%,#c23028 100%)",border:"none",color:"#fff",padding:"20px",fontSize:16,fontFamily:"inherit",fontWeight:700,cursor:"pointer",letterSpacing:1,marginBottom:12}}>START SESSION<div style={{fontSize:11,fontWeight:400,opacity:0.8,marginTop:4}}>{dueCount} exercise{dueCount!==1?"s":""} due today</div></button>
      {sessions.length>0&&(
        <div style={{marginTop:28}}>
          <h3 style={{fontSize:11,letterSpacing:2,color:"#555",margin:"0 0 12px"}}>RECENT SESSIONS</h3>
          {sessions.slice(0,3).map(sess=>(
            <div key={sess.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:13,color:"#ccc"}}>{new Date(sess.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</div><div style={{fontSize:11,color:"#555",marginTop:2}}>{sess.exercises.length} exercises · {Math.round(sess.duration/60)}m</div></div>
              <div style={{fontSize:18,fontWeight:700,color:sess.avgRating>=4?"#2E8B57":sess.avgRating>=3?"#D4A017":"#E8453C"}}>{sess.avgRating?.toFixed(1)||"—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// SESSION VIEW
// ═══════════════════════════════════════
function SessionView({exercises,onRate,onFinish,onOpenExercise}){
  const allDone=exercises.every(e=>e.completed);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h2 style={{fontSize:18,fontWeight:700,margin:0,color:"#fff"}}>SESSION</h2>
        <button onClick={onFinish} style={{background:allDone?"#E8453C":"none",border:allDone?"none":"1px solid #333",color:allDone?"#fff":"#666",padding:"8px 16px",fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:1}}>{allDone?"FINISH":"END EARLY"}</button>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:24}}>{exercises.map((ex,i)=>(<div key={i} style={{flex:1,height:4,background:ex.completed?(ex.rating>=4?"#2E8B57":ex.rating>=3?"#D4A017":"#E8453C"):"#1a1a1d",transition:"background 0.3s"}}/>))}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {exercises.map(ex=>{const cat=CATEGORIES[ex.category]||{label:ex.category,color:"#666"};return(
          <button key={ex.id} onClick={()=>!ex.completed&&onOpenExercise(ex)} style={{background:ex.completed?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)",border:`1px solid ${ex.completed?"#1a1a1d":"#2a2a2d"}`,padding:"16px",fontFamily:"inherit",cursor:ex.completed?"default":"pointer",textAlign:"left",opacity:ex.completed?0.5:1,transition:"all 0.2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,color:ex.completed?"#666":"#fff",fontWeight:600}}>{ex.name}</div><div style={{display:"flex",gap:8,marginTop:6,alignItems:"center"}}><span style={{fontSize:10,color:cat.color,letterSpacing:1}}>{cat.label.toUpperCase()}</span>{ex.currentBPM>0&&<span style={{fontSize:10,color:"#444"}}>· {ex.currentBPM} BPM</span>}</div></div>
              {ex.completed?<div style={{fontSize:20,fontWeight:700,color:ex.rating>=4?"#2E8B57":ex.rating>=3?"#D4A017":"#E8453C"}}>{ex.rating}/5</div>:<span style={{color:"#333",fontSize:20}}>→</span>}
            </div>
          </button>);})}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// EXERCISE VIEW
// ═══════════════════════════════════════
function ExerciseView({exercise,onRate,onBack}){
  const met=useMetronome();const timer=useTimer();const pitch=usePitchDetection();const [showR,setShowR]=useState(false);
  useEffect(()=>{if(exercise.currentBPM>0)met.setBpm(exercise.currentBPM);timer.start();return()=>{timer.stop();met.stop();};},[]);
  const cat=CATEGORIES[exercise.category]||{label:exercise.category,color:"#666"};
  if(showR)return(
    <div style={{minHeight:"80vh",display:"flex",flexDirection:"column",justifyContent:"center"}}>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 4px",color:"#fff"}}>How'd it go?</h2>
      <p style={{color:"#555",fontSize:12,margin:"0 0 24px"}}>{exercise.name} · {timer.formatted}</p>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {RATINGS.map(r=>(<button key={r.value} onClick={()=>onRate(r.value,timer.seconds,met.bpm)} style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1a1a1d",color:"#ccc",padding:"14px 16px",fontSize:14,fontFamily:"inherit",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",transition:"all 0.15s"}}><span style={{fontWeight:600}}>{r.value} — {r.label}</span><span style={{fontSize:11,color:"#555"}}>{r.desc}</span></button>))}
      </div>
    </div>
  );
  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:"#555",fontSize:12,fontFamily:"inherit",cursor:"pointer",padding:"0 0 16px",letterSpacing:1}}>← BACK</button>
      <div style={{marginBottom:24}}><span style={{fontSize:10,color:cat.color,letterSpacing:2}}>{cat.label.toUpperCase()}</span><h2 style={{fontSize:22,fontWeight:700,margin:"4px 0 8px",color:"#fff"}}>{exercise.name}</h2><p style={{color:"#777",fontSize:13,margin:0,lineHeight:1.5}}>{exercise.description}</p></div>
      <div style={{textAlign:"center",marginBottom:28,padding:"20px 0",borderTop:"1px solid #1a1a1d",borderBottom:"1px solid #1a1a1d"}}><div style={{fontSize:48,fontWeight:700,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{timer.formatted}</div></div>
      {exercise.currentBPM>0&&(
        <div style={{marginBottom:24}}>
          <h3 style={{fontSize:11,letterSpacing:2,color:"#555",margin:"0 0 12px"}}>METRONOME</h3>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:12}}>
            <button onClick={()=>met.isPlaying?met.stop():met.start()} style={{width:48,height:48,background:met.isPlaying?"#E8453C":"rgba(255,255,255,0.05)",border:met.isPlaying?"none":"1px solid #333",color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{met.isPlaying?"■":"▶"}</button>
            <div style={{flex:1}}><input type="range" min={30} max={240} value={met.bpm} onChange={e=>met.setBpm(Number(e.target.value))} style={{width:"100%",accentColor:"#E8453C"}}/></div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",minWidth:60,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{met.bpm}</div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>{[0,1,2,3].map(i=>(<div key={i} style={{width:12,height:12,borderRadius:"50%",background:met.isPlaying&&met.beat===i?(i===0?"#E8453C":"#D4A017"):"#1a1a1d",transition:"background 0.05s"}}/>))}</div>
          {exercise.targetBPM>0&&<div style={{fontSize:10,color:"#444",textAlign:"center",marginTop:8}}>Target: {exercise.targetBPM} BPM</div>}
        </div>
      )}
      <div style={{marginBottom:28}}>
        <h3 style={{fontSize:11,letterSpacing:2,color:"#555",margin:"0 0 12px"}}>TUNER</h3>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={()=>pitch.isListening?pitch.stopListening():pitch.startListening()} style={{width:48,height:48,background:pitch.isListening?"#2E8B57":"rgba(255,255,255,0.05)",border:pitch.isListening?"none":"1px solid #333",color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{pitch.isListening?"●":"🎤"}</button>
          {pitch.note?(<div style={{flex:1}}><div style={{fontSize:28,fontWeight:700,color:"#fff"}}>{pitch.note.full}<span style={{fontSize:14,color:pitch.note.cents>5?"#E8453C":pitch.note.cents<-5?"#D4A017":"#2E8B57",marginLeft:8}}>{pitch.note.cents>0?"+":""}{pitch.note.cents}¢</span></div><div style={{fontSize:11,color:"#555"}}>{pitch.pitch} Hz</div></div>):(<div style={{color:"#444",fontSize:13}}>{pitch.isListening?"Play a note...":"Tap to enable"}</div>)}
        </div>
      </div>
      <button onClick={()=>{timer.stop();met.stop();pitch.stopListening();setShowR(true);}} style={{width:"100%",background:"#E8453C",border:"none",color:"#fff",padding:"16px",fontSize:14,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:1}}>DONE — RATE IT</button>
    </div>
  );
}

// ═══════════════════════════════════════
// LIBRARY VIEW
// ═══════════════════════════════════════
function LibraryView({exercises,onAdd}){
  const grouped={};exercises.forEach(ex=>{if(!grouped[ex.category])grouped[ex.category]=[];grouped[ex.category].push(ex);});
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><h2 style={{fontSize:18,fontWeight:700,margin:0,color:"#fff"}}>LIBRARY</h2><button onClick={onAdd} style={{background:"rgba(232,69,60,0.15)",border:"1px solid #E8453C",color:"#E8453C",padding:"8px 16px",fontSize:11,fontFamily:"inherit",fontWeight:600,cursor:"pointer",letterSpacing:1}}>+ ADD</button></div>
      {Object.entries(grouped).map(([ck,exs])=>{const cat=CATEGORIES[ck]||{label:ck,color:"#666"};return(
        <div key={ck} style={{marginBottom:24}}><h3 style={{fontSize:11,letterSpacing:2,color:cat.color,margin:"0 0 8px"}}>{cat.label.toUpperCase()}</h3>
          {exs.map(ex=>(<div key={ex.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"12px 14px",marginBottom:4}}><div style={{fontSize:13,color:"#ccc",fontWeight:600}}>{ex.name}</div><div style={{fontSize:11,color:"#555",marginTop:4}}>{ex.description}</div><div style={{display:"flex",gap:12,marginTop:6}}>{ex.currentBPM>0&&<span style={{fontSize:10,color:"#444"}}>{ex.currentBPM}/{ex.targetBPM} BPM</span>}{ex.lastReview&&<span style={{fontSize:10,color:"#444"}}>Last: {new Date(ex.lastReview).toLocaleDateString()}</span>}<span style={{fontSize:10,color:"#444"}}>Ease: {ex.easeFactor?.toFixed(1)}</span></div></div>))}
        </div>);})}
    </div>
  );
}

// ═══════════════════════════════════════
// ADD EXERCISE VIEW
// ═══════════════════════════════════════
function AddExerciseView({onSave,onBack}){
  const [form,setForm]=useState({name:"",category:"technique",description:"",targetBPM:100,currentBPM:50});
  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:"#555",fontSize:12,fontFamily:"inherit",cursor:"pointer",padding:"0 0 16px",letterSpacing:1}}>← BACK</button>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 24px",color:"#fff"}}>ADD EXERCISE</h2>
      {[{label:"Name",key:"name",type:"text"},{label:"Description",key:"description",type:"text"},{label:"Target BPM",key:"targetBPM",type:"number"},{label:"Starting BPM",key:"currentBPM",type:"number"}].map(f=>(<div key={f.key} style={{marginBottom:16}}><label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:6}}>{f.label.toUpperCase()}</label><input type={f.type} value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:f.type==="number"?Number(e.target.value):e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid #1a1a1d",color:"#fff",padding:"12px",fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/></div>))}
      <div style={{marginBottom:24}}><label style={{fontSize:10,letterSpacing:2,color:"#555",display:"block",marginBottom:6}}>CATEGORY</label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{Object.entries(CATEGORIES).map(([k,c])=>(<button key={k} onClick={()=>setForm(p=>({...p,category:k}))} style={{background:form.category===k?`${c.color}22`:"rgba(255,255,255,0.03)",border:`1px solid ${form.category===k?c.color:"#1a1a1d"}`,color:form.category===k?c.color:"#666",padding:"8px 12px",fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>{c.label}</button>))}</div></div>
      <button onClick={()=>form.name&&onSave(form)} disabled={!form.name} style={{width:"100%",background:form.name?"#E8453C":"#1a1a1d",border:"none",color:form.name?"#fff":"#555",padding:"14px",fontSize:14,fontFamily:"inherit",fontWeight:600,cursor:form.name?"pointer":"default",letterSpacing:1}}>SAVE EXERCISE</button>
    </div>
  );
}

// ═══════════════════════════════════════
// HISTORY VIEW
// ═══════════════════════════════════════
function HistoryView({sessions}){
  if(!sessions.length)return(<div><h2 style={{fontSize:18,fontWeight:700,margin:"0 0 24px",color:"#fff"}}>HISTORY</h2><div style={{textAlign:"center",padding:"60px 20px",color:"#444"}}><div style={{fontSize:32,marginBottom:12}}>◷</div><p style={{fontSize:13}}>No sessions yet. Go practice.</p></div></div>);
  return(
    <div>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 24px",color:"#fff"}}>HISTORY</h2>
      {sessions.map(sess=>(
        <div key={sess.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a1d",padding:"16px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:14,color:"#ccc",fontWeight:600}}>{new Date(sess.date).toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}</div><div style={{fontSize:12,color:"#555"}}>{Math.round(sess.duration/60)}m</div></div>
          {sess.exercises.map((ex,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderTop:i>0?"1px solid #111":"none"}}><span style={{fontSize:12,color:"#888"}}>{ex.name}</span><span style={{fontSize:12,fontWeight:600,color:ex.rating>=4?"#2E8B57":ex.rating>=3?"#D4A017":"#E8453C"}}>{ex.rating!==null?`${ex.rating}/5`:"—"}</span></div>))}
          <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #1a1a1d",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#555",letterSpacing:1}}>AVG RATING</span><span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{sess.avgRating?.toFixed(1)}</span></div>
        </div>
      ))}
    </div>
  );
}
