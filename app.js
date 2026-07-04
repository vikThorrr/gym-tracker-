const STORAGE_KEYS = {
  current: 'gymTracker.current',
  history: 'gymTracker.history',
  customExercises: 'gymTracker.customExercises',
  settings: 'gymTracker.settings',
};

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
const unitButtons = document.querySelectorAll('.unit-btn');
const restTimerSwitch = document.getElementById('rest-timer-switch');
const restDurationChipsEl = document.getElementById('rest-duration-chips');
const notificationPermissionBtn = document.getElementById('notification-permission-btn');
const notificationPermissionHint = document.getElementById('notification-permission-hint');
const REST_DURATION_OPTIONS = [30, 60, 90, 120, 180];

const statsEmpty = document.getElementById('stats-empty');
const statsOverviewEl = document.getElementById('stats-overview');
const statsSplitEl = document.getElementById('stats-split');
const statsRecordsEl = document.getElementById('stats-records');

let current = loadCurrent();
let history = loadHistory();
let customExercises = loadCustomExercises();
let settings = loadSettings();
let activeGroupId = 'all';

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
  const defaults = { unit: 'lbs', restTimerEnabled: false, restDuration: 90 };
  return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
}

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
  current.exercises.push({ name, muscleGroup, sets: [{ weight: '', reps: '' }] });
  saveCurrent();
  renderExercises();
  renderMuscleSummary();
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
  updateWakeLock();
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
}

function formatRestTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
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
  timerEl.querySelector('.rest-timer-hint').textContent = ready ? 'Time for your next set!' : 'rest';

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

setInterval(tickRestTimers, 1000);

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

    const setsBody = card.querySelector('.sets-body');
    exercise.sets.forEach((set, setIndex) => {
      setsBody.appendChild(buildSetRow(exIndex, setIndex, set));
    });

    const weightChipRow = card.querySelector('.weight-chip-row');
    const repsChipRow = card.querySelector('.reps-chip-row');

    function refreshChips() {
      const activeIdx = Math.min(activeSetIndexByExercise[exIndex], exercise.sets.length - 1);
      const activeSet = exercise.sets[activeIdx];

      weightChipRow.innerHTML = weightChipValues(exIndex, exercise.name)
        .map(v => `<button type="button" class="quick-chip ${String(v) === formatWeight(activeSet.weight) ? 'active' : ''}" data-value="${v}">${v}</button>`)
        .join('');
      repsChipRow.innerHTML = REPS_CHIPS
        .map(v => `<button type="button" class="quick-chip ${String(v) === String(activeSet.reps) ? 'active' : ''}" data-value="${v}">${v}</button>`)
        .join('');

      weightChipRow.querySelectorAll('.quick-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const value = chip.dataset.value;
          exercise.sets[activeIdx].weight = value;
          saveCurrent();
          const input = setsBody.querySelector(`.set-row[data-set-index="${activeIdx}"] .weight-input`);
          if (input) input.value = value;
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
      exercise.sets.push({ weight: last ? last.weight : '', reps: last ? last.reps : '' });
      const newIndex = exercise.sets.length - 1;
      activeSetIndexByExercise[exIndex] = newIndex;
      saveCurrent();
      renderExercises();
      handleSetCompletionCheck(exIndex, newIndex);
    });

    card.querySelector('.remove-exercise-btn').addEventListener('click', () => {
      current.exercises.splice(exIndex, 1);
      activeSetIndexByExercise = {};
      lastSetCompletionTime = {};
      notifiedRestByExercise = {};
      minimizedByExercise = {};
      saveCurrent();
      renderExercises();
      renderMuscleSummary();
    });

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

  renderNotificationPermissionState();
}

function renderNotificationPermissionState() {
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
unitButtons.forEach(btn => {
  btn.addEventListener('click', () => convertAllWeights(btn.dataset.unit));
});

notificationPermissionBtn.addEventListener('click', () => {
  if (typeof Notification === 'undefined') return;
  Notification.requestPermission().then(() => renderNotificationPermissionState());
});

restTimerSwitch.addEventListener('change', () => {
  settings.restTimerEnabled = restTimerSwitch.checked;
  saveSettings();
  renderExercises();
  updateWakeLock();
});

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

  history.unshift({ id: Date.now(), date: current.date, exercises: cleaned });
  saveHistory();

  current = { date: new Date().toISOString(), exercises: [] };
  activeSetIndexByExercise = {};
  lastSetCompletionTime = {};
  notifiedRestByExercise = {};
  minimizedByExercise = {};
  saveCurrent();
  renderExercises();
  renderSessionDate();
  renderMuscleSummary();
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
  a.download = `gym-tracker-history-${dateStamp}.csv`;
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
    header.innerHTML = `<h3>${formatDate(session.date)}</h3>`;

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

function computeOverviewStats() {
  let totalSets = 0;
  let totalVolume = 0;
  let restTotal = 0;
  let restCount = 0;
  const exerciseNames = new Set();

  history.forEach(session => {
    session.exercises.forEach(ex => {
      exerciseNames.add(ex.name);
      ex.sets.forEach(s => {
        totalSets += 1;
        totalVolume += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
        if (Number.isFinite(s.restSeconds)) {
          restTotal += s.restSeconds;
          restCount += 1;
        }
      });
    });
  });

  return {
    totalWorkouts: history.length,
    totalSets,
    totalVolume: Math.round(totalVolume),
    uniqueExercises: exerciseNames.size,
    avgRestSeconds: restCount > 0 ? Math.round(restTotal / restCount) : null,
  };
}

function computeMuscleSplit() {
  const counts = {};
  history.forEach(session => {
    session.exercises.forEach(ex => {
      counts[ex.muscleGroup] = (counts[ex.muscleGroup] || 0) + ex.sets.length;
    });
  });
  return counts;
}

function computeRecords() {
  const records = {};
  history.forEach(session => {
    session.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        const weight = parseFloat(s.weight);
        if (!Number.isFinite(weight)) return;
        const existing = records[ex.name];
        if (!existing || weight > existing.weight) {
          records[ex.name] = { weight, reps: s.reps, muscleGroup: ex.muscleGroup, date: session.date };
        }
      });
    });
  });
  return records;
}

function renderStatsOverview() {
  const stats = computeOverviewStats();
  statsOverviewEl.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalWorkouts}</div>
        <div class="stat-label">Workouts logged</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalSets}</div>
        <div class="stat-label">Total sets</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalVolume.toLocaleString()}</div>
        <div class="stat-label">Volume lifted (${settings.unit})</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.uniqueExercises}</div>
        <div class="stat-label">Exercises tried</div>
      </div>
      ${stats.avgRestSeconds !== null ? `
      <div class="stat-card">
        <div class="stat-value">${formatRestTime(stats.avgRestSeconds)}</div>
        <div class="stat-label">Avg rest between sets</div>
      </div>` : ''}
    </div>`;
}

function renderStatsSplit() {
  const counts = computeMuscleSplit();
  const max = Math.max(1, ...Object.values(counts));
  const rows = [...MUSCLE_GROUPS, CUSTOM_GROUP]
    .filter(g => counts[g.id])
    .sort((a, b) => counts[b.id] - counts[a.id])
    .map(g => {
      const pct = Math.round((counts[g.id] / max) * 100);
      return `
        <div class="split-row">
          <span class="split-label" style="color:${g.color}">${g.label}</span>
          <div class="split-bar-track">
            <div class="split-bar-fill" style="width:${pct}%; background:${g.color}"></div>
          </div>
          <span class="split-count">${counts[g.id]}</span>
        </div>`;
    })
    .join('');

  statsSplitEl.innerHTML = rows || '<p class="empty-msg">No sets logged yet.</p>';
}

function renderStatsRecords() {
  const records = computeRecords();
  const rows = Object.entries(records)
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([name, r]) => {
      const meta = groupMeta(r.muscleGroup);
      return `
        <div class="record-row">
          <div class="history-exercise-name">
            <span class="muscle-badge" style="--badge-color:${meta.color}">${meta.label}</span>
            ${escapeHtml(name)}
          </div>
          <div class="history-sets">${formatWeight(r.weight)}×${r.reps} <span class="unit-suffix">${settings.unit}</span> — ${formatDate(r.date)}</div>
        </div>`;
    })
    .join('');

  statsRecordsEl.innerHTML = rows || '<p class="empty-msg">No sets logged yet.</p>';
}

function renderStats() {
  statsEmpty.hidden = history.length > 0;
  renderStatsOverview();
  renderStatsSplit();
  renderStatsRecords();
}

// ---------- Tabs ----------

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
  });
});

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
renderHistory();
renderStats();
renderSettings();
updateWakeLock();
