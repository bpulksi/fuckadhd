import { $ } from "../core/dom.js";

/** Small transient message. type: "info" | "success" | "error". */
export function toast(message, type = "info", ms = 3200) {
  const host = $("toasts");
  if (!host) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  while (host.children.length > 3) host.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 260);
  }, ms);
}
