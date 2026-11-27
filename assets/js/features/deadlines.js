// Deadlines (Redis via /api/deadlines): countdown card on Today, list in Settings.
import { $, escapeHtml, icon, fmtDateTime, setLoading } from "../core/dom.js";
import { api } from "../core/api.js";
import { hasPin } from "../core/state.js";
import { isActive } from "../core/router.js";
import { toast } from "../ui/toast.js";

let cache = [];
let loaded = false;
let loadError = null;

export const getDeadlines = () => cache;

export function upcomingDeadlines() {
  const now = Date.now();
  return cache.filter((d) => d.date > now).sort((a, b) => a.date - b.date);
}

export async function loadAndRenderDeadlines() {
  if (!hasPin()) {
    loaded = true; loadError = null; cache = [];
    renderCountdown(); renderDeadlineList();
    return;
  }
  if (!loaded) renderCountdown(); // skeleton on first load only
  try {
    const data = await api("/api/deadlines", { action: "list" });
    cache = data.deadlines || [];
    loadError = null;
  } catch (e) {
    loadError = e;
  }
  loaded = true;
  renderCountdown();
  if (isActive("settings")) renderDeadlineList();
}

export function renderCountdown() {
  const el = $("examCountdown");
  if (!hasPin()) { el.hidden = true; return; }
  el.hidden = false;
  if (!loaded) {
    el.className = "card countdown";
    el.innerHTML = `<span class="skeleton" style="width:100%;height:28px"></span>`;
    return;
  }
  if (loadError) {
    el.className = "card countdown unset";
    el.innerHTML = `${icon("refresh")}<span>Couldn't load deadlines: ${escapeHtml(loadError.message)}</span>`;
    return;
  }
  const upcoming = upcomingDeadlines();
  if (!upcoming.length) {
    el.className = "card countdown unset";
    el.innerHTML = `${icon("calendar")}<span>${cache.length ? "All deadlines have passed. Add the next one." : "Add your deadlines to see a countdown here."}</span>`;
    return;
  }
  const next = upcoming[0];
  const ms = next.date - Date.now();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const num = days > 0 ? String(days) : `${hours}h`;
  const unit = days > 0 ? `day${days === 1 ? "" : "s"}${hours ? ` ${hours}h` : ""}` : `${mins}m`;
  const more = upcoming.length > 1 ? ` · +${upcoming.length - 1} more` : "";
  el.className = "card countdown";
  el.innerHTML = `<span class="cd-num">${num}</span><span class="cd-text"><span class="cd-label">${escapeHtml(next.label)}</span><span class="cd-sub">${unit} left · ${fmtDateTime(next.date)}${more}</span></span>`;
}

export function renderDeadlineList() {
  const el = $("deadlineList");
  if (!hasPin()) { el.innerHTML = `<p class="hint">Add your PIN above to sync deadlines.</p>`; return; }
  if (loadError) {
    el.innerHTML = `<div class="error-box"><span>Couldn't load: ${escapeHtml(loadError.message)}</span><button class="btn btn-sm btn-secondary" type="button" data-retry>Retry</button></div>`;
    el.querySelector("[data-retry]").addEventListener("click", loadAndRenderDeadlines);
    return;
  }
  const sorted = [...cache].sort((a, b) => a.date - b.date);
  if (!sorted.length) { el.innerHTML = `<p class="hint">No deadlines yet.</p>`; return; }
  const now = Date.now();
  el.innerHTML = sorted.map((d) => `
    <div class="list-item${d.date <= now ? " passed" : ""}">
      <div class="li-main"><div class="li-title">${escapeHtml(d.label)}</div>
        <div class="li-sub">${fmtDateTime(d.date)}${d.date <= now ? " · passed" : ""}</div></div>
      <div class="li-actions"><button class="btn btn-icon btn-sm btn-danger" type="button" data-del="${escapeHtml(d.id)}" aria-label="Delete ${escapeHtml(d.label)}">${icon("x")}</button></div>
    </div>`).join("");
  el.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    const id = b.dataset.del;
    const before = cache;
    cache = cache.filter((d) => d.id !== id); // optimistic
    renderDeadlineList(); renderCountdown();
    try {
      const data = await api("/api/deadlines", { action: "delete", id });
      cache = data.deadlines || [];
    } catch (e) {
      cache = before;
      toast(`Couldn't delete: ${e.message}`, "error");
    }
    renderDeadlineList(); renderCountdown();
  }));
}

export function initDeadlines() {
  $("deadlineAddBtn").addEventListener("click", async () => {
    const label = $("deadlineLabel").value.trim();
    const dateVal = $("deadlineDate").value;
    if (!label) { $("deadlineLabel").focus(); return; }
    if (!dateVal) { $("deadlineDate").focus(); return; }
    const btn = $("deadlineAddBtn");
    setLoading(btn, true);
    try {
      const data = await api("/api/deadlines", { action: "add", label, date: new Date(dateVal).getTime() });
      cache = data.deadlines || [];
      loadError = null;
      $("deadlineLabel").value = "";
      $("deadlineDate").value = "";
      renderDeadlineList(); renderCountdown();
      toast("Deadline added.", "success");
    } catch (e) {
      toast(`Couldn't add: ${e.message}`, "error");
    } finally {
      setLoading(btn, false);
    }
  });
  setInterval(() => { if (isActive("home")) renderCountdown(); }, 60000);
  setInterval(() => { if (isActive("home") && document.visibilityState === "visible") loadAndRenderDeadlines(); }, 5 * 60000);
}
