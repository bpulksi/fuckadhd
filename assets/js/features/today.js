// Today: AI day plan (Redis via /api/dayplan), optimistic check-off, no-PIN / loading / error states.
import { $, escapeHtml, icon, setLoading, setStatus } from "../core/dom.js";
import { api, chat } from "../core/api.js";
import { state, save, todayKey, hasPin } from "../core/state.js";
import { navigate } from "../core/router.js";
import { toast } from "../ui/toast.js";
import { getDeadlines } from "./deadlines.js";
import { registerWin } from "./wins.js";

let plan = null;          // { date, energy, items: [{ id, text, done }] }
let phase = "idle";       // idle | loading | ready | error
let lastError = null;
let mode = "view";        // view | form

const show = (id, on) => { $(id).hidden = !on; };

function hasTodayPlan() {
  return plan && plan.date === todayKey() && plan.items && plan.items.length;
}

export function renderToday() {
  $("todayDate").textContent = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  $("pinBanner").hidden = hasPin();

  const loading = phase === "loading" && !plan;
  show("planSkeleton", loading);
  show("planFormWrap", !loading && mode === "form");
  const showList = !loading && mode === "view" && hasTodayPlan();
  show("planListWrap", showList);
  show("planEmptyWrap", !loading && mode === "view" && !showList);

  const empty = $("planEmptyWrap");
  if (!hasPin()) {
    empty.querySelector(".empty-text").textContent = "Once your PIN is in, this card builds today's plan from your deadlines.";
    $("planMyDayBtn").hidden = true;
  } else if (phase === "error") {
    $("planMyDayBtn").hidden = false;
    empty.querySelector(".empty-text").textContent = `Couldn't load today's plan: ${lastError?.message || "unknown error"}`;
    $("planMyDayBtn").textContent = "Try again";
  } else {
    $("planMyDayBtn").hidden = false;
    empty.querySelector(".empty-text").textContent = "No plan yet. Give it your energy and the hours you have; it builds 2–6 concrete steps from your nearest deadlines.";
    $("planMyDayBtn").textContent = "Plan my day";
  }

  if (!showList) { $("planMeta").textContent = ""; return; }
  const done = plan.items.filter((i) => i.done).length;
  $("planMeta").textContent = `${done} of ${plan.items.length} done`;
  $("planList").innerHTML = plan.items.map((it) => `
    <li class="planItem${it.done ? " done" : ""}${it.pending ? " pending" : ""}" data-id="${escapeHtml(it.id || "")}">
      <button class="planCheck" type="button" role="checkbox" aria-checked="${it.done}" aria-label="${it.done ? "Mark not done" : "Mark done"}: ${escapeHtml(it.text)}"${it.pending ? " disabled" : ""}>${icon("check")}</button>
      <span class="planText">${escapeHtml(it.text)}</span>
      <button class="planDel btn btn-icon btn-sm btn-quiet" type="button" aria-label="Remove: ${escapeHtml(it.text)}"${it.pending ? " disabled" : ""}>${icon("x")}</button>
    </li>`).join("");
}

export async function loadDayplan() {
  if (!hasPin()) { phase = "idle"; plan = null; renderToday(); return; }
  phase = "loading";
  renderToday();
  try {
    const data = await api("/api/dayplan", { action: "get" });
    plan = data.plan;
    phase = "ready";
  } catch (e) {
    lastError = e;
    phase = plan ? "ready" : "error";
    if (plan) toast(`Couldn't refresh the plan: ${e.message}`, "error");
  }
  renderToday();
}

async function savePlan(items) {
  const data = await api("/api/dayplan", { action: "set", date: plan.date, energy: plan.energy, items });
  plan = data.plan;
}

async function toggleItem(id) {
  const item = plan.items.find((i) => i.id === id);
  if (!item) return;
  const before = structuredClone(plan);
  const becomingDone = !item.done;
  item.done = becomingDone; // optimistic
  renderToday();
  try {
    const data = await api("/api/dayplan", { action: "toggle", id });
    plan = data.plan;
    renderToday();
    if (becomingDone) registerWin();
  } catch (e) {
    plan = before;
    renderToday();
    toast(`Couldn't update: ${e.message}`, "error");
  }
}

async function deleteItem(id) {
  const before = structuredClone(plan);
  const items = plan.items.filter((i) => i.id !== id);
  plan.items = items; // optimistic
  renderToday();
  try {
    await savePlan(items.map(({ pending, ...rest }) => rest));
    renderToday();
  } catch (e) {
    plan = before;
    renderToday();
    toast(`Couldn't remove: ${e.message}`, "error");
  }
}

async function generatePlan() {
  const status = $("planStatus");
  const btn = $("planGenerateBtn");
  const energy = $("planEnergy").value;
  const hours = Math.max(1, parseInt($("planHours").value, 10) || 4);
  const now = Date.now();
  const dl = getDeadlines()
    .filter((d) => d.date > now)
    .sort((a, b) => a.date - b.date)
    .map((d) => `- ${d.label}: in ${Math.ceil((d.date - now) / 86400000)} day(s)`)
    .join("\n") || "- (no deadlines recorded)";
  const sys = `You are a day planner for a university student with ADHD. Today is ${new Date().toDateString()}. Their upcoming deadlines:\n${dl}\n\nThey have ${hours} hour(s) available and their energy is "${energy}". Build today's plan: prioritize the NEAREST deadlines, make each item one concrete physical action of at most 15 words (e.g. "Do BAM problem set 8, questions 1-3" not "study BAM"), size the number of items to energy (very low = 2-3 tiny items, high = up to 6), include one short break or meal if hours > 3. Reply with STRICT JSON only, no markdown, exactly this shape: {"items":["...","..."]}`;

  setStatus(status, "Planning… this takes a few seconds.");
  setLoading(btn, true);
  try {
    let parsed;
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await chat(sys + (attempt ? "\nREPLY ONLY WITH THE JSON OBJECT." : ""), "Plan my day.");
      try { parsed = extractJson(text); break; }
      catch { if (attempt) throw new Error("The AI didn't return a usable plan. Try again."); }
    }
    const items = (parsed.items || []).slice(0, 6).map((t) => ({ text: String(t), done: false }));
    if (!items.length) throw new Error("Empty plan returned. Try again.");
    const data = await api("/api/dayplan", { action: "set", date: todayKey(), energy, items });
    plan = data.plan;
    phase = "ready";
    mode = "view";
    setStatus(status, "");
    renderToday();
    toast("Plan ready. Start with the first one.", "success");
  } catch (e) {
    setStatus(status, e.message, "err");
  } finally {
    setLoading(btn, false);
  }
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON found");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function initToday() {
  $("planMyDayBtn").addEventListener("click", () => {
    if (!hasPin()) { navigate("settings"); return; }
    if (phase === "error") { loadDayplan(); return; }
    mode = "form";
    renderToday();
    $("planEnergy").focus();
  });
  $("planRedoBtn").addEventListener("click", () => { mode = "form"; renderToday(); });
  $("planCancelBtn").addEventListener("click", () => { mode = "view"; setStatus($("planStatus"), ""); renderToday(); });
  $("planGenerateBtn").addEventListener("click", generatePlan);

  $("planList").addEventListener("click", (e) => {
    const li = e.target.closest(".planItem");
    if (!li || li.classList.contains("pending")) return;
    if (e.target.closest(".planDel")) deleteItem(li.dataset.id);
    else if (e.target.closest(".planCheck, .planText")) toggleItem(li.dataset.id);
  });

  $("planAddForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("planAddInput");
    const text = input.value.trim();
    if (!text || !plan) return;
    const before = structuredClone(plan);
    const items = plan.items.map(({ pending, ...rest }) => rest).concat([{ text, done: false }]);
    plan.items.push({ id: "tmp-" + Date.now(), text, done: false, pending: true }); // optimistic
    input.value = "";
    renderToday();
    try {
      await savePlan(items);
      renderToday();
    } catch (err) {
      plan = before;
      input.value = text;
      renderToday();
      toast(`Couldn't add: ${err.message}`, "error");
    }
  });

  $("planToFocusBtn").addEventListener("click", () => {
    if (!plan) return;
    const remaining = plan.items.filter((it) => !it.done).map((it) => it.text);
    if (!remaining.length) { setStatus($("planListStatus"), "Everything's done. Nothing left to focus on. Go rest.", "ok"); return; }
    state.focusQueue = remaining;
    state.focusRunning = true;
    save();
    navigate("focus");
  });
}
