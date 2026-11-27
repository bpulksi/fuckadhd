---
name: weekly
description: Logbuch weekly review. Finds patterns, correlations, wasted time and OKR progress from the week's data, applies Jung/Stoic/Osho-style/Blueprint lenses only where the data fits, writes reviews/YYYY-Www.md, regenerates the dashboard and updates the plan. Use for /weekly or "weekly review".
---

# /weekly: Wochenrückblick

Read `CLAUDE.md`, `corrections.md`, `goals/okrs.json`, `habits/plan.md`, `roadmap/life-map.md` §3-4 first.

## Steps
1. **Sync + stats.** Run the `/daily` sync (steps 1-2). Then
   `python3 scripts/weekly_stats.py [--week YYYY-Www]` (default: current week; run it on Sunday or Monday for the
   week just ended). Also read `dashboard.md`.
2. **Pattern analysis** (only claims the numbers support; state n):
   - Time: class shares vs. last week; top drift activities; hours/day coverage; best and worst day and why.
   - Energy: mean by category (`by_category`), best/worst hours or categories, sleep↔energy and goal-minutes↔energy
     (`r_*`; n ≤ 7 = anecdote; say it). Look for lead-lag: what preceded the lowest-energy days?
   - Planned vs. done: compare last week's suggestions and the habit plan to what happened.
   - **Excuse audit:** list stated reasons from `Notes` ("too tired", "no time"…) and test each against the data
     (sleep that night, free hours logged, drift minutes). Say plainly when the data contradicts the reason.
3. **OKR progress.** Per KR: value, % and pace flag from the dashboard; risk call (on track / at risk / off track);
   one action if at risk. Apply the Phase 1 priority rule from `roadmap/life-map.md` §2.
4. **Decision-gate evidence.** Update the `cycle_by_category` energy comparison (Quant vs. Philosophy vs. Study vs. baseline),
   hours, outputs. Note evidence that moved a path score; never change weights here. State the minimum data still missing.
5. **Lenses, only where the data fits (skip silently otherwise; max one per lens, short):**
   - *Jung:* Schatten: what is avoided (tasks planned but never started, drift right after goal work, emotionally
     loaded notes). Individuation: tension between quant-persona and philosophy-self visible in the data. Dreams: only
     if logged; give amplification questions, not dream-dictionary meanings.
   - *Stoicism:* a dichotomy-of-control split for the week's biggest stressor; premeditatio malorum for next week's
     one riskiest block; the Abendprüfung pattern.
   - *Osho-style awareness:* one witnessing question (Zeugenbewusstsein), e.g. "What did you notice just before you
     opened the phone?" No sermon.
   - *Blueprint metrics:* sleep duration and regularity (bedtime SD), wake time, last-meal time, HRV/RHR if logged.
     No medical claims. If a metric is missing, say "not logged".
6. **Plan update.** At most ONE change to the system: a friction tweak, a time shift, an if-then rewrite, or a habit
   promote/retire per the unlock rule. Edit `habits/plan.md` (and `config/habits.json`) accordingly. Changes to OKR
   targets or the life map need his approval.
7. **Write `reviews/YYYY-Www.md`** from `reviews/_template.md`; regenerate `dashboard.md`.
8. **Close.** Summarise in ≤ 15 lines: 3 findings, 1 uncomfortable truth backed by data, the single change, the
   one question to sit with this week, one German sentence (B1+). Then commit and push all changed files as `weekly YYYY-Www`.

## Rules
Honest, specific, no flattery. If logging coverage < 6 h/day or < 5 days, lead with "the data is too thin to judge X"
and make the logging fix the week's change. Anything reported as a correlation must include n.
