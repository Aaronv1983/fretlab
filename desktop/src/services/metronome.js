// Port of MetronomeService.swift (singleton). Same click synthesis: 880 Hz normal, 1760 Hz accent on beat 1,
// 50 ms sine with linear decay at 0.8 amplitude. Uses Web Audio look-ahead scheduling for steady timing.

class MetronomeService {
  bpm = 80;
  isPlaying = false;
  currentBeat = 0;
  beatsPerMeasure = 4;

  #listeners = new Set();
  #ctx = null;
  #normal = null;
  #accent = null;
  #nextTime = 0;
  #beatCounter = 0;
  #timer = null;
  #uiTimers = [];
  #sources = [];

  subscribe(fn) { this.#listeners.add(fn); return () => this.#listeners.delete(fn); }
  #emit() { this.#listeners.forEach((fn) => fn()); }
  snapshot() { return `${this.bpm}|${this.isPlaying}|${this.currentBeat}`; }

  #ensureAudio() {
    if (this.#ctx) return;
    this.#ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.#normal = this.#click(880, 0.05);
    this.#accent = this.#click(1760, 0.05);
  }

  #click(frequency, duration) {
    const sr = this.#ctx.sampleRate;
    const n = Math.floor(sr * duration);
    const buf = this.#ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const env = Math.max(0, 1 - t / duration);
      d[i] = Math.sin(2 * Math.PI * frequency * t) * env * 0.8;
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
    this.#nextTime = this.#ctx.currentTime + 0.03; // fire immediately for first beat
    this.#schedule();
    this.#timer = setInterval(() => this.#schedule(), 25);
    this.#emit();
  }

  #schedule() {
    const interval = 60 / this.bpm;
    while (this.#nextTime < this.#ctx.currentTime + 0.12) {
      const beat = (this.#beatCounter % this.beatsPerMeasure) + 1;
      const src = this.#ctx.createBufferSource();
      src.buffer = beat === 1 ? this.#accent : this.#normal;
      src.connect(this.#ctx.destination);
      src.start(this.#nextTime);
      this.#sources.push(src);
      src.onended = () => { this.#sources = this.#sources.filter((x) => x !== src); };
      const delayMs = Math.max(0, (this.#nextTime - this.#ctx.currentTime) * 1000);
      const id = setTimeout(() => {
        if (!this.isPlaying) return;
        this.currentBeat = beat;
        this.#emit();
      }, delayMs);
      this.#uiTimers.push(id);
      if (this.#uiTimers.length > 64) this.#uiTimers.splice(0, 32);
      this.#beatCounter += 1;
      this.#nextTime += interval;
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

  incrementBPM(by = 5) { this.setBPM(this.bpm + by); }
  decrementBPM(by = 5) { this.setBPM(this.bpm - by); }
}

export const metronome = new MetronomeService();
