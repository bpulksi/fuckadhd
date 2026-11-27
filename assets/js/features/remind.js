// Reminders + daily nudge (Redis via /api/reminders), web-push subscription for this device.
import { $, escapeHtml, icon, fmtDateTime, fmtTime, setLoading, setStatus } from "../core/dom.js";
import { api } from "../core/api.js";
import { hasPin } from "../core/state.js";
import { onShow } from "../core/router.js";
import { toast } from "../ui/toast.js";
import { mountGeometry } from "../ui/geometry.js";

const hasNotif = "Notification" in window;
const notifOn = () => hasNotif && Notification.permission === "granted";

function renderList(reminders) {
  const el = $("remindList");
  const upcoming = reminders.filter((r) => !r.sent && r.tag !== "daily-nudge").sort((a, b) => a.due - b.due);
  if (!upcoming.length) {
    el.innerHTML = `<div class="empty"><span class="empty-geo" data-geo="seed"></span>No reminders yet.</div>`;
    mountGeometry(el);
    return;
  }
  const now = Date.now();
  el.innerHTML = upcoming.map((r) => {
    const overdue = r.due <= now;
    return `<div class="list-item">
      <div class="li-main"><div class="li-title">${escapeHtml(r.text)}</div>
        <div class="li-sub${overdue ? " overdue" : ""}">${fmtDateTime(r.due)}${r.repeat === "daily" ? " · every day" : ""}${overdue ? " · sending soon" : ""}</div></div>
      <div class="li-actions"><button class="btn btn-icon btn-sm btn-danger" type="button" data-del="${escapeHtml(r.id)}" aria-label="Delete reminder: ${escapeHtml(r.text)}">${icon("x")}</button></div>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    b.closest(".list-item").style.opacity = "0.5"; // optimistic
    b.disabled = true;
    try {
      const data = await api("/api/reminders", { action: "delete", id: b.dataset.del });
      renderList(data.reminders);
    } catch (e) {
      b.closest(".list-item").style.opacity = "";
      b.disabled = false;
      toast(`Couldn't delete: ${e.message}`, "error");
    }
  }));
}

async function renderPanel() {
  if (notifOn()) $("enableNotifsBtn").textContent = "Notifications on ✓  ·  tap to re-sync";
  setStatus($("remindStatus"), "");
  const list = $("remindList");
  if (!hasPin()) {
    list.innerHTML = `<div class="error-box"><span>Add your PIN in Settings to load and save reminders.</span><button class="btn btn-sm btn-secondary" type="button" data-open="settings">Settings</button></div>`;
    return;
  }
  list.innerHTML = `<div class="skeleton-stack"><span class="skeleton"></span><span class="skeleton short"></span></div>`;
  try {
    const data = await api("/api/reminders", { action: "list" });
    renderList(data.reminders);
    const nudge = data.reminders.find((r) => r.tag === "daily-nudge" && !r.sent);
    if (nudge) {
      setStatus($("nudgeStatus"), `Active: "${nudge.text}" every day at ${fmtTime(nudge.due)}.`, "ok");
      $("nudgeTime").value = new Date(nudge.due).toTimeString().slice(0, 5);
      $("nudgeText").value = nudge.text;
    } else {
      setStatus($("nudgeStatus"), "");
    }
  } catch (e) {
    list.innerHTML = `<div class="error-box"><span>Couldn't load reminders: ${escapeHtml(e.message)}</span><button class="btn btn-sm btn-secondary" type="button" data-retry>Retry</button></div>`;
    list.querySelector("[data-retry]").addEventListener("click", renderPanel);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const raw = atob((base64String + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function enableNotifications() {
  const out = $("notifStatus");
  const btn = $("enableNotifsBtn");
  setStatus(out, "Setting up…");
  setLoading(btn, true);
  try {
    if (!hasNotif || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("This browser doesn't support push. On iPhone, add the app to your Home Screen first and open it from there.");
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Permission denied. Enable notifications for this site in your browser settings.");
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch("/api/vapid-public");
    const keyData = await keyRes.json().catch(() => ({}));
    if (!keyRes.ok) throw new Error(keyData.error || "Couldn't get the server key.");
    const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(keyData.key) });
    const data = await api("/api/subscribe", { subscription });
    setStatus(out, `Notifications on for this device (${data.devices} device${data.devices === 1 ? "" : "s"} registered). Reminders can arrive a few minutes after their set time.`, "ok");
    btn.textContent = "Notifications on ✓  ·  tap to re-sync";
  } catch (e) {
    setStatus(out, e.message + (/brave/i.test(navigator.userAgent) ? " In Brave, also check Settings → Privacy → 'Use Google services for push messaging'." : ""), "err");
  } finally {
    setLoading(btn, false);
  }
}

export function initRemind() {
  onShow("remind", renderPanel);
  $("enableNotifsBtn").addEventListener("click", enableNotifications);

  $("nudgeSetBtn").addEventListener("click", async () => {
    const out = $("nudgeStatus");
    const timeVal = $("nudgeTime").value;
    const text = $("nudgeText").value.trim();
    if (!timeVal) { setStatus(out, "Pick a time.", "err"); return; }
    if (!text) { setStatus(out, "Say what the nudge should tell you.", "err"); return; }
    const [h, m] = timeVal.split(":").map(Number);
    const due = new Date();
    due.setHours(h, m, 0, 0);
    if (due.getTime() <= Date.now()) due.setDate(due.getDate() + 1);
    setLoading($("nudgeSetBtn"), true);
    try {
      const data = await api("/api/reminders", { action: "add", text, due: due.getTime(), repeat: "daily", tag: "daily-nudge" });
      setStatus(out, notifOn() ? `Set: "${text}" every day at ${timeVal}.` : "Set, but enable notifications above or it won't reach your phone.", notifOn() ? "ok" : "err");
      renderList(data.reminders);
    } catch (e) {
      setStatus(out, e.message, "err");
    } finally {
      setLoading($("nudgeSetBtn"), false);
    }
  });

  $("remindAddBtn").addEventListener("click", async () => {
    const out = $("remindStatus");
    const text = $("remindText").value.trim();
    const whenVal = $("remindWhen").value;
    if (!text) { setStatus(out, "Type what to remember.", "err"); $("remindText").focus(); return; }
    if (!whenVal) { setStatus(out, "Pick a date and time.", "err"); $("remindWhen").focus(); return; }
    const due = new Date(whenVal).getTime();
    if (!Number.isFinite(due)) { setStatus(out, "That date didn't parse. Try again.", "err"); return; }
    setLoading($("remindAddBtn"), true);
    try {
      const data = await api("/api/reminders", { action: "add", text, due, repeat: $("remindRepeat").value });
      $("remindText").value = "";
      setStatus(out, notifOn() ? "Saved." : "Saved, but enable notifications above or your phone won't be told.", notifOn() ? "ok" : "err");
      renderList(data.reminders);
    } catch (e) {
      setStatus(out, e.message, "err");
    } finally {
      setLoading($("remindAddBtn"), false);
    }
  });
}
