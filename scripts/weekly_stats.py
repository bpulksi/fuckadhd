#!/usr/bin/env python3
"""Week statistics as JSON for the /weekly skill (and decision-gate evidence).

Usage: python3 scripts/weekly_stats.py [--week 2026-W48] [--db PATH] [--today YYYY-MM-DD]
Default week = the ISO week containing --today (or today).
Outputs: minutes + mean energy per category (revealed preference), class shares,
daily energy/sleep, top drift activities, coverage, correlations, delta vs previous week.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, connect, daterange, load_json, pearson, today_berlin  # noqa: E402
from dashboard import allocation, avg, class_map, daily_series, entry_class, load_entries  # noqa: E402


def week_bounds(label: str | None, today: date) -> tuple[date, date, str]:
    if label:
        y, w = label.upper().split("-W")
        start = date.fromisocalendar(int(y), int(w), 1)
    else:
        start = today - timedelta(days=today.weekday())
    iso = start.isocalendar()
    return start, start + timedelta(days=6), f"{iso[0]}-W{iso[1]:02d}"


def week_stats(entries, cfg, start: date, end: date) -> dict:
    cmap, sleep_cat = class_map(cfg), cfg.get("sleep_category", "Sleep")
    days = list(daterange(start, end))
    mins, dacts, logged = allocation(entries, cmap, sleep_cat, start, end)
    cat_min: dict[str, float] = defaultdict(float)
    cat_en: dict[str, list[float]] = defaultdict(list)
    for e in entries:
        if start <= e["d"] <= end and entry_class(e, cmap, sleep_cat) != "sleep":
            c = e["category"] or "(none)"
            cat_min[c] += e["duration_min"] or 0
            if e["mood_energy"] is not None:
                cat_en[c].append(e["mood_energy"])
    tot = sum(mins.values())
    en = daily_series(entries, days, "energy", sleep_cat)
    sl = daily_series(entries, days, "sleep", sleep_cat)
    goal_min = {d.isoformat(): sum(e["duration_min"] or 0 for e in entries
                                    if e["d"] == d and entry_class(e, cmap, sleep_cat) == "goal") for d in days}
    pairs = [(s, e) for s, e in zip(sl, en) if s is not None and e is not None]
    gpairs = [(goal_min[d.isoformat()], e) for d, e in zip(days, en) if e is not None]
    return {
        "days_logged": len(logged),
        "logged_hours_per_day": round(tot / 60 / len(logged), 1) if logged else None,
        "minutes_by_class": {k: round(v) for k, v in mins.items()},
        "share_by_class_pct": {k: round(v / tot * 100, 1) for k, v in mins.items()} if tot else {},
        "by_category": {c: {"minutes": round(m), "mean_energy": round(avg(cat_en[c]), 2) if cat_en[c] else None,
                            "n_energy_ratings": len(cat_en[c])} for c, m in sorted(cat_min.items(), key=lambda kv: -kv[1])},
        "top_drift": sorted(((a, round(m)) for a, m in dacts.items()), key=lambda kv: -kv[1])[:5],
        "daily": {d.isoformat(): {"energy": None if e is None else round(e, 1), "sleep_h": None if s is None else round(s, 1),
                                  "goal_min": round(goal_min[d.isoformat()])} for d, e, s in zip(days, en, sl)},
        "mean_energy": None if avg(en) is None else round(avg(en), 2),
        "mean_sleep_h": None if avg(sl) is None else round(avg(sl), 2),
        "r_sleep_energy": None if len(pairs) < 5 or pearson(*zip(*pairs)) is None else round(pearson(*zip(*pairs)), 2),
        "r_goalmin_energy": None if len(gpairs) < 5 or pearson(*zip(*gpairs)) is None else round(pearson(*zip(*gpairs)), 2),
        "correlation_note": "within-week correlations with n<=7 are anecdotes, not evidence; use cycle-level data for claims",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--week")
    ap.add_argument("--db")
    ap.add_argument("--today")
    a = ap.parse_args()
    today = date.fromisoformat(a.today) if a.today else today_berlin()
    start, end, label = week_bounds(a.week, today)
    cfg = load_json(ROOT / "config" / "categories.json")
    entries = load_entries(connect(a.db))
    out = {"week": label, "start": start.isoformat(), "end": end.isoformat(),
           "this_week": week_stats(entries, cfg, start, end),
           "previous_week": week_stats(entries, cfg, start - timedelta(days=7), end - timedelta(days=7))}
    # cycle-level energy by category: the decision-gate evidence base
    cs = date.fromisoformat(load_json(ROOT / "goals" / "okrs.json")["cycle"]["start"])
    out["cycle_by_category"] = week_stats(entries, cfg, cs, max(cs, end))["by_category"]
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
