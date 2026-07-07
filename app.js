const STORAGE_KEYS = {
  current: 'gymTracker.current',
  history: 'gymTracker.history',
  customExercises: 'gymTracker.customExercises',
  settings: 'gymTracker.settings',
  pushSubscription: 'gymTracker.pushSubscription',
  deviceId: 'gymTracker.deviceId',
  barPrefs: 'gymTracker.barPrefs',
};

// ---------- App version + changelog (semver: MAJOR.MINOR.PATCH) ----------
// Newest first. Bump MINOR for features, PATCH for fixes. Displayed in Settings.
const APP_VERSION = '1.12.0';
const CHANGELOG = [
  { version: '1.12.0', date: '2026-07-07', changes: [
    'New name & logo: welcome to IronLog',
    'Fixed the changelog being hard to read on phones',
  ] },
  { version: '1.11.0', date: '2026-07-07', changes: [
    'Swipe left/right to switch between Today, History and Stats',
    'New Progress tab: estimated 1-rep-max trend chart per exercise',
    'Overview now shows this-week volume vs last week and training frequency',
    'Muscles tab shows when each group was last trained (flags neglected ones)',
    'Records now include estimated 1RM, not just top weight',
  ] },
  { version: '1.10.0', date: '2026-07-06', changes: [
    'Swipe left-to-right on any sheet to close it',
    'Fixed Settings not closing when the changelog was open',
    'With a bar selected, weight chips now add plates on top of the bar (bar + plates = total)',
  ] },
  { version: '1.9.0', date: '2026-07-04', changes: [
    'Tap the rest timer to stop it; Add Set restarts your rest countdown',
    'Set barbell & curl-bar weights in Settings — auto-included when logging',
    'Light / dark theme toggle in Settings',
    'Live workout duration timer on the Today screen, saved to history',
    'Backup & restore all your data to a file (protects against data loss)',
    'This changelog + app version now shown in Settings',
  ] },
  { version: '1.8.3', date: '2026-07-04', changes: [
    'Fixed title & settings icon overlapping the iPhone status bar',
  ] },
  { version: '1.8.2', date: '2026-07-04', changes: [
    'Fixed kg/lbs weights drifting slightly after repeated unit switches',
  ] },
  { version: '1.8.1', date: '2026-07-04', changes: [
    'Fixed exercise picker needing a double-tap on iPhone',
  ] },
  { version: '1.8.0', date: '2026-07-04', changes: [
    'Background push notifications when rest ends (Home Screen app)',
  ] },
  { version: '1.7.0', date: '2026-07-03', changes: [
    'Rest timer: on-screen countdown, sound, and screen-wake during rest',
    'Notifications setting for rest alerts',
  ] },
  { version: '1.6.0', date: '2026-07-03', changes: [
    'Export workout history to CSV for analysis',
    'Watch-form video links on every exercise',
  ] },
  { version: '1.5.0', date: '2026-07-03', changes: [
    'Auto-minimize previous exercises when you add a new one',
    'Per-set date/time recorded in the background',
  ] },
  { version: '1.4.0', date: '2026-07-03', changes: [
    'Stats tab: overview, muscle split, and personal records',
    'Delete a whole day or a single exercise from history',
  ] },
  { version: '1.3.0', date: '2026-07-03', changes: [
    'Tap-to-pick weight & reps chips to reduce typing',
    'kg / lbs unit setting with automatic conversion',
  ] },
  { version: '1.2.0', date: '2026-07-03', changes: [
    'Muscle-group exercise picker with body diagram and color badges',
  ] },
  { version: '1.1.0', date: '2026-07-01', changes: [
    'Muscle-group categories and "last time" reference per exercise',
  ] },
  { version: '1.0.0', date: '2026-07-01', changes: [
    'Log workouts: exercises, sets, reps, weight, and history',
  ] },
];

// Backend that schedules rest-timer push notifications (Cloudflare Worker).
// Empty string disables all push scheduling (app works exactly as before).
const PUSH_BACKEND_URL = 'https://gym-tracker-push.vikthorrr.workers.dev';
const VAPID_PUBLIC_KEY = 'BKc2-Mwi1MtewHKkTrPJsQ6pDK9esuXCsNkqX3YCxHCRZl445qNaf6VfAhpY0beVQTKVxg5gZ6Z49zcR7d00pOo';

const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', color: '#ff6b6b' },
  { id: 'back', label: 'Back', color: '#4dabf7' },
  { id: 'shoulders', label: 'Shoulders', color: '#ffd43b' },
  { id: 'arms', label: 'Arms', color: '#b197fc' },
  { id: 'legs', label: 'Legs', color: '#51cf66' },
  { id: 'core', label: 'Core', color: '#ff922b' },
];
const CUSTOM_GROUP = { id: 'custom', label: 'Other', color: '#868e96' };

const EXERCISE_LIBRARY = {
  chest: ['Bench Press', 'Incline Bench Press', 'Dumbbell Press', 'Incline Dumbbell Press', 'Push-Up', 'Cable Fly', 'Chest Dip', 'Machine Chest Press'],
  back: ['Deadlift', 'Pull-Up', 'Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'T-Bar Row', 'Single-Arm Dumbbell Row', 'Face Pull'],
  shoulders: ['Overhead Press', 'Dumbbell Shoulder Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Arnold Press', 'Upright Row'],
  arms: ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension', 'Preacher Curl', 'Dips'],
  legs: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Lunge', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Bulgarian Split Squat'],
  core: ['Plank', 'Cable Crunch', 'Hanging Leg Raise', 'Russian Twist', 'Sit-Up', 'Ab Wheel Rollout'],
};

const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;

function groupMeta(id) {
  return MUSCLE_GROUPS.find(g => g.id === id) || CUSTOM_GROUP;
}

const exerciseCardTpl = document.getElementById('exercise-card-template');
const setRowTpl = document.getElementById('set-row-template');
const exerciseList = document.getElementById('exercise-list');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const exportCsvBtn = document.getElementById('export-csv-btn');
const sessionDateEl = document.getElementById('session-date');
const finishBtn = document.getElementById('finish-btn');
const muscleSummaryEl = document.getElementById('muscle-summary');

const openPickerBtn = document.getElementById('open-picker-btn');
const closePickerBtn = document.getElementById('close-picker-btn');
const pickerOverlay = document.getElementById('picker-overlay');
const pickerGroups = document.getElementById('picker-groups');
const pickerExercises = document.getElementById('picker-exercises');
const pickerSearch = document.getElementById('picker-search');
const customExerciseForm = document.getElementById('custom-exercise-form');
const customExerciseInput = document.getElementById('custom-exercise-input');
const muscleDiagramEl = document.getElementById('muscle-diagram');

const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
// Only the real lbs/kg buttons — other controls reuse .unit-btn for styling.
const unitButtons = document.querySelectorAll('.unit-btn[data-unit]');
const restTimerSwitch = document.getElementById('rest-timer-switch');
const restDurationChipsEl = document.getElementById('rest-duration-chips');
const notificationPermissionBtn = document.getElementById('notification-permission-btn');
const notificationPermissionHint = document.getElementById('notification-permission-hint');
const REST_DURATION_OPTIONS = [30, 60, 90, 120, 180];

const themeButtons = document.querySelectorAll('.theme-btn');
const barbellWeightInput = document.getElementById('barbell-weight-input');
const curlBarWeightInput = document.getElementById('curl-bar-weight-input');
const unitLabels = document.querySelectorAll('.unit-label');
const exportBackupBtn = document.getElementById('export-backup-btn');
const importBackupBtn = document.getElementById('import-backup-btn');
const importBackupInput = document.getElementById('import-backup-input');
const appVersionEl = document.getElementById('app-version');
const toggleChangelogBtn = document.getElementById('toggle-changelog-btn');
const changelogListEl = document.getElementById('changelog-list');

const statsEmpty = document.getElementById('stats-empty');
const statsOverviewEl = document.getElementById('stats-overview');
const statsProgressEl = document.getElementById('stats-progress');
const statsSplitEl = document.getElementById('stats-split');
const statsRecordsEl = document.getElementById('stats-records');

let current = loadCurrent();
let history = loadHistory();
let customExercises = loadCustomExercises();
let settings = loadSettings();
let barPrefs = loadBarPrefs();
let activeGroupId = 'all';

// ---------- Theme ----------
function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings.theme === 'light' ? 'light' : 'dark');
  const themeColor = settings.theme === 'light' ? '#f4f5f7' : '#0f1115';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColor);
}
applyTheme();

// ---------- Bar weight helpers ----------
const BAR_TYPES = {
  none: { label: 'No bar', weight: () => 0 },
  barbell: { label: 'Barbell', weight: () => Number(settings.barbellWeight) || 0 },
  curl: { label: 'Curl bar', weight: () => Number(settings.curlBarWeight) || 0 },
};

function exerciseBar(exercise) {
  return exercise.bar && BAR_TYPES[exercise.bar] ? exercise.bar : 'none';
}
function barWeightFor(exercise) {
  return BAR_TYPES[exerciseBar(exercise)].weight();
}

function loadCurrent() {
  const raw = localStorage.getItem(STORAGE_KEYS.current);
  if (raw) return JSON.parse(raw);
  return { date: new Date().toISOString(), exercises: [] };
}

function loadHistory() {
  const raw = localStorage.getItem(STORAGE_KEYS.history);
  return raw ? JSON.parse(raw) : [];
}

function loadCustomExercises() {
  const raw = localStorage.getItem(STORAGE_KEYS.customExercises);
  return raw ? JSON.parse(raw) : [];
}

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.settings);
  const defaults = {
    unit: 'lbs',
    restTimerEnabled: false,
    restDuration: 90,
    theme: 'dark',
    barbellWeight: 45,   // Olympic barbell (lbs default)
    curlBarWeight: 25,   // EZ / curl bar (lbs default)
  };
  return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
}

function loadBarPrefs() {
  const raw = localStorage.getItem(STORAGE_KEYS.barPrefs);
  return raw ? JSON.parse(raw) : {};
}
function saveBarPrefs() { localStorage.setItem(STORAGE_KEYS.barPrefs, JSON.stringify(barPrefs)); }

function saveCurrent() { localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(current)); }
function saveHistory() { localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history)); }
function saveCustomExercises() { localStorage.setItem(STORAGE_KEYS.customExercises, JSON.stringify(customExercises)); }
function saveSettings() { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings)); }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Rounds a stored weight value to 1 decimal for display, without touching
// the underlying stored precision (which may carry extra decimals from
// unit conversion so repeated kg/lbs toggling doesn't drift).
function formatWeight(value) {
  if (value === '' || value === undefined || value === null) return value ?? '';
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return value;
  return String(Math.round(num * 10) / 10);
}

function findMuscleGroupForName(name) {
  const lower = name.toLowerCase();
  for (const [groupId, names] of Object.entries(EXERCISE_LIBRARY)) {
    if (names.some(n => n.toLowerCase() === lower)) return groupId;
  }
  const custom = customExercises.find(e => e.name.toLowerCase() === lower);
  if (custom) return custom.muscleGroup;
  return CUSTOM_GROUP.id;
}

function findLastPerformance(name) {
  for (const session of history) {
    const ex = session.exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (ex && ex.sets.length) {
      const best = ex.sets[ex.sets.length - 1];
      return `Last: ${formatDate(session.date)} — ${formatWeight(best.weight)}×${best.reps}`;
    }
  }
  return '';
}

function addExerciseToSession(name, muscleGroup) {
  current.exercises.forEach((_, i) => {
    minimizedByExercise[i] = true;
    resetRestTrackingFor(i);
  });
  // Mark the workout start the first time an exercise is added.
  if (!current.startedAt) {
    current.startedAt = new Date().toISOString();
  }
  const bar = barPrefs[name.toLowerCase()] || 'none';
  const startWeight = bar !== 'none' ? formatWeight(BAR_TYPES[bar].weight()) : '';
  current.exercises.push({ name, muscleGroup, bar, sets: [{ weight: startWeight, reps: '' }] });
  saveCurrent();
  renderExercises();
  renderMuscleSummary();
  renderWorkoutDuration();
}

// ---------- Muscle summary chips ----------

function countSetsByGroup(exercises) {
  const counts = {};
  exercises.forEach(ex => {
    const completedSets = ex.sets.filter(s => s.weight !== '' && s.reps !== '').length || ex.sets.length;
    counts[ex.muscleGroup] = (counts[ex.muscleGroup] || 0) + completedSets;
  });
  return counts;
}

function renderChipsHtml(counts) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([groupId, count]) => {
      const meta = groupMeta(groupId);
      return `<span class="muscle-chip" style="--chip-color:${meta.color}">${meta.label} · ${count}</span>`;
    })
    .join('');
}

function renderMuscleSummary() {
  const counts = countSetsByGroup(current.exercises);
  const html = renderChipsHtml(counts);
  muscleSummaryEl.innerHTML = html;
  muscleSummaryEl.hidden = html === '';
}

// ---------- Today tab rendering ----------

const REPS_CHIPS = [5, 8, 10, 12, 15];
const DEFAULT_WEIGHT_LADDER = { lbs: [45, 95, 135, 185, 225], kg: [20, 40, 60, 80, 100] };
const CHIP_WEIGHT_STEP = { lbs: 5, kg: 2.5 };

let activeSetIndexByExercise = {};
let lastSetCompletionTime = {};
let notifiedRestByExercise = {};
let minimizedByExercise = {};

function resetRestTrackingFor(exIndex) {
  delete lastSetCompletionTime[exIndex];
  delete notifiedRestByExercise[exIndex];
  cancelPush(exIndex);
  updateWakeLock();
}

// Tap the timer to stop it (clears clock, hides timer, cancels the push).
function stopRestTimer(exIndex) {
  resetRestTrackingFor(exIndex);
  renderRestTimer(exIndex);
}

// Restart the rest countdown from zero (used by "Add Set").
function restartRestTimer(exIndex) {
  if (!settings.restTimerEnabled) return;
  lastSetCompletionTime[exIndex] = Date.now();
  notifiedRestByExercise[exIndex] = false;
  renderRestTimer(exIndex);
  updateWakeLock();
  schedulePush(exIndex, current.exercises[exIndex].name);
}

function isSetComplete(set) {
  return set.weight !== '' && set.reps !== '';
}

// Rebuilds the in-memory rest-timer clocks from the persisted `completedAt`
// timestamps on each set, so the timer resumes correctly even if iOS fully
// reloaded the page while the tab was backgrounded.
function reconstructRestTracking() {
  current.exercises.forEach((exercise, exIndex) => {
    let latest = null;
    exercise.sets.forEach(set => {
      if (set.completedAt) {
        const t = new Date(set.completedAt).getTime();
        if (!latest || t > latest) latest = t;
      }
    });
    if (latest) lastSetCompletionTime[exIndex] = latest;
  });
}

function handleSetCompletionCheck(exIndex, setIndex) {
  const set = current.exercises[exIndex].sets[setIndex];
  if (!isSetComplete(set) || set.completedAt !== undefined) return;

  const now = Date.now();
  const lastTime = lastSetCompletionTime[exIndex];
  if (lastTime && setIndex > 0) {
    set.restSeconds = Math.round((now - lastTime) / 1000);
  }
  set.completedAt = new Date(now).toISOString();
  lastSetCompletionTime[exIndex] = now;
  notifiedRestByExercise[exIndex] = false;
  saveCurrent();
  renderRestTimer(exIndex);
  updateWakeLock();
  schedulePush(exIndex, current.exercises[exIndex].name);
}

function formatRestTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Live "how long have I been working out" clock on the Today screen.
function renderWorkoutDuration() {
  const el = document.getElementById('workout-duration');
  if (!el) return;
  if (current.exercises.length === 0 || !current.startedAt) {
    el.hidden = true;
    return;
  }
  const secs = Math.max(0, Math.round((Date.now() - new Date(current.startedAt).getTime()) / 1000));
  el.hidden = false;
  el.textContent = `⏱ ${formatDuration(secs)}`;
}

function renderRestTimer(exIndex) {
  const card = exerciseList.children[exIndex];
  if (!card) return;
  const timerEl = card.querySelector('.rest-timer');
  if (!timerEl) return;

  const lastTime = lastSetCompletionTime[exIndex];
  if (!settings.restTimerEnabled || !lastTime) {
    timerEl.hidden = true;
    return;
  }

  const elapsed = Math.round((Date.now() - lastTime) / 1000);
  const ready = elapsed >= settings.restDuration;
  timerEl.hidden = false;
  timerEl.classList.toggle('ready', ready);
  timerEl.querySelector('.rest-timer-value').textContent = formatRestTime(elapsed);
  timerEl.querySelector('.rest-timer-hint').textContent = ready ? 'Time for your next set! · tap to stop' : 'rest · tap to stop';

  if (ready && !notifiedRestByExercise[exIndex]) {
    notifiedRestByExercise[exIndex] = true;
    const exerciseName = current.exercises[exIndex] ? current.exercises[exIndex].name : 'your exercise';
    playRestBeep();
    notifyRestComplete(exerciseName);
    updateWakeLock();
  }
}

function tickRestTimers() {
  if (!settings.restTimerEnabled) return;
  Object.keys(lastSetCompletionTime).forEach(exIndex => renderRestTimer(Number(exIndex)));
}

setInterval(() => {
  tickRestTimers();
  renderWorkoutDuration();
}, 1000);

function playRestBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // audio not available, ignore
  }
}

function notifyRestComplete(exerciseName) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification('Rest complete', {
      body: `Time for your next set — ${exerciseName}`,
      icon: 'apple-touch-icon.png',
      tag: 'gym-tracker-rest',
    });
  } catch (e) {
    // Notification constructor can throw on some mobile browsers; ignore.
  }
}

// ---------- Web Push scheduling (real notifications while the app is
// backgrounded — requires the push backend and, on iOS, Home Screen install) ----------

function getDeviceId() {
  let id = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.deviceId, id);
  }
  return id;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function ensurePushSubscription() {
  if (!PUSH_BACKEND_URL) return null;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return null;
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    localStorage.setItem(STORAGE_KEYS.pushSubscription, JSON.stringify(sub.toJSON()));
    return sub.toJSON();
  } catch (e) {
    return null;
  }
}

function getStoredPushSubscription() {
  const raw = localStorage.getItem(STORAGE_KEYS.pushSubscription);
  return raw ? JSON.parse(raw) : null;
}

function pushJobId(exIndex) {
  return `${getDeviceId()}-ex${exIndex}`;
}

function schedulePush(exIndex, exerciseName) {
  if (!PUSH_BACKEND_URL || !settings.restTimerEnabled) return;
  const subscription = getStoredPushSubscription();
  if (!subscription) return;
  fetch(`${PUSH_BACKEND_URL}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      id: pushJobId(exIndex),
      subscription,
      delayMs: settings.restDuration * 1000,
      title: 'Rest complete',
      body: `Time for your next set — ${exerciseName}`,
    }),
  }).catch(() => {});
}

function cancelPush(exIndex) {
  if (!PUSH_BACKEND_URL) return;
  if (!getStoredPushSubscription()) return;
  fetch(`${PUSH_BACKEND_URL}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ id: pushJobId(exIndex) }),
  }).catch(() => {});
}

function cancelAllPush() {
  current.exercises.forEach((_, i) => cancelPush(i));
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- Screen Wake Lock (keeps the phone awake during rest so the
// timer/beep isn't missed to an auto-locked screen) ----------

let wakeLock = null;

function anyRestTimerActive() {
  return settings.restTimerEnabled && Object.keys(lastSetCompletionTime).length > 0;
}

async function updateWakeLock() {
  if (!('wakeLock' in navigator)) return;
  const shouldHold = anyRestTimerActive();
  if (shouldHold && !wakeLock) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) {
      // permission denied, low battery, etc. — ignore
    }
  } else if (!shouldHold && wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  // A same-session tab (not a fresh reload) already has correct in-memory
  // state; this just repaints immediately and re-acquires the wake lock,
  // which the browser auto-releases whenever the page is hidden.
  tickRestTimers();
  updateWakeLock();
});

function getReferenceWeight(exIndex, name) {
  const ex = current.exercises[exIndex];
  for (let i = ex.sets.length - 1; i >= 0; i--) {
    const w = parseFloat(ex.sets[i].weight);
    if (Number.isFinite(w)) return w;
  }
  for (const session of history) {
    const match = session.exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (match && match.sets.length) {
      const w = parseFloat(match.sets[match.sets.length - 1].weight);
      if (Number.isFinite(w)) return w;
    }
  }
  return null;
}

function weightChipValues(exIndex, name) {
  const ref = getReferenceWeight(exIndex, name);
  const step = CHIP_WEIGHT_STEP[settings.unit] || 5;
  const round1 = (v) => Math.round(v * 10) / 10;
  if (ref != null) {
    return [ref - step * 2, ref - step, ref, ref + step, ref + step * 2].filter(v => v > 0).map(round1);
  }
  return DEFAULT_WEIGHT_LADDER[settings.unit] || DEFAULT_WEIGHT_LADDER.lbs;
}

// When a bar is selected, the bottom chips are "added" weight (plates) and the
// set records bar + plates. Centres on the plates from your last total.
const DEFAULT_PLATE_LADDER = { lbs: [0, 25, 45, 90, 135], kg: [0, 10, 20, 40, 60] };
function plateChipValues(exIndex, name, barW) {
  const step = CHIP_WEIGHT_STEP[settings.unit] || 5;
  const round1 = (v) => Math.round(v * 10) / 10;
  const ref = getReferenceWeight(exIndex, name);
  if (ref != null && ref - barW > 0) {
    const p = ref - barW;
    return [p - step * 2, p - step, p, p + step, p + step * 2].filter(v => v >= 0).map(round1);
  }
  return DEFAULT_PLATE_LADDER[settings.unit] || DEFAULT_PLATE_LADDER.lbs;
}

function setMinimized(exIndex, minimized) {
  minimizedByExercise[exIndex] = minimized;
  const card = exerciseList.children[exIndex];
  if (!card) return;
  card.classList.toggle('minimized', minimized);
  card.querySelector('.toggle-collapse-btn').textContent = minimized ? '⌃' : '⌄';
}

function renderExercises() {
  exerciseList.innerHTML = '';
  current.exercises.forEach((exercise, exIndex) => {
    const card = exerciseCardTpl.content.cloneNode(true);
    const meta = groupMeta(exercise.muscleGroup);
    const cardEl = card.querySelector('.exercise-card');

    const badge = card.querySelector('.muscle-badge');
    badge.textContent = meta.label;
    badge.style.setProperty('--badge-color', meta.color);

    card.querySelector('.exercise-name').textContent = exercise.name;
    card.querySelector('.card-watch-form').href = youtubeFormSearchUrl(exercise.name);
    card.querySelector('.last-time').textContent = findLastPerformance(exercise.name);
    card.querySelector('.weight-head-label').textContent = `Weight (${settings.unit})`;
    card.querySelector('.complete-badge').hidden = !(exercise.sets.length > 0 && exercise.sets.every(isSetComplete));

    const isMinimized = !!minimizedByExercise[exIndex];
    cardEl.classList.toggle('minimized', isMinimized);
    const collapseBtn = card.querySelector('.toggle-collapse-btn');
    collapseBtn.textContent = isMinimized ? '⌃' : '⌄';
    collapseBtn.addEventListener('click', () => setMinimized(exIndex, !minimizedByExercise[exIndex]));

    if (!(exIndex in activeSetIndexByExercise)) {
      activeSetIndexByExercise[exIndex] = exercise.sets.length - 1;
    }

    // Bar selector: choose which bar this exercise uses; its weight is
    // auto-included so you log the true total instead of adding it by hand.
    const barSelector = card.querySelector('.bar-selector');
    if (barSelector) {
      const currentBar = exerciseBar(exercise);
      barSelector.innerHTML = Object.entries(BAR_TYPES).map(([key, t]) => {
        const w = t.weight();
        const label = key === 'none' ? t.label : `${t.label} ${w ? '(' + formatWeight(w) + ' ' + settings.unit + ')' : ''}`.trim();
        return `<button type="button" class="bar-chip ${key === currentBar ? 'active' : ''}" data-bar="${key}">${label}</button>`;
      }).join('');
      barSelector.querySelectorAll('.bar-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const bar = chip.dataset.bar;
          exercise.bar = bar;
          barPrefs[exercise.name.toLowerCase()] = bar;
          saveBarPrefs();
          const barW = BAR_TYPES[bar].weight();
          const activeIdx = Math.min(activeSetIndexByExercise[exIndex] ?? 0, exercise.sets.length - 1);
          const activeSet = exercise.sets[activeIdx];
          if (bar !== 'none' && barW > 0 && (activeSet.weight === '' || activeSet.weight === undefined)) {
            activeSet.weight = formatWeight(barW);
          }
          saveCurrent();
          renderExercises();
          renderMuscleSummary();
        });
      });
    }

    const setsBody = card.querySelector('.sets-body');
    exercise.sets.forEach((set, setIndex) => {
      setsBody.appendChild(buildSetRow(exIndex, setIndex, set));
    });

    const weightChipRow = card.querySelector('.weight-chip-row');
    const repsChipRow = card.querySelector('.reps-chip-row');

    function refreshChips() {
      const activeIdx = Math.min(activeSetIndexByExercise[exIndex], exercise.sets.length - 1);
      const activeSet = exercise.sets[activeIdx];

      const barW = barWeightFor(exercise);
      const weightLabelEl = card.querySelector('.weight-pick-label');
      if (barW > 0) {
        // Bar selected: chips are added plate weight, and the set records bar + plates.
        if (weightLabelEl) weightLabelEl.textContent = `Weight = ${formatWeight(barW)} ${settings.unit} bar + plates`;
        const currentPlates = formatWeight(Math.max(0, (parseFloat(activeSet.weight) || 0) - barW));
        weightChipRow.innerHTML = plateChipValues(exIndex, exercise.name, barW)
          .map(p => {
            const total = formatWeight(barW + p);
            const active = String(p) === currentPlates ? 'active' : '';
            return `<button type="button" class="quick-chip ${active}" data-total="${total}">+${p}</button>`;
          }).join('');
      } else {
        if (weightLabelEl) weightLabelEl.textContent = 'Weight';
        weightChipRow.innerHTML = weightChipValues(exIndex, exercise.name)
          .map(v => `<button type="button" class="quick-chip ${String(v) === formatWeight(activeSet.weight) ? 'active' : ''}" data-total="${v}">${v}</button>`)
          .join('');
      }
      repsChipRow.innerHTML = REPS_CHIPS
        .map(v => `<button type="button" class="quick-chip ${String(v) === String(activeSet.reps) ? 'active' : ''}" data-value="${v}">${v}</button>`)
        .join('');

      weightChipRow.querySelectorAll('.quick-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const total = chip.dataset.total;
          exercise.sets[activeIdx].weight = total;
          saveCurrent();
          const input = setsBody.querySelector(`.set-row[data-set-index="${activeIdx}"] .weight-input`);
          if (input) input.value = total;
          renderMuscleSummary();
          handleSetCompletionCheck(exIndex, activeIdx);
          updateCompleteBadge(exIndex);
          refreshChips();
        });
      });
      repsChipRow.querySelectorAll('.quick-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const value = chip.dataset.value;
          exercise.sets[activeIdx].reps = value;
          saveCurrent();
          const input = setsBody.querySelector(`.set-row[data-set-index="${activeIdx}"] .reps-input`);
          if (input) input.value = value;
          renderMuscleSummary();
          handleSetCompletionCheck(exIndex, activeIdx);
          updateCompleteBadge(exIndex);
          refreshChips();
        });
      });
    }

    setsBody.querySelectorAll('.set-row').forEach(rowEl => {
      rowEl.addEventListener('focusin', () => {
        activeSetIndexByExercise[exIndex] = Number(rowEl.dataset.setIndex);
        setsBody.querySelectorAll('.set-row').forEach(r => r.classList.toggle('active-set', r === rowEl));
        refreshChips();
      });
    });
    const initialActiveRow = setsBody.querySelector(`.set-row[data-set-index="${activeSetIndexByExercise[exIndex]}"]`);
    if (initialActiveRow) initialActiveRow.classList.add('active-set');

    refreshChips();

    card.querySelector('.add-set-btn').addEventListener('click', () => {
      const last = exercise.sets[exercise.sets.length - 1];
      const barW = barWeightFor(exercise);
      let carryWeight = last ? last.weight : '';
      if ((carryWeight === '' || carryWeight === undefined) && barW > 0) {
        carryWeight = formatWeight(barW);
      }
      exercise.sets.push({ weight: carryWeight, reps: last ? last.reps : '' });
      const newIndex = exercise.sets.length - 1;
      activeSetIndexByExercise[exIndex] = newIndex;
      saveCurrent();
      renderExercises();
      handleSetCompletionCheck(exIndex, newIndex);
      // Explicitly restart the rest countdown for the new set.
      restartRestTimer(exIndex);
    });

    card.querySelector('.remove-exercise-btn').addEventListener('click', () => {
      cancelAllPush();
      current.exercises.splice(exIndex, 1);
      if (current.exercises.length === 0) delete current.startedAt;
      activeSetIndexByExercise = {};
      lastSetCompletionTime = {};
      notifiedRestByExercise = {};
      minimizedByExercise = {};
      saveCurrent();
      renderExercises();
      renderMuscleSummary();
      renderWorkoutDuration();
    });

    const timerEl = cardEl.querySelector('.rest-timer');
    if (timerEl) timerEl.addEventListener('click', () => stopRestTimer(exIndex));

    exerciseList.appendChild(cardEl);
    renderRestTimer(exIndex);
  });
}

function updateCompleteBadge(exIndex) {
  const card = exerciseList.children[exIndex];
  if (!card) return;
  const exercise = current.exercises[exIndex];
  card.querySelector('.complete-badge').hidden = !(exercise.sets.length > 0 && exercise.sets.every(isSetComplete));
}

function buildSetRow(exIndex, setIndex, set) {
  const row = setRowTpl.content.cloneNode(true);
  const rowEl = row.querySelector('.set-row');
  rowEl.dataset.setIndex = setIndex;
  row.querySelector('.set-index').textContent = setIndex + 1;

  const weightInput = row.querySelector('.weight-input');
  const repsInput = row.querySelector('.reps-input');
  weightInput.value = formatWeight(set.weight);
  repsInput.value = set.reps ?? '';

  weightInput.addEventListener('input', () => {
    current.exercises[exIndex].sets[setIndex].weight = weightInput.value;
    saveCurrent();
    renderMuscleSummary();
    handleSetCompletionCheck(exIndex, setIndex);
    updateCompleteBadge(exIndex);
  });
  repsInput.addEventListener('input', () => {
    current.exercises[exIndex].sets[setIndex].reps = repsInput.value;
    saveCurrent();
    renderMuscleSummary();
    handleSetCompletionCheck(exIndex, setIndex);
    updateCompleteBadge(exIndex);
  });

  row.querySelector('.remove-set-btn').addEventListener('click', () => {
    current.exercises[exIndex].sets.splice(setIndex, 1);
    delete activeSetIndexByExercise[exIndex];
    resetRestTrackingFor(exIndex);
    saveCurrent();
    renderExercises();
    renderMuscleSummary();
  });

  return rowEl;
}

// ---------- Muscle hologram diagram ----------

const BODY_PARTS = {
  front: [
    { group: 'shoulders', shape: `<circle cx="20" cy="38" r="9"/><circle cx="70" cy="38" r="9"/>` },
    { group: 'arms', shape: `<rect x="8" y="38" width="12" height="55" rx="6"/><rect x="70" y="38" width="12" height="55" rx="6"/>` },
    { group: 'chest', shape: `<rect x="28" y="32" width="34" height="26" rx="6"/>` },
    { group: 'core', shape: `<rect x="30" y="58" width="30" height="26" rx="6"/>` },
    { group: 'legs', shape: `<rect x="28" y="96" width="14" height="65" rx="7"/><rect x="48" y="96" width="14" height="65" rx="7"/>` },
  ],
  back: [
    { group: 'shoulders', shape: `<circle cx="20" cy="38" r="9"/><circle cx="70" cy="38" r="9"/>` },
    { group: 'arms', shape: `<rect x="8" y="38" width="12" height="55" rx="6"/><rect x="70" y="38" width="12" height="55" rx="6"/>` },
    { group: 'back', shape: `<rect x="28" y="32" width="34" height="52" rx="8"/>` },
    { group: 'legs', shape: `<rect x="28" y="96" width="14" height="65" rx="7"/><rect x="48" y="96" width="14" height="65" rx="7"/>` },
  ],
};

const BODY_SCAFFOLD = `<circle cx="45" cy="14" r="11"/><rect x="39" y="23" width="12" height="8" rx="3"/>`;

function buildBodySvg(view, label) {
  const parts = BODY_PARTS[view]
    .map(part => {
      const active = part.group === activeGroupId;
      const meta = groupMeta(part.group);
      const fill = active ? `${meta.color}55` : 'rgba(255,255,255,0.04)';
      const stroke = active ? meta.color : 'rgba(255,255,255,0.25)';
      const filter = active ? 'filter="drop-shadow(0 0 5px var(--glow-color))"' : '';
      return `<g fill="${fill}" stroke="${stroke}" stroke-width="1.5" style="--glow-color:${meta.color}" ${filter}>${part.shape}</g>`;
    })
    .join('');

  return `
    <div class="body-view">
      <svg viewBox="0 0 90 165" xmlns="http://www.w3.org/2000/svg">
        <g fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.25)" stroke-width="1.5">${BODY_SCAFFOLD}</g>
        ${parts}
      </svg>
      <span class="body-view-label">${label}</span>
    </div>`;
}

function renderMuscleDiagram() {
  muscleDiagramEl.innerHTML = buildBodySvg('front', 'Front') + buildBodySvg('back', 'Back');
}

// ---------- Exercise picker modal ----------

function openPicker() {
  activeGroupId = 'all';
  pickerSearch.value = '';
  renderPickerGroups();
  renderPickerExercises();
  renderMuscleDiagram();
  pickerOverlay.hidden = false;
  pickerSearch.focus();
}

function closePicker() {
  pickerOverlay.hidden = true;
}

function renderPickerGroups() {
  const chips = [{ id: 'all', label: 'All', color: '#7d8590' }, ...MUSCLE_GROUPS];
  pickerGroups.innerHTML = chips
    .map(g => `<button class="picker-chip ${g.id === activeGroupId ? 'active' : ''}" data-group="${g.id}" style="--chip-color:${g.color}">${g.label}</button>`)
    .join('');
  pickerGroups.querySelectorAll('.picker-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeGroupId = btn.dataset.group;
      renderPickerGroups();
      renderPickerExercises();
      renderMuscleDiagram();
    });
  });
}

function youtubeFormSearchUrl(exerciseName) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' proper form')}`;
}

function renderPickerExercises() {
  const query = pickerSearch.value.trim().toLowerCase();
  const groupIds = activeGroupId === 'all' ? MUSCLE_GROUPS.map(g => g.id) : [activeGroupId];

  let html = '';
  groupIds.forEach(groupId => {
    const meta = groupMeta(groupId);
    const names = EXERCISE_LIBRARY[groupId].filter(n => n.toLowerCase().includes(query));
    if (names.length === 0) return;
    html += `<div class="picker-section-label" style="color:${meta.color}">${meta.label}</div>`;
    html += names.map(name => `
      <div class="picker-exercise-row">
        <button class="picker-exercise-btn" data-name="${escapeHtml(name)}" data-group="${groupId}">${escapeHtml(name)}</button>
        <a class="watch-form-btn" href="${youtubeFormSearchUrl(name)}" target="_blank" rel="noopener noreferrer" title="Watch form video">▶</a>
      </div>`
    ).join('');
  });

  if (html === '') {
    html = '<p class="picker-no-results">No matches — add it as a custom exercise below.</p>';
  }

  pickerExercises.innerHTML = html;
  pickerExercises.querySelectorAll('.picker-exercise-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addExerciseToSession(btn.dataset.name, btn.dataset.group);
      closePicker();
    });
  });
}

pickerSearch.addEventListener('input', renderPickerExercises);
openPickerBtn.addEventListener('click', openPicker);
closePickerBtn.addEventListener('click', closePicker);
pickerOverlay.addEventListener('click', (e) => {
  if (e.target === pickerOverlay) closePicker();
});

customExerciseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = customExerciseInput.value.trim();
  if (!name) return;
  const muscleGroup = activeGroupId === 'all' ? CUSTOM_GROUP.id : activeGroupId;

  if (!customExercises.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    customExercises.push({ name, muscleGroup });
    saveCustomExercises();
  }

  addExerciseToSession(name, muscleGroup);
  customExerciseInput.value = '';
  closePicker();
});

// ---------- Settings modal ----------

function renderSettings() {
  unitButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === settings.unit);
  });
  restTimerSwitch.checked = settings.restTimerEnabled;
  restDurationChipsEl.innerHTML = REST_DURATION_OPTIONS
    .map(sec => `<button type="button" class="quick-chip ${sec === settings.restDuration ? 'active' : ''}" data-duration="${sec}">${sec}s</button>`)
    .join('');
  restDurationChipsEl.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      settings.restDuration = Number(chip.dataset.duration);
      saveSettings();
      renderSettings();
    });
  });

  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === (settings.theme || 'dark'));
  });
  unitLabels.forEach(el => { el.textContent = settings.unit; });
  barbellWeightInput.value = formatWeight(settings.barbellWeight);
  curlBarWeightInput.value = formatWeight(settings.curlBarWeight);
  appVersionEl.textContent = `v${APP_VERSION}`;
  renderChangelog();

  renderNotificationPermissionState();
}

function renderChangelog() {
  changelogListEl.innerHTML = CHANGELOG.map(entry => `
    <div class="changelog-entry">
      <div class="changelog-version">v${entry.version} <span class="changelog-date">${entry.date}</span></div>
      <ul class="changelog-changes">
        ${entry.changes.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
      </ul>
    </div>`).join('');
}

function isStandaloneApp() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function renderNotificationPermissionState() {
  // On iOS, Safari AND Chrome (both run on WebKit there, by Apple's rules)
  // only expose the Notification API once the site is installed via
  // Share -> Add to Home Screen. A regular browser tab can't use it at all.
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (iOS && !isStandaloneApp()) {
    notificationPermissionBtn.textContent = 'Add to Home Screen First';
    notificationPermissionBtn.disabled = true;
    notificationPermissionHint.textContent = 'On iPhone, notifications only work once this app is added to your Home Screen: tap Share, then "Add to Home Screen", then reopen it from there.';
    return;
  }
  if (typeof Notification === 'undefined') {
    notificationPermissionBtn.textContent = 'Unsupported';
    notificationPermissionBtn.disabled = true;
    notificationPermissionHint.textContent = 'Your browser does not support notifications.';
    return;
  }
  if (Notification.permission === 'granted') {
    notificationPermissionBtn.textContent = 'Enabled';
    notificationPermissionBtn.disabled = true;
    notificationPermissionHint.textContent = "You'll get an on-screen alert when rest ends, in addition to the sound.";
  } else if (Notification.permission === 'denied') {
    notificationPermissionBtn.textContent = 'Blocked';
    notificationPermissionBtn.disabled = true;
    notificationPermissionHint.textContent = 'Notifications are blocked in your browser settings for this site.';
  } else {
    notificationPermissionBtn.textContent = 'Enable';
    notificationPermissionBtn.disabled = false;
    notificationPermissionHint.textContent = 'Get an on-screen alert when rest ends, in addition to the sound.';
  }
}

function convertAllWeights(newUnit) {
  if (newUnit === settings.unit) return;
  const factor = newUnit === 'kg' ? LBS_TO_KG : KG_TO_LBS;
  const convert = (v) => {
    const num = parseFloat(v);
    if (!Number.isFinite(num)) return v;
    // Keep 3 decimals of precision in storage (not just 1) so repeated
    // kg <-> lbs toggling doesn't compound rounding error over time.
    // Display everywhere else rounds to 1 decimal via formatWeight().
    return String(Math.round(num * factor * 1000) / 1000);
  };

  current.exercises.forEach(ex => ex.sets.forEach(s => { s.weight = convert(s.weight); }));
  history.forEach(session => session.exercises.forEach(ex => ex.sets.forEach(s => { s.weight = convert(s.weight); })));

  // Convert the configured bar weights too, so they stay physically consistent.
  const convertNum = (n) => Math.round((Number(n) || 0) * factor * 10) / 10;
  settings.barbellWeight = convertNum(settings.barbellWeight);
  settings.curlBarWeight = convertNum(settings.curlBarWeight);

  settings.unit = newUnit;
  saveSettings();
  saveCurrent();
  saveHistory();
  renderExercises();
  renderMuscleSummary();
  renderHistory();
  renderStats();
  renderSettings();
}

openSettingsBtn.addEventListener('click', () => {
  renderSettings();
  settingsOverlay.hidden = false;
});
closeSettingsBtn.addEventListener('click', () => { settingsOverlay.hidden = true; });
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) settingsOverlay.hidden = true;
});

// Swipe left-to-right (or a clear downward flick) on a sheet dismisses it,
// like the native iOS back/close gesture.
function enableSwipeClose(sheetEl, closeFn) {
  let startX = 0, startY = 0, tracking = false;
  sheetEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  sheetEl.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    // Swipe right: mostly-horizontal rightward flick.
    if (dx > 80 && Math.abs(dy) < 60) closeFn();
  }, { passive: true });
}

enableSwipeClose(settingsOverlay.querySelector('.picker-sheet'), () => { settingsOverlay.hidden = true; });
enableSwipeClose(pickerOverlay.querySelector('.picker-sheet'), closePicker);
unitButtons.forEach(btn => {
  btn.addEventListener('click', () => convertAllWeights(btn.dataset.unit));
});

notificationPermissionBtn.addEventListener('click', () => {
  if (typeof Notification === 'undefined') return;
  Notification.requestPermission().then((permission) => {
    renderNotificationPermissionState();
    if (permission === 'granted') ensurePushSubscription();
  });
});

restTimerSwitch.addEventListener('change', () => {
  settings.restTimerEnabled = restTimerSwitch.checked;
  saveSettings();
  renderExercises();
  updateWakeLock();
  if (!settings.restTimerEnabled) cancelAllPush();
});

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    settings.theme = btn.dataset.theme;
    saveSettings();
    applyTheme();
    renderSettings();
  });
});

barbellWeightInput.addEventListener('input', () => {
  settings.barbellWeight = parseFloat(barbellWeightInput.value) || 0;
  saveSettings();
  renderExercises();
});
curlBarWeightInput.addEventListener('input', () => {
  settings.curlBarWeight = parseFloat(curlBarWeightInput.value) || 0;
  saveSettings();
  renderExercises();
});

exportBackupBtn.addEventListener('click', exportBackup);
importBackupBtn.addEventListener('click', () => importBackupInput.click());
importBackupInput.addEventListener('change', () => {
  const file = importBackupInput.files[0];
  if (file) importBackup(file);
  importBackupInput.value = '';
});

toggleChangelogBtn.addEventListener('click', () => {
  const willShow = changelogListEl.hidden;
  changelogListEl.hidden = !willShow;
  toggleChangelogBtn.textContent = willShow ? "What's new / changelog ▴" : "What's new / changelog ▾";
  if (willShow) {
    // Bring it into view within the scrollable settings sheet.
    requestAnimationFrame(() => toggleChangelogBtn.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
});

// ---------- Backup & restore (JSON) ----------

function exportBackup() {
  const payload = {
    app: 'ironlog',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { current, history, customExercises, settings, barPrefs },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ironlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let d;
    try {
      const parsed = JSON.parse(reader.result);
      d = parsed && parsed.data ? parsed.data : parsed;
    } catch (e) {
      alert('Could not read that file — is it a valid IronLog backup?');
      return;
    }
    if (!d || (!Array.isArray(d.history) && !d.current)) {
      alert('This does not look like an IronLog backup file.');
      return;
    }
    if (!confirm('Restore this backup? It will REPLACE all data currently on this device.')) return;

    if (d.history) { history = d.history; saveHistory(); }
    if (d.current) { current = d.current; saveCurrent(); }
    if (d.customExercises) { customExercises = d.customExercises; saveCustomExercises(); }
    if (d.settings) { settings = { ...settings, ...d.settings }; saveSettings(); }
    if (d.barPrefs) { barPrefs = d.barPrefs; saveBarPrefs(); }

    applyTheme();
    activeSetIndexByExercise = {};
    lastSetCompletionTime = {};
    notifiedRestByExercise = {};
    minimizedByExercise = {};
    reconstructRestTracking();
    renderSessionDate();
    renderExercises();
    renderMuscleSummary();
    renderWorkoutDuration();
    renderHistory();
    renderStats();
    renderSettings();
    alert('Backup restored successfully.');
  };
  reader.readAsText(file);
}

// ---------- Finish workout ----------

finishBtn.addEventListener('click', () => {
  const cleaned = current.exercises
    .map(ex => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: ex.sets.filter(s => s.weight !== '' && s.reps !== ''),
    }))
    .filter(ex => ex.sets.length > 0);

  if (cleaned.length === 0) {
    alert('Log at least one complete set (weight + reps) before finishing.');
    return;
  }

  const totalSets = cleaned.reduce((sum, ex) => sum + ex.sets.length, 0);
  const exerciseWord = cleaned.length === 1 ? 'exercise' : 'exercises';
  const setWord = totalSets === 1 ? 'set' : 'sets';
  if (!confirm(`Finish workout with ${cleaned.length} ${exerciseWord} and ${totalSets} ${setWord} logged?`)) {
    return;
  }

  const durationSeconds = current.startedAt
    ? Math.max(0, Math.round((Date.now() - new Date(current.startedAt).getTime()) / 1000))
    : null;
  history.unshift({
    id: Date.now(),
    date: current.date,
    startedAt: current.startedAt || current.date,
    durationSeconds,
    exercises: cleaned,
  });
  saveHistory();

  cancelAllPush();
  current = { date: new Date().toISOString(), exercises: [] };
  activeSetIndexByExercise = {};
  lastSetCompletionTime = {};
  notifiedRestByExercise = {};
  minimizedByExercise = {};
  saveCurrent();
  renderExercises();
  renderSessionDate();
  renderMuscleSummary();
  renderWorkoutDuration();
  renderHistory();
  renderStats();
  updateWakeLock();
});

function renderSessionDate() {
  sessionDateEl.textContent = formatDate(current.date);
}

// ---------- History tab ----------

function csvEscape(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportHistoryCsv() {
  const rows = [
    ['Date', 'Exercise', 'Muscle Group', 'Set', 'Weight', 'Unit', 'Reps', 'Rest (seconds)', 'Completed At'],
  ];

  history
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(session => {
      session.exercises.forEach(ex => {
        const meta = groupMeta(ex.muscleGroup);
        ex.sets.forEach((set, i) => {
          rows.push([
            formatDate(session.date),
            ex.name,
            meta.label,
            i + 1,
            formatWeight(set.weight),
            settings.unit,
            set.reps,
            set.restSeconds ?? '',
            set.completedAt ?? '',
          ]);
        });
      });
    });

  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `ironlog-history-${dateStamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportCsvBtn.addEventListener('click', () => {
  if (history.length === 0) {
    alert('No workout history yet — finish a workout first.');
    return;
  }
  exportHistoryCsv();
});

function renderHistory() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyEmpty.hidden = false;
    return;
  }
  historyEmpty.hidden = true;

  history.forEach(session => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const header = document.createElement('div');
    header.className = 'history-card-header';
    const durationLabel = Number.isFinite(session.durationSeconds)
      ? ` <span class="history-duration">⏱ ${formatDuration(session.durationSeconds)}</span>`
      : '';
    header.innerHTML = `<h3>${formatDate(session.date)}${durationLabel}</h3>`;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-history-btn';
    delBtn.textContent = 'Delete Day';
    delBtn.addEventListener('click', () => {
      if (!confirm('Delete this entire workout day from history?')) return;
      history = history.filter(s => s.id !== session.id);
      saveHistory();
      renderHistory();
      renderStats();
    });
    header.appendChild(delBtn);
    card.appendChild(header);

    const chipsRow = document.createElement('div');
    chipsRow.className = 'muscle-summary history-chips';
    chipsRow.innerHTML = renderChipsHtml(countSetsByGroup(session.exercises));
    card.appendChild(chipsRow);

    session.exercises.forEach(ex => {
      const meta = groupMeta(ex.muscleGroup);
      const exEl = document.createElement('div');
      exEl.className = 'history-exercise';
      const setsSummary = ex.sets.map(s => `${formatWeight(s.weight)}×${s.reps}`).join(', ');
      exEl.innerHTML = `
        <div class="history-exercise-name">
          <span class="muscle-badge" style="--badge-color:${meta.color}">${meta.label}</span>
          <span class="history-exercise-name-text">${escapeHtml(ex.name)}</span>
          <button class="remove-exercise-btn" title="Remove this exercise">✕</button>
        </div>
        <div class="history-sets">${setsSummary} <span class="unit-suffix">${settings.unit}</span></div>`;

      exEl.querySelector('.remove-exercise-btn').addEventListener('click', () => {
        if (!confirm(`Remove ${ex.name} from ${formatDate(session.date)}?`)) return;
        session.exercises = session.exercises.filter(e => e !== ex);
        if (session.exercises.length === 0) {
          history = history.filter(s => s.id !== session.id);
        }
        saveHistory();
        renderHistory();
        renderStats();
      });

      card.appendChild(exEl);
    });

    historyList.appendChild(card);
  });
}

// ---------- Stats tab ----------

// Estimated one-rep max via the Epley formula — a standard way to compare
// strength across different weight×rep combinations.
function estimatedOneRepMax(weight, reps) {
  const w = parseFloat(weight);
  const r = parseFloat(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

function sessionVolume(session) {
  let v = 0;
  session.exercises.forEach(ex => ex.sets.forEach(s => {
    v += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
  }));
  return v;
}

function startOfWeek(dateLike) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return d;
}

let selectedProgressExercise = null;

function computeOverviewStats() {
  let totalSets = 0, totalVolume = 0, restTotal = 0, restCount = 0, durationTotal = 0, durationCount = 0;
  const exerciseNames = new Set();

  const now = new Date();
  const thisWeekStart = startOfWeek(now).getTime();
  const lastWeekStart = thisWeekStart - 7 * 86400000;
  const sevenDaysAgo = now.getTime() - 7 * 86400000;
  let thisWeekVolume = 0, lastWeekVolume = 0, workoutsThisWeek = 0, workoutsLast7 = 0;
  let mostRecentWorkout = null;

  history.forEach(session => {
    const t = new Date(session.date).getTime();
    const vol = sessionVolume(session);
    if (t >= thisWeekStart) { thisWeekVolume += vol; workoutsThisWeek += 1; }
    else if (t >= lastWeekStart) { lastWeekVolume += vol; }
    if (t >= sevenDaysAgo) workoutsLast7 += 1;
    if (mostRecentWorkout === null || t > mostRecentWorkout) mostRecentWorkout = t;

    if (Number.isFinite(session.durationSeconds)) { durationTotal += session.durationSeconds; durationCount += 1; }
    session.exercises.forEach(ex => {
      exerciseNames.add(ex.name);
      ex.sets.forEach(s => {
        totalSets += 1;
        totalVolume += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
        if (Number.isFinite(s.restSeconds)) { restTotal += s.restSeconds; restCount += 1; }
      });
    });
  });

  const daysSinceLast = mostRecentWorkout !== null
    ? Math.floor((now.getTime() - mostRecentWorkout) / 86400000)
    : null;

  return {
    totalWorkouts: history.length,
    totalSets,
    totalVolume: Math.round(totalVolume),
    uniqueExercises: exerciseNames.size,
    avgRestSeconds: restCount > 0 ? Math.round(restTotal / restCount) : null,
    avgWorkoutSeconds: durationCount > 0 ? Math.round(durationTotal / durationCount) : null,
    thisWeekVolume: Math.round(thisWeekVolume),
    lastWeekVolume: Math.round(lastWeekVolume),
    workoutsThisWeek,
    workoutsLast7,
    daysSinceLast,
  };
}

function renderStatsOverview() {
  const s = computeOverviewStats();

  let volTrend = '';
  if (s.lastWeekVolume > 0) {
    const pct = Math.round(((s.thisWeekVolume - s.lastWeekVolume) / s.lastWeekVolume) * 100);
    const cls = pct >= 0 ? 'trend-up' : 'trend-down';
    volTrend = `<span class="trend ${cls}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs last week</span>`;
  }

  const restCard = s.avgRestSeconds !== null
    ? `<div class="stat-card"><div class="stat-value">${formatRestTime(s.avgRestSeconds)}</div><div class="stat-label">Avg rest / set</div></div>` : '';
  const durCard = s.avgWorkoutSeconds !== null
    ? `<div class="stat-card"><div class="stat-value">${formatDuration(s.avgWorkoutSeconds)}</div><div class="stat-label">Avg workout</div></div>` : '';

  const lastLabel = s.daysSinceLast === null ? '' : s.daysSinceLast === 0 ? ' · last workout today' : ` · last ${s.daysSinceLast}d ago`;

  statsOverviewEl.innerHTML = `
    <div class="insight-card">
      <div class="insight-title">This week</div>
      <div class="insight-big">${s.thisWeekVolume.toLocaleString()} <span class="insight-unit">${settings.unit} volume</span></div>
      ${volTrend}
      <div class="insight-sub">${s.workoutsThisWeek} workout${s.workoutsThisWeek === 1 ? '' : 's'} this week · ${s.workoutsLast7} in last 7 days${lastLabel}</div>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-value">${s.totalWorkouts}</div><div class="stat-label">Workouts</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalSets}</div><div class="stat-label">Total sets</div></div>
      <div class="stat-card"><div class="stat-value">${s.totalVolume.toLocaleString()}</div><div class="stat-label">Volume (${settings.unit})</div></div>
      <div class="stat-card"><div class="stat-value">${s.uniqueExercises}</div><div class="stat-label">Exercises</div></div>
      ${restCard}
      ${durCard}
    </div>`;
}

// ----- Progress: per-exercise strength trend -----

function exercisesInHistory() {
  const seen = new Map();
  history.forEach(session => {
    const t = new Date(session.date).getTime();
    session.exercises.forEach(ex => {
      if (!seen.has(ex.name) || t > seen.get(ex.name)) seen.set(ex.name, t);
    });
  });
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
}

function progressSeriesFor(name) {
  const series = [];
  history
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(session => {
      const ex = session.exercises.find(e => e.name.toLowerCase() === name.toLowerCase());
      if (!ex) return;
      let best = 0;
      ex.sets.forEach(s => { best = Math.max(best, estimatedOneRepMax(s.weight, s.reps)); });
      if (best > 0) series.push({ date: session.date, value: Math.round(best * 10) / 10 });
    });
  return series;
}

function buildLineChart(series) {
  if (series.length < 2) return '<p class="empty-msg">Log this exercise on at least 2 days to see a trend.</p>';
  const W = 320, H = 150, padL = 30, padR = 10, padT = 12, padB = 14;
  const vals = series.map(s => s.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = (maxV - minV) || 1;
  const n = series.length;
  const x = i => padL + (i / (n - 1)) * (W - padL - padR);
  const y = v => padT + (1 - (v - minV) / range) * (H - padT - padB);
  const line = series.map((s, i) => `${x(i).toFixed(1)},${y(s.value).toFixed(1)}`).join(' ');
  const dots = series.map((s, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(s.value).toFixed(1)}" r="2.5" fill="var(--accent)"/>`).join('');
  return `
    <svg viewBox="0 0 ${W} ${H}" class="progress-chart" preserveAspectRatio="xMidYMid meet">
      <line x1="${padL}" y1="${y(maxV).toFixed(1)}" x2="${W - padR}" y2="${y(maxV).toFixed(1)}" stroke="var(--border)" stroke-width="0.5"/>
      <line x1="${padL}" y1="${y(minV).toFixed(1)}" x2="${W - padR}" y2="${y(minV).toFixed(1)}" stroke="var(--border)" stroke-width="0.5"/>
      <text x="${padL - 3}" y="${(y(maxV) + 3).toFixed(1)}" text-anchor="end" fill="var(--text-dim)" font-size="8">${formatWeight(maxV)}</text>
      <text x="${padL - 3}" y="${(y(minV) + 3).toFixed(1)}" text-anchor="end" fill="var(--text-dim)" font-size="8">${formatWeight(minV)}</text>
      <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
}

function renderStatsProgress() {
  const exercises = exercisesInHistory();
  if (exercises.length === 0) {
    statsProgressEl.innerHTML = '<p class="empty-msg">No workouts logged yet.</p>';
    return;
  }
  if (!selectedProgressExercise || !exercises.includes(selectedProgressExercise)) {
    selectedProgressExercise = exercises[0];
  }
  const series = progressSeriesFor(selectedProgressExercise);

  let summary = '';
  if (series.length >= 2) {
    const first = series[0].value, last = series[series.length - 1].value;
    const best = Math.max(...series.map(s => s.value));
    const delta = Math.round((last - first) * 10) / 10;
    const cls = delta >= 0 ? 'trend-up' : 'trend-down';
    summary = `
      <div class="progress-summary">
        <div><div class="progress-stat">${formatWeight(last)}</div><div class="progress-stat-label">Est. 1RM now (${settings.unit})</div></div>
        <div><div class="progress-stat ${cls}">${delta >= 0 ? '+' : ''}${formatWeight(delta)}</div><div class="progress-stat-label">Over ${series.length} days</div></div>
        <div><div class="progress-stat">${formatWeight(best)}</div><div class="progress-stat-label">Best</div></div>
      </div>`;
  }

  const options = exercises
    .map(n => `<option value="${escapeHtml(n)}" ${n === selectedProgressExercise ? 'selected' : ''}>${escapeHtml(n)}</option>`)
    .join('');
  statsProgressEl.innerHTML = `
    <select id="progress-exercise-select" class="progress-select">${options}</select>
    <div class="progress-caption">Estimated 1-rep max per session (Epley)</div>
    ${buildLineChart(series)}
    ${summary}`;

  const sel = document.getElementById('progress-exercise-select');
  sel.addEventListener('change', () => { selectedProgressExercise = sel.value; renderStatsProgress(); });
}

function computeMuscleSplit() {
  const counts = {};
  const lastTrained = {};
  history.forEach(session => {
    const t = new Date(session.date).getTime();
    session.exercises.forEach(ex => {
      counts[ex.muscleGroup] = (counts[ex.muscleGroup] || 0) + ex.sets.length;
      if (!lastTrained[ex.muscleGroup] || t > lastTrained[ex.muscleGroup]) lastTrained[ex.muscleGroup] = t;
    });
  });
  return { counts, lastTrained };
}

function renderStatsSplit() {
  const { counts, lastTrained } = computeMuscleSplit();
  const max = Math.max(1, ...Object.values(counts));
  const now = Date.now();
  const rows = [...MUSCLE_GROUPS, CUSTOM_GROUP]
    .filter(g => counts[g.id])
    .sort((a, b) => counts[b.id] - counts[a.id])
    .map(g => {
      const pct = Math.round((counts[g.id] / max) * 100);
      const days = Math.floor((now - lastTrained[g.id]) / 86400000);
      const label = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
      const staleCls = days >= 7 ? 'split-days stale-flag' : 'split-days';
      return `
        <div class="split-block">
          <div class="split-row">
            <span class="split-label" style="color:${g.color}">${g.label}</span>
            <div class="split-bar-track"><div class="split-bar-fill" style="width:${pct}%; background:${g.color}"></div></div>
            <span class="split-count">${counts[g.id]}</span>
          </div>
          <div class="${staleCls}">last trained ${label}${days >= 7 ? ' — consider training it soon' : ''}</div>
        </div>`;
    })
    .join('');

  statsSplitEl.innerHTML = rows
    ? `<div class="split-caption">Sets per muscle group (all time)</div>${rows}`
    : '<p class="empty-msg">No sets logged yet.</p>';
}

function computeRecords() {
  const records = {};
  history.forEach(session => {
    session.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        const weight = parseFloat(s.weight);
        if (!Number.isFinite(weight)) return;
        const e1rm = estimatedOneRepMax(s.weight, s.reps);
        const existing = records[ex.name];
        if (!existing) {
          records[ex.name] = { weight, reps: s.reps, muscleGroup: ex.muscleGroup, date: session.date, best1rm: e1rm };
        } else {
          if (weight > existing.weight) { existing.weight = weight; existing.reps = s.reps; existing.date = session.date; }
          if (e1rm > existing.best1rm) existing.best1rm = e1rm;
        }
      });
    });
  });
  return records;
}

function renderStatsRecords() {
  const records = computeRecords();
  const rows = Object.entries(records)
    .sort((a, b) => b[1].best1rm - a[1].best1rm)
    .map(([name, r]) => {
      const meta = groupMeta(r.muscleGroup);
      return `
        <div class="record-row">
          <div class="history-exercise-name">
            <span class="muscle-badge" style="--badge-color:${meta.color}">${meta.label}</span>
            ${escapeHtml(name)}
          </div>
          <div class="history-sets">Top set ${formatWeight(r.weight)}×${r.reps} · est. 1RM <strong>${formatWeight(r.best1rm)} ${settings.unit}</strong></div>
        </div>`;
    })
    .join('');

  statsRecordsEl.innerHTML = rows || '<p class="empty-msg">No sets logged yet.</p>';
}

function renderStats() {
  statsEmpty.hidden = history.length > 0;
  renderStatsOverview();
  renderStatsProgress();
  renderStatsSplit();
  renderStatsRecords();
}

// ---------- Tabs ----------

const TAB_ORDER = ['workout', 'history', 'stats'];

function switchToTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `${tabName}-tab`));
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchToTab(btn.dataset.tab));
});

// Swipe left/right across the main area to move between the Today/History/Stats
// tabs. Ignored while a modal sheet is open, and only fires on a clear
// horizontal swipe so it doesn't interfere with vertical scrolling or taps.
(function enableTabSwipe() {
  const mainEl = document.querySelector('main');
  let sx = 0, sy = 0, tracking = false;
  mainEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  mainEl.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    if (!settingsOverlay.hidden || !pickerOverlay.hidden) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dy) > 45) return;
    const cur = document.querySelector('.tab-btn.active').dataset.tab;
    const idx = TAB_ORDER.indexOf(cur);
    if (dx < 0 && idx < TAB_ORDER.length - 1) switchToTab(TAB_ORDER[idx + 1]);
    else if (dx > 0 && idx > 0) switchToTab(TAB_ORDER[idx - 1]);
  }, { passive: true });
})();

document.querySelectorAll('.subtab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.subtab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`stats-${btn.dataset.subtab}`).classList.add('active');
  });
});

reconstructRestTracking();
renderSessionDate();
renderExercises();
renderMuscleSummary();
renderWorkoutDuration();
renderHistory();
renderStats();
renderSettings();
updateWakeLock();
ensurePushSubscription();
