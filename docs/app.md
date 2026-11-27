# App architecture (Fuck ADHD + Logbuch)

One installable PWA. Plain JavaScript ES modules, no build step, no framework. Deployed by Vercel from the repo root;
serverless functions in `api/`, data in Upstash Redis (planner) and the Google Sheet (Logbuch).

## Files
| Path | Role |
|---|---|
| `index.html` | Shell: all views as static markup, icon sprite, tab bar, dialogs. |
| `assets/css/tokens.css` | Design tokens: colour (dark default, light via `prefers-color-scheme`), type, 4px spacing, radii, motion. |
| `assets/css/app.css` | Base, components, views, responsive rail (≥ 900px), reduced motion. |
| `assets/js/main.js` | Entry: wires features, starts router, registers `sw.js`. |
| `assets/js/core/` | `state.js` (localStorage, key `adhdAssistant`), `api.js` (POST + PIN + human errors), `router.js` (hash routes, tab state, view hooks), `dom.js`. |
| `assets/js/ui/` | `geometry.js` (Seed/Flower of Life SVG), `toast.js`. |
| `assets/js/features/` | One module per feature: `today`, `deadlines`, `wins`, `ai`, `focus`, `timer`, `braindump`, `remind`, `settings`; content in `lines.js`, `modes.js`. |
| `sw.js` | Network-first app shell (updates arrive immediately), cache fallback offline, web push. |

## Conventions
- Routes are hashes: `#home`, `#focus`, `#timer`, `#more`, `#ai:breakdown`, `#ai:ask`, `#remind`, `#braindump`, `#settings`.
  Any `[data-open="route"]` element navigates; `.backBtn` goes to the parent tab.
- A feature registers `onShow(view, fn)`; the router calls it on every visit.
- Every async surface has loading (skeleton or button spinner), empty, error-with-retry and no-PIN states.
- Low-risk writes are optimistic (plan check/add/delete, deadline and reminder delete) and roll back with a toast on failure.
- Design: one accent (`--accent`, sacred gold), restrained borders, no emoji icons (SVG sprite `#i-*`), motion 150–250 ms,
  sacred geometry only as quiet structure (background, timer dial, breath, completion bloom).
- When adding a module, add it to `SHELL_FILES` in `sw.js` and bump `CACHE_NAME`.

## Verification
An end-to-end Playwright run against a mock of `api/` covers 39 checks: no-PIN, settings, plan generation, optimistic
toggle/add/delete, win burst, path dialog, focus, back gesture, timer, AI modes, reminders, breathing, persistence,
server-error retry, wrong PIN, no horizontal overflow at 360/768 px, zero JS errors.

## Milestone 2 (next): Logbuch inside the app
- `api/logbuch.js`: read/append the Google Sheet with a service-account JWT signed by Node `crypto` (no new dependency).
  Needs Vercel env vars `GOOGLE_SA_EMAIL`, `GOOGLE_SA_KEY`, `LOGBUCH_SHEET_ID`, and the sheet shared with that email.
- Metrics in JS (port of `scripts/dashboard.py`), driven by the same `config/*.json`, `goals/okrs.json`, `roadmap/gate.json`
  (bundled into the function, still excluded from static serving).
- New tabs: **Log** (quick entry with category chips, duration, energy; today's timeline) and **Insights**
  (OKR bars, habit grid, sleep/energy, goal vs. drift, decision gate). Tab bar becomes Today · Log · Focus · Insights · More.
