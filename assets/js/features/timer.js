// Work/break timer. A completed work block registers a win. Remaining time also shows in the tab title.
import { $ } from "../core/dom.js";
import { state, save } from "../core/state.js";
import { onShow, isActive } from "../core/router.js";
import { registerWin } from "./wins.js";

let handle = null;
let phase = "idle"; // idle | work | break
let end = 0;
let total = 1;
const BASE_TITLE = document.title;

function fmt(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function update() {
  const ring = $("timerRing");
  const dial = ring.closest(".timer-dial");
  if (phase === "idle") {
    $("timerPhase").textContent = "Ready";
    $("timerDisplay").textContent = `${String(state.timerWork).padStart(2, "0")}:00`;
    $("timerStartBtn").hidden = false;
    $("timerStopBtn").hidden = true;
    ring.setAttribute("stroke-dashoffset", "100");
    dial.classList.remove("is-break");
    document.title = BASE_TITLE;
    return;
  }
  const remaining = Math.max(0, end - Date.now());
  $("timerPhase").textContent = phase === "work" ? "Work" : "Break";
  $("timerDisplay").textContent = fmt(remaining);
  $("timerStartBtn").hidden = true;
  $("timerStopBtn").hidden = false;
  const left = Math.min(100, Math.max(0, (remaining / total) * 100));
  ring.setAttribute("stroke-dashoffset", String(100 - left));
  dial.classList.toggle("is-break", phase === "break");
}

function tick() {
  if (end - Date.now() <= 0) {
    if (phase === "work") {
      phase = "break";
      total = state.timerBreak * 60000;
      end = Date.now() + total;
      registerWin();
    } else {
      clearInterval(handle);
      phase = "idle";
    }
  }
  if (phase !== "idle") document.title = `${fmt(end - Date.now())} · ${phase === "work" ? "Work" : "Break"}`;
  if (isActive("timer") || phase === "idle") update();
}

export function initTimer() {
  onShow("timer", () => {
    $("workMinutes").value = state.timerWork;
    $("breakMinutes").value = state.timerBreak;
    update();
  });
  $("workMinutes").addEventListener("change", () => {
    state.timerWork = Math.min(120, Math.max(1, parseInt($("workMinutes").value, 10) || 25));
    $("workMinutes").value = state.timerWork;
    save();
    if (phase === "idle") update();
  });
  $("breakMinutes").addEventListener("change", () => {
    state.timerBreak = Math.min(60, Math.max(1, parseInt($("breakMinutes").value, 10) || 5));
    $("breakMinutes").value = state.timerBreak;
    save();
  });
  $("timerStartBtn").addEventListener("click", () => {
    phase = "work";
    total = state.timerWork * 60000;
    end = Date.now() + total;
    clearInterval(handle);
    handle = setInterval(tick, 250);
    tick();
  });
  $("timerStopBtn").addEventListener("click", () => {
    if (!confirm("End this session now? A break in progress won't count if you stop early.")) return;
    clearInterval(handle);
    phase = "idle";
    update();
  });
}
