"""Turn the generated dashboard Markdown into a phone-friendly HTML page (stdlib only).

Handles only the Markdown subset dashboard.py emits: headings, paragraphs, lists, block quotes,
tables, ```mermaid / ```text fences, `code`, **bold**, _italic_. Mermaid draws the charts in the browser.
"""
from __future__ import annotations

import html
import re

MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"

CSS = """
:root { --bg:#ffffff; --fg:#1b1f24; --muted:#59636e; --line:#d1d9e0; --card:#f6f8fa; --accent:#0969da; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#0d1117; --fg:#e6edf3; --muted:#9198a1; --line:#30363d; --card:#151b23; --accent:#4493f8; }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg);
       font:15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
main { max-width:760px; margin:0 auto; padding:16px; }
h1 { font-size:1.5rem; margin:.2em 0 .4em; }
h2 { font-size:1.2rem; margin:1.6em 0 .5em; padding-top:.6em; border-top:1px solid var(--line); }
h3 { font-size:1rem; margin:1.2em 0 .4em; }
p, li { color:var(--fg); }
em { color:var(--muted); }
code { font:13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; background:var(--card);
       padding:1px 4px; border-radius:4px; white-space:nowrap; }
blockquote { margin:1em 0; padding:.6em .9em; border-left:4px solid var(--accent); background:var(--card); }
.table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; margin:.6em 0; }
table { border-collapse:collapse; font-size:13px; min-width:100%; }
th, td { border:1px solid var(--line); padding:5px 7px; text-align:left; vertical-align:top; }
th { background:var(--card); }
pre { overflow-x:auto; background:var(--card); padding:10px; border-radius:6px;
      font:13px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; }
pre.mermaid { background:transparent; padding:0; text-align:center; }
pre.mermaid svg { max-width:100%; height:auto; }
"""


def _inline(text: str) -> str:
    if len(text) > 2 and text.startswith("_") and text.endswith("_"):  # whole-line caption, may contain `code`
        return f"<em>{_inline(text[1:-1])}</em>"
    parts = text.split("`")
    out = []
    for i, part in enumerate(parts):
        esc = html.escape(part, quote=False)
        if i % 2:
            out.append(f"<code>{esc}</code>")
        else:
            esc = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", esc)
            esc = re.sub(r"(?<!\w)_(.+?)_(?!\w)", r"<em>\1</em>", esc)
            out.append(esc)
    return "".join(out)


def _cells(row: str) -> list[str]:
    return [c.strip() for c in row.strip().strip("|").split("|")]


def md_to_html(md: str, title: str) -> str:
    lines = md.splitlines()
    body: list[str] = []
    para: list[str] = []
    i = 0

    def flush():
        if para:
            body.append("<p>" + " ".join(_inline(p) for p in para) + "</p>")
            para.clear()

    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            flush()
            lang = line[3:].strip()
            block = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                block.append(lines[i])
                i += 1
            code = html.escape("\n".join(block), quote=False)
            body.append(f'<pre class="mermaid">{code}</pre>' if lang == "mermaid" else f"<pre>{code}</pre>")
        elif line.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append(lines[i])
                i += 1
            i -= 1
            head, rest = rows[0], [r for r in rows[1:] if not re.fullmatch(r"\|[\s:|-]+\|?", r.strip())]
            t = ["<div class=\"table-wrap\"><table><thead><tr>"]
            t += [f"<th>{_inline(c)}</th>" for c in _cells(head)]
            t.append("</tr></thead><tbody>")
            for r in rest:
                t.append("<tr>" + "".join(f"<td>{_inline(c)}</td>" for c in _cells(r)) + "</tr>")
            t.append("</tbody></table></div>")
            body.append("".join(t))
        elif m := re.match(r"^(#{1,3}) (.*)", line):
            flush()
            n = len(m.group(1))
            body.append(f"<h{n}>{_inline(m.group(2))}</h{n}>")
        elif line.startswith("> "):
            flush()
            body.append(f"<blockquote>{_inline(line[2:])}</blockquote>")
        elif line.startswith("- "):
            flush()
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{_inline(lines[i][2:])}</li>")
                i += 1
            i -= 1
            body.append("<ul>" + "".join(items) + "</ul>")
        elif not line.strip():
            flush()
        else:
            para.append(line)
        i += 1
    flush()

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0d1117" media="(prefers-color-scheme: dark)">
<title>{html.escape(title)}</title>
<style>{CSS}</style>
</head>
<body>
<main>
{chr(10).join(body)}
</main>
<script src="{MERMAID_URL}"></script>
<script>
  const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  mermaid.initialize({{ startOnLoad: true, theme: dark ? "dark" : "default", securityLevel: "strict" }});
</script>
</body>
</html>
"""
