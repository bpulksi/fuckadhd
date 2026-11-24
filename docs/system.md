# How Logbuch works (Systemübersicht)

Two diagrams: where the data goes, and which review loop runs when. Both render on GitHub.

## 1. Data flow (Datenfluss)

```mermaid
flowchart LR
    V["You say: Logbuch ...<br/>Claude app, voice"] --> S[("Google Sheet<br/>Habit Journal (Logbuch)")]
    S -->|"get_values"| J["data/sheet_dump.json"]
    J -->|"sync_sheet.py"| DB[("data/logbuch.db<br/>SQLite, rebuilt each sync")]
    DB -->|"dashboard.py"| D["dashboard.md<br/>bars, charts, streaks, gate"]
    DB -->|"weekly_stats.py"| W["week numbers<br/>energy by category"]
    CFG["config/*.json<br/>goals/okrs.json<br/>roadmap/gate.json"] --> D
    D --> R["journal/ and reviews/"]
    W --> R
    R -->|"one adjustment per day"| H["Sheet column H<br/>Claude Suggestion"]
    H -.->|"you read it next day"| V

    classDef you fill:#ffd54f,stroke:#b28900,color:#000
    classDef store fill:#bbdefb,stroke:#1565c0,color:#000
    class V,H you
    class S,DB store
```

The sheet is the source of truth. The database is rebuilt from it on every sync; nothing in `data/` is committed.
The only cell Claude writes in the sheet without being asked is column H of the day's last row.

## 2. Review loops (Rückblick-Rhythmus)

```mermaid
flowchart TD
    subgraph DAY["Every day: /daily, about 2 min"]
        D1["Sync sheet"] --> D2["Rebuild dashboard"] --> D3["journal/YYYY-MM-DD.md"] --> D4["ONE if-then adjustment<br/>into column H"]
    end
    subgraph WEEK["Every Sunday: /weekly"]
        W1["Patterns and correlations, n stated"] --> W2["Excuse audit vs. data"] --> W3["OKR pace and gate evidence"] --> W4["Lenses: Jung, Stoic,<br/>witnessing, Blueprint"] --> W5["At most ONE change<br/>to habits/plan.md"]
    end
    subgraph QUARTER["Every 12 weeks: /quarterly"]
        Q1["Score KRs 0.0-1.0"] --> Q2["Retrospective"] --> Q3["Decision gate scoring<br/>roadmap/gate.json"] --> Q4["Draft next OKRs"] --> Q5{"Your approval"}
    end
    I["Once: questionnaire.md, then /intake"] --> DAY
    DAY -->|"7 journals"| WEEK
    WEEK -->|"12 reviews"| QUARTER
    Q5 -->|"approved"| N["New cycle in goals/okrs.json<br/>life map updated"]
    N --> DAY
```

## 3. Where to look

| Question | Open | What you see |
|---|---|---|
| Am I on track this cycle? | `dashboard.md` → OKR progress | Bars per KR, pace flags, bar chart vs. time elapsed |
| Are my habits holding? | `dashboard.md` → Habit streaks | Streak table and a 28-day grid (■ done, □ missed, ┄ not logged) |
| How am I sleeping and feeling? | `dashboard.md` → Sleep & energy | Sleep bars against the 7 h line; daily energy line |
| Where does my time go? | `dashboard.md` → Goal work vs. drift | Pie for the last 7 days; goal vs. drift share per cycle week |
| Which career path is winning? | `dashboard.md` → Decision gate | Energy per path from your logs; quadrant chart once feasibility is scored |
| What's the 3-year plan? | `roadmap/life-map.md` | Flowchart of paths and the gate; Gantt timeline with today marked |
| What happened on a given day/week? | `journal/`, `reviews/` | Numbers, observations, the adjustment and its outcome |

Best viewer: the repo on github.com or the GitHub mobile app (both render Mermaid). Plain text editors show the chart code instead.
