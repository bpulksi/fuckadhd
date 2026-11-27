export const $ = (id) => document.getElementById(id);

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const icon = (name, cls = "icon") =>
  `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

/** Toggle a button's loading state (spinner, disabled, aria-busy). */
export function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.classList.toggle("is-loading", loading);
  btn.setAttribute("aria-busy", String(loading));
}

/** Set a status line's text and tone ("", "err", "ok"). */
export function setStatus(el, text, tone = "") {
  el.textContent = text || "";
  el.className = "status" + (tone ? " " + tone : "");
}

export function fmtDateTime(ms) {
  return new Date(ms).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
