// Settings: PIN, connection test, about-me, AI history with feedback.
import { $, escapeHtml, setLoading, setStatus } from "../core/dom.js";
import { chat } from "../core/api.js";
import { state, save } from "../core/state.js";
import { onShow } from "../core/router.js";
import { loadAndRenderDeadlines, renderDeadlineList } from "./deadlines.js";

function renderHistory() {
  const el = $("history");
  const recent = state.history.slice(-8).reverse();
  $("clearHistory").hidden = !recent.length;
  if (!recent.length) { el.innerHTML = `<p class="hint">Nothing yet. Replies from Break it down and Ask show up here.</p>`; return; }
  el.innerHTML = recent.map((item) => {
    const fb = item.feedback;
    return `<div class="list-item">
      <div class="li-main">
        <div class="li-sub"><span class="chip">${escapeHtml(item.mode)}</span></div>
        <div class="li-title" style="font-weight:500">${escapeHtml(item.input.slice(0, 80))}${item.input.length > 80 ? "…" : ""}</div>
        <div class="row" style="margin-top:6px">
          <button class="btn btn-sm btn-quiet${fb === "worked" ? " picked" : ""}" type="button" data-fb="worked" data-id="${escapeHtml(item.id)}" aria-pressed="${fb === "worked"}">Helped</button>
          <button class="btn btn-sm btn-quiet${fb === "notworked" ? " picked" : ""}" type="button" data-fb="notworked" data-id="${escapeHtml(item.id)}" aria-pressed="${fb === "notworked"}">Didn't help</button>
        </div>
      </div></div>`;
  }).join("");
}

export function initSettings() {
  onShow("settings", () => { renderHistory(); renderDeadlineList(); loadAndRenderDeadlines(); });

  $("aboutMe").value = state.aboutMe || "";
  $("aboutMe").addEventListener("input", () => { state.aboutMe = $("aboutMe").value; save(); });

  $("pinInput").value = state.pin;
  let pinTimer = null;
  $("pinInput").addEventListener("input", () => {
    state.pin = $("pinInput").value;
    save();
    clearTimeout(pinTimer);
    pinTimer = setTimeout(() => loadAndRenderDeadlines(), 600); // refresh synced data once typing settles
  });

  $("testConnBtn").addEventListener("click", async () => {
    const out = $("testConnResult");
    setLoading($("testConnBtn"), true);
    setStatus(out, "Testing…");
    try {
      const text = await chat("Reply with exactly: ok", "ping");
      setStatus(out, `Connected. The model replied "${text.trim().slice(0, 60)}".`, "ok");
    } catch (e) {
      setStatus(out, `Failed: ${e.message}`, "err");
    } finally {
      setLoading($("testConnBtn"), false);
    }
  });

  $("history").addEventListener("click", (e) => {
    const b = e.target.closest("[data-fb]");
    if (!b) return;
    const item = state.history.find((h) => h.id === b.dataset.id);
    if (!item) return;
    item.feedback = item.feedback === b.dataset.fb ? null : b.dataset.fb;
    save();
    renderHistory();
  });

  $("clearHistory").addEventListener("click", () => {
    if (!confirm("Clear all local history?")) return;
    state.history = [];
    save();
    renderHistory();
  });
}
