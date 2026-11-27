// Wins, completion burst, the ox-herding path dialog, daily wisdom.
import { $, escapeHtml, icon } from "../core/dom.js";
import { state, save, todayKey } from "../core/state.js";
import { COMPLETION_LINES, DEEP_LINES, DAILY_WISDOM, OX_STAGES } from "./lines.js";

function currentStage() {
  let idx = 0;
  for (let i = 0; i < OX_STAGES.length; i++) if (state.wins.total >= OX_STAGES[i].at) idx = i;
  return idx;
}

export function renderWinsLine() {
  const todayWins = state.wins.byDay[todayKey()] || 0;
  const idx = currentStage();
  $("winsLine").innerHTML = `${icon("spark")}<span><strong>${todayWins}</strong> today · Stage ${idx + 1}: ${escapeHtml(OX_STAGES[idx].name)}</span>`;
  $("winsLine").setAttribute("aria-label", `${todayWins} wins today. Stage ${idx + 1}: ${OX_STAGES[idx].name}. Open the path.`);
}

let burstTimeout = null;
function showBurst() {
  const deep = Math.random() < 0.2;
  const pool = deep ? DEEP_LINES : COMPLETION_LINES;
  const overlay = $("burstOverlay");
  overlay.classList.remove("show", "deep");
  void overlay.offsetWidth; // restart the draw animation
  $("burstText").textContent = pool[Math.floor(Math.random() * pool.length)];
  overlay.classList.add("show");
  if (deep) overlay.classList.add("deep");
  clearTimeout(burstTimeout);
  burstTimeout = setTimeout(() => overlay.classList.remove("show", "deep"), deep ? 3400 : 2300);
}

/** Count a finished thing (plan item, focus task, timer block). */
export function registerWin() {
  const key = todayKey();
  state.wins.total++;
  state.wins.byDay[key] = (state.wins.byDay[key] || 0) + 1;
  save();
  renderWinsLine();
  showBurst();
}

export function renderDailyWisdom() {
  const day = Math.floor(Date.now() / 86400000);
  $("dailyWisdom").textContent = DAILY_WISDOM[day % DAILY_WISDOM.length];
}

export function initWins() {
  const dialog = $("pathOverlay");
  $("winsLine").addEventListener("click", () => {
    const cur = currentStage();
    $("pathStages").innerHTML = OX_STAGES.map((s, i) => `
      <li class="pathStage${i === cur ? " current" : i < cur ? " reached" : ""}"${i === cur ? ' aria-current="step"' : ""}>
        <div class="ps-name">${i + 1}. ${escapeHtml(s.name)}</div>
        <div class="meaning">${escapeHtml(s.meaning)}</div>
      </li>`).join("");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  $("pathCloseBtn").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
}
