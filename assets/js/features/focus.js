// Focus: one task at a time from a local queue.
import { $ } from "../core/dom.js";
import { state, save } from "../core/state.js";
import { onShow } from "../core/router.js";
import { registerWin } from "./wins.js";

export function renderFocusPanel() {
  $("focusInput").value = state.focusQueue.join("\n");
  const running = state.focusRunning;
  $("focusEditView").hidden = running;
  $("focusTaskView").hidden = !running;
  if (!running) return;
  const n = state.focusQueue.length;
  if (n) {
    $("focusCurrentTask").textContent = state.focusQueue[0];
    $("focusProgress").textContent = `${n} task${n === 1 ? "" : "s"} left`;
    $("focusDoneBtn").hidden = false;
  } else {
    $("focusCurrentTask").textContent = "All done.";
    $("focusProgress").textContent = "Nothing left in the queue";
    $("focusDoneBtn").hidden = true;
  }
}

export function initFocus() {
  onShow("focus", renderFocusPanel);
  $("focusStartBtn").addEventListener("click", () => {
    const lines = $("focusInput").value.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!lines.length) { $("focusInput").focus(); return; }
    state.focusQueue = lines;
    state.focusRunning = true;
    save();
    renderFocusPanel();
  });
  $("focusDoneBtn").addEventListener("click", () => {
    state.focusQueue.shift();
    save();
    renderFocusPanel();
    registerWin();
  });
  $("focusEditBtn").addEventListener("click", () => {
    state.focusRunning = false;
    save();
    renderFocusPanel();
    $("focusInput").focus();
  });
}
