"""Shared helpers for Logbuch scripts (stdlib only)."""
from __future__ import annotations

import json
import re
import sqlite3
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = ROOT / "data" / "logbuch.db"
TZ = ZoneInfo("Europe/Berlin")

SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    row_id        INTEGER PRIMARY KEY,   -- spreadsheet row number (header = row 1)
    date          TEXT,                  -- ISO yyyy-mm-dd
    time          TEXT,                  -- HH:MM
    activity      TEXT,
    category      TEXT,
    duration_min  REAL,
    mood_energy   REAL,
    notes         TEXT,
    suggestion    TEXT,
    raw_date      TEXT,
    synced_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE TABLE IF NOT EXISTS sync_log (
    synced_at TEXT, source TEXT, rows_read INTEGER, rows_ok INTEGER, rows_skipped INTEGER
);
"""


def load_json(path: Path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def today_berlin() -> date:
    return datetime.now(TZ).date()


def parse_date(s: str, order: str = "DMY") -> date | None:
    """ISO, German dd.mm.yyyy, or slash dates (order DMY or MDY from config)."""
    s = (s or "").strip()
    if not s:
        return None
    if re.fullmatch(r"\d{4}-\d{1,2}-\d{1,2}", s):
        y, m, d = map(int, s.split("-"))
    elif re.fullmatch(r"\d{1,2}\.\d{1,2}\.\d{2,4}", s):
        d, m, y = map(int, s.split("."))
    elif re.fullmatch(r"\d{1,2}/\d{1,2}/\d{2,4}", s):
        a, b, y = map(int, s.split("/"))
        d, m = (a, b) if order == "DMY" else (b, a)
    else:
        return None
    if y < 100:
        y += 2000
    try:
        return date(y, m, d)
    except ValueError:
        return None


def parse_time(s: str) -> str | None:
    m = re.match(r"^\s*(\d{1,2})[:.](\d{2})", s or "")
    if not m:
        return None
    h, mi = int(m.group(1)), int(m.group(2))
    return f"{h:02d}:{mi:02d}" if h < 24 and mi < 60 else None


def parse_num(s) -> float | None:
    if s is None:
        return None
    s = str(s).strip().replace(",", ".")
    m = re.search(r"-?\d+(\.\d+)?", s)
    return float(m.group()) if m else None


def connect(db: Path | str | None = None) -> sqlite3.Connection:
    path = Path(db) if db else DEFAULT_DB
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def bar(pct: float | None, width: int = 10) -> str:
    """█████░░░░░ 50%  (pct in 0..100; None -> n/a)."""
    if pct is None:
        return "░" * width + " n/a"
    pct = max(0.0, min(100.0, pct))
    filled = int(round(pct / 100 * width))
    return "█" * filled + "░" * (width - filled) + f" {pct:.0f}%"


def spark(values: list[float | None], lo: float | None = None, hi: float | None = None) -> str:
    blocks = "▁▂▃▄▅▆▇█"
    vals = [v for v in values if v is not None]
    if not vals:
        return "·" * len(values)
    lo = min(vals) if lo is None else lo
    hi = max(vals) if hi is None else hi
    span = (hi - lo) or 1
    out = []
    for v in values:
        if v is None:
            out.append("·")
        else:
            out.append(blocks[max(0, min(7, int((v - lo) / span * 7 + 0.5)))])
    return "".join(out)


def pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 3:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sx = sum((x - mx) ** 2 for x in xs) ** 0.5
    sy = sum((y - my) ** 2 for y in ys) ** 0.5
    if sx == 0 or sy == 0:
        return None
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / (sx * sy)


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


__all__ = [n for n in dir() if not n.startswith("_")] + ["time"]
