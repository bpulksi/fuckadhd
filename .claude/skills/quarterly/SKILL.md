---
name: quarterly
description: Logbuch quarterly (12-week cycle) review. Scores the cycle's OKRs, re-checks the roadmap and decision gate against evidence, runs a retrospective, and drafts the next cycle's OKRs for approval. Use for /quarterly, "quarterly review", or at cycle end.
---

# /quarterly: Quartalsrückblick (12-week cycle close + next cycle)

Read `CLAUDE.md`, `corrections.md`, `roadmap/life-map.md`, `goals/okrs.json`, the cycle md in `goals/`, all `reviews/`
of the cycle, `habits/plan.md`.

## Steps
1. **Sync and compute.** Run the `/daily` sync, `scripts/dashboard.py`, and `scripts/weekly_stats.py` (for `cycle_by_category`).
2. **Score the cycle.** For each KR: final value, score 0.0-1.0 (value/target, capped), one-line reason. Objective =
   mean. Interpret: ≥ 0.7 good; ≥ 0.9 on every KR = targets too soft; < 0.4 = diagnose (wrong target, wrong
   week design, or avoidance). Targets still `tbd` that were never confirmed are reported as "unscored, target never set".
3. **Retrospective.** Start / stop / continue, backed by data: what drove the best 3 weeks, what broke the worst 3,
   which habits survived (adherence), the biggest time leak, planning-fallacy ratio (planned vs. actual hours).
   Include one Jung (shadow/individuation), one Stoic, and one Osho-style witnessing observation, only if the data fits.
4. **Roadmap check** (`roadmap/life-map.md`): is Phase 1 on schedule? Does "you are here" need to move? Were any
   assumptions falsified (e.g. programme details, deadlines)? List edits and ask for approval before changing the map.
5. **Decision gate review.**
   - Score each path per criterion using the evidence collected; mark each criterion as evidenced / weak / no data.
   - Check the hard gates and the data-minimum table (§4). Compute weighted totals with the **pre-registered** weights.
   - Verdict: *Gate not open* / *Open, undecided* / *Decided: path X*. If not open, say exactly which evidence is missing
     and design the cheapest sprint to get it. Apply the regret check from §3.1. Never move weights to change a result.
   - Write the verdict into `reviews/YYYY-Cn-quarterly.md`.
6. **Next OKRs (draft for approval).** 3 objectives max, 2-4 measurable KRs each. Start from the evidence: raise targets
   that were easy, fix ones that were mis-set, add a KR per gate evidence gap, keep Phase 1 first. Each KR must name its
   data source (sheet category, habit id, or manual). Check the capacity budget (hours/week) against `questionnaire.md` C6.
7. **Apply after approval:** move the old cycle to `goals/archive/` (md + json copy as `<cycle>.json`), write the new
   `goals/<cycle>.md` and `goals/okrs.json` (new cycle id and start date, Monday, 12 weeks), update `habits/plan.md`
   (promotions per the unlock rule; ≤ 4 active), update the life map's "you are here", regenerate the dashboard.
8. **Close.** ≤ 20 lines: scores, 3 data-backed truths, gate verdict, next-cycle theme, the one decision he owes you.
   Do not commit unless asked (suggested message: `quarterly YYYY-Cn`).
