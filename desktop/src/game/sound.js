// Small synthesized reward sounds (no audio files). Muted when Settings → Sound effects is off.
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, gain = 0.18, type = 'sine') {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}
const SEQ = {
  xp: [[1046.5, 0, 0.12], [1568, 0.07, 0.22]],
  correct: [[880, 0, 0.1], [1318.5, 0.06, 0.2]],
  wrong: [[220, 0, 0.18, 0.12, 'triangle'], [196, 0.09, 0.22, 0.1, 'triangle']],
  achievement: [[784, 0, 0.16], [1046.5, 0.09, 0.16], [1568, 0.18, 0.35]],
  goal: [[523.3, 0, 0.18], [659.3, 0.1, 0.18], [784, 0.2, 0.18], [1046.5, 0.3, 0.5]],
  level: [[392, 0, 0.16], [523.3, 0.09, 0.16], [659.3, 0.18, 0.16], [784, 0.27, 0.16], [1046.5, 0.36, 0.6]],
};
export function playSound(name, enabled = true) {
  if (!enabled) return;
  try { (SEQ[name] || []).forEach(([f, s, d, g, t]) => tone(f, s, d, g, t)); } catch { /* audio unavailable */ }
}
