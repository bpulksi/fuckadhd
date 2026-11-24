---
name: daily
description: Logbuch daily review. Syncs the Google Sheet to SQLite, summarises today, refreshes dashboard.md, writes today's journal file, and writes ONE concrete adjustment for tomorrow into the sheet's Claude Suggestion column. Use when Bipul says /daily, "daily review", or "Logbuch daily".
---

# /daily: end-of-day loop

Read `CLAUDE.md` §4-5 and `corrections.md` first. Date = today in Europe/Berlin unless he names another.

## Steps
1. **Sync.**
   - Call `mcp__Google_Sheets__get_values` (spreadsheetId `1t-4st_gOHNP7RADcPaxyY5w--Fri4d0d64rWnAPX8SM`,
     range `Untitled!A1:H3000`; if the tab name errors, call `get_spreadsheet` and use the real first tab).
   - Write the result JSON to `data/sheet_dump.json` (create `data/` if missing; it is gitignored).
   - Run `python3 scripts/sync_sheet.py --json data/sheet_dump.json`. Report skipped rows and fix advice (never edit his rows).
   - If `LOGBUCH_SHEET_CSV_URL` is set you may use `--url` instead.
2. **Dashboard.** `python3 scripts/dashboard.py`, then read `dashboard.md`.
3. **Today's facts.** Query SQLite (`data/logbuch.db`, table `entries`) for today: minutes by category/class,
   energy range and mean, sleep, habit hits (from the dashboard), logging coverage (hours logged). Compare with
   yesterday and the 7-day mean. If there are no entries today, say so plainly, ask for a catch-up log, and still
   write a *tiny* adjustment about logging itself.
4. **Journal.** Create `journal/YYYY-MM-DD.md` from `journal/_template.md`: facts, three honest observations, a
   one-line Abendprüfung (did well / badly / omitted, from his data and notes), and yesterday's suggestion verdict
   (done / not done / unknown, evidence).
5. **ONE adjustment for tomorrow.** Rules:
   - Exactly one. Concrete: if-then, a clock time, a place, a first physical action, ≤ 25 min to start.
   - Derived from today's data (a gap, a drift trigger, a streak at risk) and linked to a KR or the decision gate.
   - Smaller than the failure it addresses; no "try to", no stacked advice, no new habit outside the active four.
   - ≤ 220 characters, written to him in second person. Prefix `[Logbuch YYYY-MM-DD→tomorrow]`.
   - If a previous suggestion failed twice, shrink it or change the cue instead of repeating it.
   Write it with `mcp__Google_Sheets__update_values` to column H of **the last row dated today** (row id from the DB:
   `SELECT MAX(row_id) FROM entries WHERE date = ?`). If today has no rows, do not write; tell him in chat.
   Only column H, only that one cell. Re-read the cell to confirm.
6. **Close.** Print a ≤ 12-line summary: today in numbers, the two bars that moved (or didn't), the adjustment, and one
   German sentence (B1+) about the day.
7. **Commit and push** `journal/`, `dashboard.md`, `dashboard.html` as `daily YYYY-MM-DD`, so the phone
   dashboard (Vercel `/dashboard.html`) updates. Report if the push fails.

## Quality bar
Quote his numbers. Name the pattern if the data shows it (e.g. "drift started within 20 min after the Study block,
3rd time this week"). If data is thin (< 3 days), say that, and don't over-interpret. Honest, brief, no cheerleading.
