// Device-local state (localStorage). Same key and shape as the previous app, so nothing is lost on upgrade.
const KEY = "adhdAssistant";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export const state = Object.assign({
  aboutMe: "",
  history: [],
  focusQueue: [],
  focusRunning: false,
  timerWork: 25,
  timerBreak: 5,
  brainDump: "",
  pin: ""
}, load());

delete state.examDate;
delete state.deadlines;
if (!state.wins || typeof state.wins.total !== "number") state.wins = { total: 0, byDay: {} };
if (typeof state.voiceOut !== "boolean") state.voiceOut = false;

(function pruneWins() {
  const cutoff = Date.now() - 14 * 86400000;
  for (const day of Object.keys(state.wins.byDay)) {
    if (new Date(day).getTime() < cutoff) delete state.wins.byDay[day];
  }
})();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { /* storage full or blocked: state still works for this session */ }
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const hasPin = () => Boolean(state.pin && state.pin.trim());
