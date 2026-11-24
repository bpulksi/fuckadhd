#!/usr/bin/env python3
"""Compute the Logbuch dashboard from SQLite and write dashboard.md.

Usage: python3 scripts/dashboard.py [--db PATH] [--today YYYY-MM-DD] [--out dashboard.md] [--stdout]
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import (ROOT, bar, connect, daterange, load_json, pearson, spark,  # noqa: E402
                    today_berlin)
import charts  # noqa: E402


# ---------- data access ----------
def load_entries(con) -> list[dict]:
    rows = [dict(r) for r in con.execute("SELECT * FROM entries ORDER BY date, time, row_id")]
    for r in rows:
        r["d"] = date.fromisoformat(r["date"])
    return rows


def class_map(cfg: dict) -> dict[str, str]:
    return {c.lower(): cls for cls, cats in cfg["classes"].items() for c in cats}


def entry_class(e: dict, cmap: dict, sleep_cat: str) -> str:
    cat = (e["category"] or "").strip().lower()
    if cat == sleep_cat.lower():
        return "sleep"
    return cmap.get(cat, "unclassified")


# ---------- habits ----------
def habit_days(habit: dict, entries: list[dict]) -> set[date]:
    cats = {c.lower() for c in habit.get("categories", [])}
    rx = re.compile(habit["activity_regex"], re.I) if habit.get("activity_regex") else None
    by_day: dict[date, float] = defaultdict(float)
    hit: set[date] = set()
    for e in entries:
        ok_cat = (e["category"] or "").lower() in cats if cats else False
        ok_rx = bool(rx and rx.search(e["activity"] or ""))
        if not (ok_cat or ok_rx):
            continue
        if habit.get("max_time") and (not e["time"] or e["time"] > habit["max_time"]):
            continue
        by_day[e["d"]] += e["duration_min"] or 0
        hit.add(e["d"])
    need = habit.get("min_minutes", 0)
    return {d for d in hit if by_day[d] >= need}


def streaks(days: set[date], today: date) -> tuple[int, int]:
    d = today if today in days else today - timedelta(days=1)
    cur = 0
    while d in days:
        cur += 1
        d -= timedelta(days=1)
    best = run = 0
    prev = None
    for x in sorted(days):
        run = run + 1 if prev and (x - prev).days == 1 else 1
        best = max(best, run)
        prev = x
    return cur, best


# ---------- OKRs ----------
def kr_value(kr: dict, entries: list[dict], habits: dict, start: date, end: date, weeks: int):
    win = [e for e in entries if start <= e["d"] <= end]
    k = kr["kind"]
    if k == "minutes":
        cats = {c.lower() for c in kr["categories"]}
        val = sum(e["duration_min"] or 0 for e in win if (e["category"] or "").lower() in cats)
        target = kr.get("target") or (kr["weekly_target"] * weeks if kr.get("weekly_target") else None)
        return val / 60, (target / 60 if target else None), "h"
    if k == "days":
        return len({d for d in habits[kr["habit"]] if start <= d <= end}), kr.get("target"), "days"
    if k == "logged_days":
        return len({e["d"] for e in win}), kr.get("target"), "days"
    if k == "sleep_nights":
        per: dict[date, float] = defaultdict(float)
        for e in win:
            if (e["category"] or "").lower() == "sleep":
                per[e["d"]] += e["duration_min"] or 0
        return sum(1 for v in per.values() if v >= kr["min_minutes"]), kr.get("target"), "nights"
    return kr.get("current", 0), kr.get("target"), kr.get("unit", "")


def pace_flag(pct: float | None, elapsed: float) -> str:
    if pct is None:
        return ""
    gap = pct / 100 - elapsed
    return "▲ ahead" if gap > 0.1 else ("▼ behind" if gap < -0.15 else "● on pace")


# ---------- time allocation ----------
def allocation(entries, cmap, sleep_cat, start, end):
    mins: dict[str, float] = defaultdict(float)
    drift_acts: dict[str, float] = defaultdict(float)
    days = set()
    for e in entries:
        if not (start <= e["d"] <= end):
            continue
        cls = entry_class(e, cmap, sleep_cat)
        if cls == "sleep":
            continue
        m = e["duration_min"] or 0
        mins[cls] += m
        days.add(e["d"])
        if cls == "drift":
            drift_acts[(e["activity"] or "?").strip().lower()] += m
    return mins, drift_acts, days


def daily_series(entries, days: list[date], kind: str, sleep_cat: str):
    out = []
    for d in days:
        if kind == "energy":
            v = [e["mood_energy"] for e in entries if e["d"] == d and e["mood_energy"] is not None]
            out.append(sum(v) / len(v) if v else None)
        else:
            v = [e["duration_min"] or 0 for e in entries if e["d"] == d and (e["category"] or "").lower() == sleep_cat.lower()]
            out.append(sum(v) / 60 if v else None)
    return out


def avg(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def fmt(x, nd=1, unit=""):
    return "n/a" if x is None else f"{x:.{nd}f}{unit}"


# ---------- render ----------
def build(con, today: date) -> str:
    cfg = load_json(ROOT / "config" / "categories.json")
    hab_cfg = load_json(ROOT / "config" / "habits.json")["habits"]
    okr = load_json(ROOT / "goals" / "okrs.json")
    cmap, sleep_cat = class_map(cfg), cfg.get("sleep_category", "Sleep")
    entries = load_entries(con)
    last_sync = (con.execute("SELECT MAX(synced_at) FROM sync_log").fetchone()[0]) or "never"
    L: list[str] = []
    add = L.append

    cyc = okr["cycle"]
    cstart = date.fromisoformat(cyc["start"])
    cend = cstart + timedelta(weeks=cyc["weeks"]) - timedelta(days=1)
    elapsed_days = max(0, (min(today, cend) - cstart).days + 1)
    elapsed = elapsed_days / (cyc["weeks"] * 7)
    week_no = min(cyc["weeks"], (elapsed_days - 1) // 7 + 1) if elapsed_days else 0

    add("# Dashboard (Übersicht)")
    add("")
    add(f"_Generated {today.isoformat()} by `scripts/dashboard.py` · last sheet sync: {last_sync} · "
        f"{len(entries)} entries in DB. Do not edit by hand; regenerated every review._")
    add("")
    if not entries:
        add("> **No data yet.** The sheet has headers only. All bars read 0 or n/a until entries exist. "
            "Log with the code word *Logbuch*, then run `/daily`.")
        add("")
    add(f"**Cycle {cyc['id']}** · {cstart} → {cend}")
    if elapsed_days == 0:
        add(f"Starts in {(cstart - today).days} days.  `{bar(0)}`")
    else:
        add(f"Week {week_no}/{cyc['weeks']}  `{bar(elapsed * 100)}` elapsed")
    add("")

    # --- OKRs
    habits = {h["id"]: habit_days(h, entries) for h in hab_cfg}
    add("## OKR progress (Fortschritt)")
    add("")
    window_end = min(today, cend)
    kr_chart: list[tuple[str, float]] = []
    for o in okr["objectives"]:
        rows, pcts = [], []
        for kr in o["krs"]:
            val, target, unit = kr_value(kr, entries, habits, cstart, window_end, cyc["weeks"])
            pct = (val / target * 100) if target else None
            if pct is not None:
                pcts.append(min(100, pct))
                kr_chart.append((kr["id"], min(100, pct)))
            tgt = f"{target:.0f}" if target else "TBD"
            flag = " ⚑ TBD" if kr.get("tbd") or not target else ""
            rows.append(f"| {kr['id']} | {kr['text']} | `{bar(pct)}` | {fmt(val, 0 if unit != 'h' else 1)} / {tgt} {unit} | "
                        f"{pace_flag(pct, elapsed) if elapsed_days else '–'}{flag} |")
        add(f"### {o['id']} {o['title']} — _{o['title_de']}_")
        add(f"Objective `{bar(sum(pcts) / len(pcts) if pcts else None)}` (mean of KRs with a defined target)")
        add("")
        add("| KR | Key result | Progress | Value | Pace |")
        add("|---|---|---|---|---|")
        L.extend(rows)
        add("")
    if kr_chart and elapsed_days:
        L.extend(charts.xychart("KR progress vs. time elapsed (%)",
                                [k for k, _ in kr_chart],
                                [("bar", [p for _, p in kr_chart]), ("line", [elapsed * 100] * len(kr_chart))],
                                "%", 0, 100))
        add("_Bars = % achieved; line = % of the cycle elapsed. A bar below the line is behind pace. "
            "KRs with target TBD are left out._")
        add("")

    # --- Habits
    add("## Habit streaks (Serien)")
    add("")
    add("| Habit | Streak now | Best | 7 d | 28 d |")
    add("|---|---|---|---|---|")
    for h in hab_cfg:
        days = habits[h["id"]]
        cur, best = streaks(days, today)
        d7 = sum(1 for d in daterange(today - timedelta(days=6), today) if d in days)
        d28 = sum(1 for d in daterange(today - timedelta(days=27), today) if d in days)
        add(f"| {h['name']} | {cur} d | {best} d | `{bar(d7 / 7 * 100, 7)}` {d7}/7 | {d28}/28 |")
    add("")
    add("Last 28 days, one square per day (weeks start at the date shown):")
    add("")
    logged_days = {e["d"] for e in entries}
    L.extend(charts.habit_grid([(h["name"].split(" (")[0], habits[h["id"]]) for h in hab_cfg], logged_days, today))
    add("")

    # --- Sleep / energy
    last14 = list(daterange(today - timedelta(days=13), today))
    en = daily_series(entries, last14, "energy", sleep_cat)
    sl = daily_series(entries, last14, "sleep", sleep_cat)
    e_now, e_prev = avg(en[7:]), avg(en[:7])
    s_now, s_prev = avg(sl[7:]), avg(sl[:7])
    add("## Sleep & energy, last 14 days (Schlaf & Energie)")
    add("")
    add(f"- Energy (1–10): `{spark(en, 1, 10)}`  7-d avg {fmt(e_now)} (prev {fmt(e_prev)}"
        f"{'' if e_now is None or e_prev is None else f', Δ {(round(e_now - e_prev, 1) or 0.0):+.1f}'})")
    add(f"- Sleep (h):     `{spark(sl, 4, 10)}`  7-d avg {fmt(s_now)} (prev {fmt(s_prev)})")
    all_days = sorted({e["d"] for e in entries})
    full_en = daily_series(entries, all_days, "energy", sleep_cat)
    full_sl = daily_series(entries, all_days, "sleep", sleep_cat)
    pairs = [(s, e) for s, e in zip(full_sl, full_en) if s is not None and e is not None]
    if len(pairs) >= 7:
        r = pearson([p[0] for p in pairs], [p[1] for p in pairs])
        add(f"- Sleep↔energy correlation (same logged day), n={len(pairs)}: r = {fmt(r, 2)} "
            f"(correlation, not proof; n small until ~30)")
    else:
        add(f"- Sleep↔energy correlation: need ≥7 days with both (have {len(pairs)}).")
    add("")
    last28 = list(daterange(today - timedelta(days=27), today))
    for kind, title, lo, hi, ylab in (
            ("sleep", "Sleep per night (h), last 28 days", 0, 12, "hours"),
            ("energy", "Mean energy per day (1-10), last 28 days", 1, 10, "energy")):
        vals = daily_series(entries, last28, kind, sleep_cat)
        pts = [(d, v) for d, v in zip(last28, vals) if v is not None]
        if not pts:
            add(f"_{kind.capitalize()} chart: no data in the last 28 days._")
            add("")
            continue
        labels = [d.strftime("%d.%m") for d, _ in pts]
        ys = [v for _, v in pts]
        if kind == "sleep":
            series = [("bar", ys), ("line", [7.0] * len(ys))]
        else:
            series = [("line" if len(ys) > 1 else "bar", ys)]
        L.extend(charts.xychart(title, labels, series, ylab, lo, hi))
        add(f"_{'Line = 7 h target. ' if kind == 'sleep' else ''}Only days with data are shown ({len(pts)} of 28)._")
        add("")

    # --- Time allocation
    add("## Goal work vs. drift (Zielarbeit vs. Abdriften)")
    add("")
    add("Share of logged waking minutes (sleep excluded). Only as honest as logging coverage.")
    add("")
    add("| Window | Goal | Income | Maint. | Rest | **Drift** | Unclass. | Logged h/day |")
    add("|---|---|---|---|---|---|---|---|")
    drift_top: dict[str, float] = {}
    for label, start in (("Last 7 d", today - timedelta(days=6)), ("Cycle", cstart)):
        mins, dacts, days = allocation(entries, cmap, sleep_cat, start, today)
        tot = sum(mins.values())
        pc = lambda c: (mins[c] / tot * 100) if tot else None  # noqa: E731
        cov = tot / 60 / len(days) if days else None
        add(f"| {label} | {fmt(pc('goal'), 0, '%')} | {fmt(pc('income'), 0, '%')} | {fmt(pc('maintenance'), 0, '%')} | "
            f"{fmt(pc('rest'), 0, '%')} | **{fmt(pc('drift'), 0, '%')}** | {fmt(pc('unclassified'), 0, '%')} | {fmt(cov)} |")
        if label == "Last 7 d":
            drift_top = dacts
            g = pc("goal")
            add_after = f"Goal work `{bar(g)}`" if g is not None else "Goal work `" + bar(None) + "`"
    add("")
    add(f"Last 7 d: {add_after}")
    if drift_top:
        top = sorted(drift_top.items(), key=lambda kv: -kv[1])[:3]
        add("")
        add("Top drift (7 d): " + "; ".join(f"{a} {m:.0f} min" for a, m in top))
    add("")
    mins7, _, _ = allocation(entries, cmap, sleep_cat, today - timedelta(days=6), today)
    L.extend(charts.pie("Waking time, last 7 days (min)",
                        [(n, mins7.get(k, 0)) for k, n in (("goal", "Goal"), ("income", "Income"),
                                                          ("maintenance", "Maintenance"), ("rest", "Rest"),
                                                          ("drift", "Drift"), ("unclassified", "Unclassified"))]))
    add("")
    wk_labels, wk_goal, wk_drift = [], [], []
    ws = cstart
    while ws <= min(today, cend):
        m, _, _ = allocation(entries, cmap, sleep_cat, ws, ws + timedelta(days=6))
        tot = sum(m.values())
        if tot:
            wk_labels.append(f"W{(ws - cstart).days // 7 + 1}")
            wk_goal.append(m.get("goal", 0) / tot * 100)
            wk_drift.append(m.get("drift", 0) / tot * 100)
        ws += timedelta(days=7)
    if wk_labels:
        L.extend(charts.xychart("Goal vs. drift per cycle week (%)",
                                wk_labels, [("bar", wk_goal), ("line", wk_drift)], "%", 0, 100))
        add("_Bars = goal-work share; line = drift share of logged waking time._")
        add("")
    add("_Legend: goal = moves the roadmap · income = paid work · maint. = body/admin · rest = deliberate recovery · "
        "drift = unintended loss. Mapping in `config/categories.json`._")
    add("")
    L.extend(gate_section(entries, cstart, today))
    return "\n".join(L) + "\n"


def gate_section(entries: list[dict], cstart: date, today: date) -> list[str]:
    gate = load_json(ROOT / "roadmap" / "gate.json")
    out = ["## Decision gate (Entscheidungstor)", "",
           "Energy comes from your logs this cycle; feasibility is scored at `/intake` or `/quarterly` "
           "(criteria in `roadmap/life-map.md` §3, inputs in `roadmap/gate.json`). A path is plotted only when both exist.", "",
           "| Path | Energy categories | Mean energy (n) | Feasibility | On chart |", "|---|---|---|---|---|"]
    if not gate:
        return out[:2] + ["_`roadmap/gate.json` missing._"]
    win = [e for e in entries if cstart <= e["d"] <= today and e["mood_energy"] is not None]
    base = avg([e["mood_energy"] for e in win])
    points = []
    for p in gate["paths"]:
        cats = {c.lower() for c in p["energy_categories"]}
        r = [e["mood_energy"] for e in win if (e["category"] or "").lower() in cats]
        mean = avg(r)
        enough = len(r) >= gate.get("min_energy_ratings", 5)
        feas = p.get("feasibility")
        plotted = enough and feas is not None
        if plotted:
            points.append((p["name"], feas, (mean - 1) / 9))
        why = "yes" if plotted else ("no: " + ", ".join(
            x for x, c in (("feasibility not scored", feas is None),
                           (f"needs {gate.get('min_energy_ratings', 5)} ratings", not enough)) if c))
        out.append(f"| {p['id']} {p['name']} | {', '.join(p['energy_categories'])} | {fmt(mean)} ({len(r)}) | "
                   f"{'TBD' if feas is None else f'{feas:.2f}'} | {why} |")
    out.append(f"| Baseline | all rated blocks | {fmt(base)} ({len(win)}) | – | – |")
    out.append("")
    if points:
        out.extend(charts.quadrant("Decision gate, cycle to date", points))
    else:
        out.append("_No path can be plotted yet. The chart appears once a path has enough energy ratings "
                   "and a feasibility score._")
    out.append("")
    out.append("_Self-rated energy is noisy and favours whatever is new; read it next to hours logged and output produced._")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db")
    ap.add_argument("--today")
    ap.add_argument("--out", default=str(ROOT / "dashboard.md"))
    ap.add_argument("--stdout", action="store_true")
    a = ap.parse_args()
    today = date.fromisoformat(a.today) if a.today else today_berlin()
    text = build(connect(a.db), today)
    if a.stdout:
        print(text)
    else:
        Path(a.out).write_text(text, encoding="utf-8")
        print(f"wrote {a.out}")


if __name__ == "__main__":
    main()
