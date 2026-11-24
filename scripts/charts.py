"""Mermaid chart emitters for dashboard.md (stdlib only).

GitHub renders ```mermaid blocks in Markdown on the web and in the mobile app.
xychart-beta has no legend, so every chart title says which mark is which.
"""
from __future__ import annotations

from datetime import date, timedelta


def _q(s: str) -> str:
    return '"' + str(s).replace('"', "'") + '"'


def _num(v: float) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".") if v is not None else "0"


def xychart(title: str, labels: list[str], series: list[tuple[str, list[float]]],
            y_label: str, y_min: float, y_max: float) -> list[str]:
    """series: [("bar"|"line", values)]; all series must have len(labels) values."""
    out = ["```mermaid", "xychart-beta", f"    title {_q(title)}",
           "    x-axis [" + ", ".join(_q(l) for l in labels) + "]",
           f"    y-axis {_q(y_label)} {_num(y_min)} --> {_num(y_max)}"]
    for kind, vals in series:
        out.append(f"    {kind} [" + ", ".join(_num(v) for v in vals) + "]")
    out.append("```")
    return out


def pie(title: str, items: list[tuple[str, float]]) -> list[str]:
    items = [(k, v) for k, v in items if v and v > 0]
    if not items:
        return []
    out = ["```mermaid", "pie showData", f"    title {title}"]  # pie titles are not quoted
    out += [f"    {_q(k)} : {round(v)}" for k, v in items]
    out.append("```")
    return out


def quadrant(title: str, points: list[tuple[str, float, float]]) -> list[str]:
    """points: (name, x 0..1 feasibility, y 0..1 energy)."""
    out = ["```mermaid", "quadrantChart", f"    title {title}",
           "    x-axis Low feasibility --> High feasibility",
           "    y-axis Low energy --> High energy",
           "    quadrant-1 Strong candidate",
           "    quadrant-2 Energising but hard to reach",
           "    quadrant-3 Weak on both",
           "    quadrant-4 Reachable but draining"]
    for name, x, y in points:
        clean = "".join(c for c in name if c.isalnum() or c == " ")
        out.append(f"    {clean}: [{min(max(x, 0), 1):.2f}, {min(max(y, 0), 1):.2f}]")
    out.append("```")
    return out


def habit_grid(habits: list[tuple[str, set[date]]], logged: set[date], today: date, days: int = 28) -> list[str]:
    """Text grid, one row per habit: ■ done · □ logged day but missed · ┄ nothing logged that day."""
    start = today - timedelta(days=days - 1)
    span = [start + timedelta(days=i) for i in range(days)]
    width = max(len(n) for n, _ in habits) if habits else 10
    weeks = [span[i:i + 7] for i in range(0, days, 7)]
    head = " " * width + "  " + " ".join(w[0].strftime("%d.%m").ljust(7) for w in weeks)
    rows = ["```text", head]
    for name, done in habits:
        cells = []
        for w in weeks:
            cells.append("".join("■" if d in done else ("□" if d in logged else "┄") for d in w))
        rows.append(name.ljust(width) + "  " + " ".join(c.ljust(7) for c in cells))
    rows.append(" " * width + "  ■ done  □ missed  ┄ nothing logged that day")
    rows.append("```")
    return rows
