// Port of MetronomeService.swift (singleton). Same click synthesis: 880 Hz normal, 1760 Hz accent on beat 1,
// 50 ms sine with linear decay at 0.8 amplitude. Uses Web Audio look-ahead scheduling for steady timing.
// Desktop addition: subdivisions (1 = quarters, 2 = eighths, 3 = triplets, 4 = sixteenths). Beats keep the
// iOS accent/normal clicks; the in-between subdivision clicks are a quieter, lower tick.

export const SUBDIVISIONS = [
  { value: 1, label: '♩', name: 'Quarter notes', count: ['1'] },
  { value: 2, label: '♪♪', name: 'Eighth notes', count: ['1', '&'] },
  { value: 3, label: '3', name: 'Triplets', count: ['1', 'trip', 'let'] },
  { value: 4, label: '♬♬', name: 'Sixteenth notes', count: ['1', 'e', '&', 'a'] },
];

// Pick the subdivision an exercise is counted in: the tab's "Count:" line first, then the exercise name/description
export function detectSubdivision(ex) {
  if (!ex) return 1;
  let fromCount = 1;
  const count = (ex.tabNotation?.lines || []).find((l) => /^\s*Count\s*:/i.test(l));
  if (count) {
    const c = count.replace(/^\s*Count\s*:/i, '');
    if (/\b(e|a)\b/.test(c)) fromCount = 4;
    else if (/trip|let/i.test(c)) fromCount = 3;
    else if (/&/.test(c)) fromCount = 2;
  }
  const t = `${ex.name || ''} ${ex.description || ''}`;
  const fromText = /16th|sixteenth/i.test(t) ? 4 : /triplet|swing|shuffle/i.test(t) ? 3 : /eighth|8th/i.test(t) ? 2 : 1;
  // a sparse count line ("1  2 &  & 4 &") can understate the grid the exercise names; use the finer of the two
  return Math.max(fromCount, fromText);
}

class MetronomeService {
  bpm = 80;
  isPlaying = false;
  currentBeat = 0;
  beatsPerMeasure = 4;
  subdivision = 1;
  currentSub = 0;

  #listeners = new Set();
  #ctx = null;
  #normal = null;
  #accent = null;
  #sub = null;
  #subIndex = 0;
  #nextTime = 0;
  #beatCounter = 0;
  #timer = null;
  #uiTimers = [];
  #sources = [];

  subscribe(fn) { this.#listeners.add(fn); return () => this.#listeners.delete(fn); }
  #emit() { this.#listeners.forEach((fn) => fn()); }
  snapshot() { return `${this.bpm}|${this.isPlaying}|${this.currentBeat}|${this.subdivision}|${this.currentSub}`; }

  #ensureAudio() {
    if (this.#ctx) return;
    this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.#normal = this.#click(880, 0.05);
    this.#accent = this.#click(1760, 0.05);
    this.#sub = this.#click(660, 0.03, 0.35);
  }

  #click(frequency, duration, amp = 0.8) {
    const sr = this.#ctx.sampleRate;
    const n = Math.floor(sr * duration);
    const buf = this.#ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = Math.max(0, 1 - t / duration);
      d[i] = Math.sin(2 * Math.PI * frequency * t) * env * amp;
    }
    return buf;
  }

  start() {
    if (this.isPlaying) return;
    this.#ensureAudio();
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    this.isPlaying = true;
    this.currentBeat = 0;
    this.#beatCounter = 0;
    this.#subIndex = 0;
    this.currentSub = 0;
    this.#nextTime = this.#ctx.currentTime + 0.03; // fire immediately for first beat
    this.#schedule();
    this.#timer = setInterval(() => this.#schedule(), 25);
    this.#emit();
  }

  #schedule() {
    while (this.#nextTime < this.#ctx.currentTime + 0.12) {
      const subdiv = this.subdivision;
      if (this.#subIndex >= subdiv) { this.#subIndex = 0; this.#beatCounter += 1; }
      const sub = this.#subIndex;
      const beat = (this.#beatCounter % this.beatsPerMeasure) + 1;
      const src = this.#ctx.createBufferSource();
      src.buffer = sub > 0 ? this.#sub : beat === 1 ? this.#accent : this.#normal;
      src.connect(this.#ctx.destination);
      src.start(this.#nextTime);
      this.#sources.push(src);
      src.onended = () => { this.#sources = this.#sources.filter((x) => x !== src); };
      const delayMs = Math.max(0, (this.#nextTime - this.#ctx.currentTime) * 1000);
      const id = setTimeout(() => {
        if (!this.isPlaying) return;
        this.currentBeat = beat;
        this.currentSub = sub;
        this.#emit();
      }, delayMs);
      this.#uiTimers.push(id);
      if (this.#uiTimers.length > 64) this.#uiTimers.splice(0, 32);
      this.#subIndex += 1;
      if (this.#subIndex >= subdiv) { this.#subIndex = 0; this.#beatCounter += 1; }
      this.#nextTime += 60 / this.bpm / subdiv;
    }
  }

  stop() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    this.#uiTimers.forEach(clearTimeout);
    this.#uiTimers = [];
    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this.currentBeat = 0;
    this.currentSub = 0;
    // cancel clicks already scheduled ahead
    this.#sources.forEach((src) => { try { src.stop(); } catch { /* already ended */ } });
    this.#sources = [];
    void wasPlaying;
    this.#emit();
  }

  toggle() { this.isPlaying ? this.stop() : this.start(); }

  setBPM(newBPM) {
    this.bpm = Math.max(30, Math.min(300, Math.trunc(newBPM)));
    if (this.isPlaying) { this.stop(); this.start(); } else this.#emit();
  }

  // Takes effect on the next tick while playing, no restart
  setSubdivision(n) {
    const v = [1, 2, 3, 4].includes(n) ? n : 1;
    if (v === this.subdivision) return;
    this.subdivision = v;
    this.#emit();
  }

  incrementBPM(by = 5) { this.setBPM(this.bpm + by); }
  decrementBPM(by = 5) { this.setBPM(this.bpm - by); }
}

export const metronome = new MetronomeService();
