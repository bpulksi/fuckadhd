// Brain dump (autosaved locally) and box breathing (4s in / hold / out / hold).
import { $ } from "../core/dom.js";
import { state, save } from "../core/state.js";
import { onShow } from "../core/router.js";
import { STILLNESS_LINES } from "./lines.js";

const PHASES = [
  { key: "in", label: "Breathe in" },
  { key: "hold-in", label: "Hold" },
  { key: "out", label: "Breathe out" },
  { key: "hold-out", label: "Hold" }
];
let handle = null;
let cycle = 1;
let saveTimer = null;

function setPhase(i) {
  $("breathBlock").dataset.phase = PHASES[i].key;
  $("breathLabel").textContent = PHASES[i].label;
}

function start() {
  const block = $("breathBlock");
  block.hidden = false;
  block.dataset.phase = "out";
  cycle = 1;
  $("breathCount").textContent = `Cycle ${cycle}`;
  $("calmDownBtn").hidden = true;
  let i = 0;
  requestAnimationFrame(() => requestAnimationFrame(() => setPhase(0))); // let the closed state paint first
  clearInterval(handle);
  handle = setInterval(() => {
    i = (i + 1) % 4;
    if (i === 0) { cycle++; $("breathCount").textContent = `Cycle ${cycle}`; }
    setPhase(i);
  }, 4000);
  block.scrollIntoView({ behavior: "smooth", block: "center" });
}

function stop() {
  clearInterval(handle);
  const block = $("breathBlock");
  block.dataset.phase = "out";
  const finish = () => { block.hidden = true; $("calmDownBtn").hidden = false; };
  if (cycle > 1) {
    $("breathLabel").textContent = "";
    $("breathCount").textContent = STILLNESS_LINES[Math.floor(Math.random() * STILLNESS_LINES.length)];
    setTimeout(finish, 3500);
  } else {
    finish();
  }
}

export function initBraindump() {
  onShow("braindump", () => { $("brainDumpInput").value = state.brainDump || ""; });
  $("brainDumpInput").addEventListener("input", () => {
    state.brainDump = $("brainDumpInput").value;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 250);
  });
  $("calmDownBtn").addEventListener("click", start);
  $("stopBreathBtn").addEventListener("click", stop);
}
