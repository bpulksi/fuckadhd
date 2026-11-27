// Hash router: #home, #focus, #ai:ask … so the phone's back gesture and deep links work.
import { $ } from "./dom.js";

const TABS = ["home", "focus", "timer", "more"];
const PARENT = { ai: "more", remind: "more", braindump: "more", settings: "more" };
const hooks = new Map();
let current = null;
let userNavigated = false;

/** Run fn(arg) every time the view `name` is shown. */
export function onShow(name, fn) {
  if (!hooks.has(name)) hooks.set(name, []);
  hooks.get(name).push(fn);
}

export const isActive = (name) => current === name;

export function navigate(target) {
  userNavigated = true;
  const hash = "#" + target;
  if (location.hash === hash) render(target);
  else location.hash = target;
}

function parse(raw) {
  const [name, arg] = (raw || "").split(":");
  return $("view-" + name) ? { name, arg } : { name: "home", arg: undefined };
}

function render(raw) {
  const { name, arg } = parse(raw);
  const changed = current !== name;
  current = name;
  if (changed) {
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
    const tab = TABS.includes(name) ? name : PARENT[name] || "home";
    document.querySelectorAll(".tab").forEach((t) => {
      if (t.dataset.tab === tab) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (userNavigated) $("view-" + name).querySelector("h1")?.focus({ preventScroll: true });
  }
  for (const fn of hooks.get(name) || []) {
    try { fn(arg); } catch (e) { console.error(`view hook ${name} failed`, e); }
  }
}

export function startRouter() {
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) { navigate(opener.dataset.open); return; }
    const tab = e.target.closest(".tab");
    if (tab) { navigate(tab.dataset.tab); return; }
    const back = e.target.closest(".backBtn");
    if (back) navigate(PARENT[current] || "home");
  });
  window.addEventListener("hashchange", () => render(location.hash.slice(1)));
  render(location.hash.slice(1) || "home");
}
