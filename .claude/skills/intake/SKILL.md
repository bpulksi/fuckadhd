---
name: intake
description: Ingest Bipul's filled-in questionnaire.md and propagate the answers into CLAUDE.md, the life map, OKRs, habits, config and the dashboard. Use for /intake or when he says the questionnaire is done.
---

# /intake: questionnaire → system

1. Read `questionnaire.md`, then `CLAUDE.md`, `roadmap/life-map.md`, `goals/okrs.json`, `goals/2026-C1.md`,
   `habits/plan.md`, `config/*.json`. List every `TBD(Q-…)` marker with grep.
2. For each answered item: resolve the matching markers (remove the marker, insert the fact). Unanswered or "unknown"
   items: keep the marker, and add the item to a short "still open" list. Never infer or invent answers.
3. **Propagate:**
   - `CLAUDE.md` §1-2 (identity facts, values, dates). Keep < 150 lines.
   - `roadmap/life-map.md`: dates, "you are here", gate weights from D1 (normalise to 100), hard gates, evidence
     thresholds from D9, decision deadline D10, the verified MAPP programme (D5). Correct any wrong assumption and say what changed. Replace the placeholder dates in the Gantt (§1b).
   - `roadmap/gate.json`: energy categories per path; first feasibility scores (0–1) only if D3/D5/D7 give enough to judge, else leave null.
   - `goals/okrs.json` + `goals/2026-C1.md`: confirm or replace ⚑ targets (study hours from A/C6, exploration hours,
     sleep target from B1); set `"tbd": false` once confirmed; run the capacity check (sum of weekly goal hours vs. C6).
   - `habits/plan.md` + `config/habits.json`: wake time (B1), deep-block timing (B4), German mode (E2), leaks (B6),
     ADHD-aware design (C4), practices (F2/F3); adjust friction and if-thens to his real cues.
   - `config/categories.json`: categories from G3 and any new classes.
   - Tone: set coaching bluntness from F4 in `CLAUDE.md` §5.
4. Regenerate `dashboard.md` (`python3 scripts/dashboard.py`). Mark KR2.3 progress (gate criteria specified) in
   `goals/okrs.json` if D-items are complete.
5. Show a compact diff-style summary (what changed per file, what is still open, what conflicts or risks you found, with
   candid flags, e.g. the capacity budget does not fit, a deadline is too tight). Ask for approval of structural
   changes (life map, OKR targets) before finalising; apply the rest. Log any correction in `corrections.md`. Commit and push as `system: intake` once he approves.
