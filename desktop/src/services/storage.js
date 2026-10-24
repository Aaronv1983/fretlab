// UserDefaults equivalent (keys match the iOS app)
export const KEYS = {
  progress: 'fretlab_routine_progress',
  skills: 'fretlab_skill_proficiencies',
  streak: 'fretlab_streak',
  minutes: 'fretlab_total_minutes',
  lastDate: 'fretlab_last_practice',
  sm2: 'fretlab_sm2_cards',
  customScales: 'fretlab_custom_scales',
  favScales: 'fretlab_fav_scales',
  projects: 'fretlab_solo_projects',
  licks: 'fretlab_lick_library',
  currentRoutine: 'fretlab_current_routine',
  currentDay: 'fretlab_current_day',
};

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    if (value === undefined || value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage unavailable */ }
}

// Calendar helpers
export const DAY = 86400000;
export function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export function daysBetween(fromMs, toMs) {
  // Calendar.dateComponents([.day], from:, to:) between two start-of-days
  const a = new Date(startOfDay(fromMs));
  const b = new Date(startOfDay(toMs));
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY);
}
export function addDays(ms, n) {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
}
export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
