#!/usr/bin/env python3
"""Pull the Logbuch Google Sheet into SQLite (data/logbuch.db, gitignored).

The sheet is the source of truth: every sync REPLACES the entries table.

Sources (pick one):
  --json PATH   output of the Sheets MCP get_values call ({"values": [[...]]}) or a bare list of rows.
                This is what the /daily skill uses (Claude fetches, saves, runs this).
  --csv PATH    CSV export of the sheet.
  --url URL     CSV export URL (env LOGBUCH_SHEET_CSV_URL). Needs the sheet to be link-readable.
                https://docs.google.com/spreadsheets/d/<ID>/export?format=csv

Usage: python3 scripts/sync_sheet.py --json data/sheet_dump.json
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, connect, load_json, parse_date, parse_num, parse_time, TZ  # noqa: E402


def read_rows(args) -> tuple[list[list[str]], str]:
    if args.json:
        data = json.loads(Path(args.json).read_text(encoding="utf-8"))
        rows = data["values"] if isinstance(data, dict) else data
        return rows, f"json:{args.json}"
    if args.csv:
        with open(args.csv, newline="", encoding="utf-8-sig") as f:
            return list(csv.reader(f)), f"csv:{args.csv}"
    url = args.url or os.environ.get("LOGBUCH_SHEET_CSV_URL")
    if url:
        with urllib.request.urlopen(url, timeout=30) as r:
            text = r.read().decode("utf-8-sig")
        return list(csv.reader(io.StringIO(text))), "url"
    sys.exit("No source: pass --json, --csv or --url (or set LOGBUCH_SHEET_CSV_URL).")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--json")
    ap.add_argument("--csv")
    ap.add_argument("--url")
    ap.add_argument("--db")
    args = ap.parse_args()

    rows, source = read_rows(args)
    cfg = load_json(ROOT / "config" / "categories.json", {})
    order = cfg.get("date_order", "DMY")

    first = rows[0] if rows else []
    has_header = bool(first) and str(first[0]).strip().lower() in ("date", "datum")
    start_row = 2 if has_header else 1
    body = rows[1:] if has_header else rows

    con = connect(args.db)
    now = datetime.now(TZ).isoformat(timespec="seconds")
    ok = skipped = 0
    con.execute("DELETE FROM entries")
    for i, r in enumerate(body):
        r = list(r) + [""] * (8 - len(r))
        if not any(str(c).strip() for c in r[:7]):
            continue  # blank row
        d = parse_date(str(r[0]), order)
        if d is None:
            skipped += 1
            print(f"  skip row {start_row + i}: unparseable date {r[0]!r}", file=sys.stderr)
            continue
        con.execute(
            "INSERT OR REPLACE INTO entries VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (start_row + i, d.isoformat(), parse_time(str(r[1])), str(r[2]).strip(),
             str(r[3]).strip(), parse_num(r[4]), parse_num(r[5]), str(r[6]).strip(),
             str(r[7]).strip(), str(r[0]).strip(), now),
        )
        ok += 1
    con.execute("INSERT INTO sync_log VALUES (?,?,?,?,?)", (now, source, len(body), ok, skipped))
    con.commit()
    last = con.execute("SELECT MAX(date) FROM entries").fetchone()[0]
    print(f"synced {ok} entries ({skipped} skipped) from {source}; latest entry date: {last}")


if __name__ == "__main__":
    main()
