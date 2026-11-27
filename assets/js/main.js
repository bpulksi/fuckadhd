// Entry point: wire features, start the router, register the service worker.
import { save } from "./core/state.js";
import { onShow, startRouter } from "./core/router.js";
import { mountGeometry } from "./ui/geometry.js";
import { initWins, renderWinsLine, renderDailyWisdom } from "./features/wins.js";
import { initDeadlines, loadAndRenderDeadlines } from "./features/deadlines.js";
import { initToday, loadDayplan, renderToday } from "./features/today.js";
import { initAi } from "./features/ai.js";
import { initFocus } from "./features/focus.js";
import { initTimer } from "./features/timer.js";
import { initBraindump } from "./features/braindump.js";
import { initRemind } from "./features/remind.js";
import { initSettings } from "./features/settings.js";

mountGeometry();

initWins();
initDeadlines();
initToday();
initAi();
initFocus();
initTimer();
initBraindump();
initRemind();
initSettings();

onShow("home", () => {
  renderToday();
  renderWinsLine();
  renderDailyWisdom();
  loadAndRenderDeadlines();
  loadDayplan();
});

startRouter();

window.addEventListener("pagehide", save);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
