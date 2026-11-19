# Habit Plan (Gewohnheitsplan)

**Status: DRAFT.** Times marked `TBD(Q-B1)` etc. are placeholders until the questionnaire is filled. Machine-readable
counterpart (streaks): `config/habits.json`.

## Principles
- **Four active habits at most** (Regel der Wenigen). Each is anchored to an existing cue, minimal on day one, and
  made *easy* before it is made *big* (Fogg: behaviour = motivation × ability × prompt; fix ability and prompt first).
- **Implementation intentions** ("If X, then Y", Gollwitzer) for every trigger and every known failure mode.
- **Habit formation takes time:** Lally et al. (2009) found a median of ~66 days to automaticity, with a range of
  roughly 18 to 254 (from memory; verify if you cite it). Plan for ~10 weeks, expect misses, and do not reset to zero
  after one: *never miss twice* is the rule.
- **Friction asymmetry:** add friction to drift, remove friction from goal work. Environment beats willpower.
- **Externalise** (time-blindness aid, relevant if `TBD(Q-C4)` says so): visible timers, objects left out, calendar blocks, phone alarms.
- **Unlock rule** for any new habit: an active habit has ≥ 80% adherence over 21 consecutive days (dashboard 28 d column).

## Active stack

### 1. Wake anchor (Weckanker): keystone habit (Schlüsselgewohnheit)
| | |
|---|---|
| Target | Up at ≤ **07:30** `TBD(Q-B1)` on workdays; free days ≤ +60 min |
| Cue | Alarm across the room (phone charges in the hallway) |
| Routine | Feet on floor → glass of water → 2 min daylight at window/balcony → log "Logbuch wake" with energy 1-10 |
| Reward | Coffee/tea only after the log; the log itself feeds the streak bar |
| Friction **add** | Phone charges outside the bedroom; no snooze (alarm app with a task, or a second alarm that requires standing) |
| Friction **remove** | Water glass and clothes prepared the night before |
| If-then | **If** the alarm rings, **then** I stand up before touching any screen. **If** I wake > 30 min late, **then** I still do the 2-min daylight + log, and shift the first deep block by the same amount, not skip it. |
| Why keystone | Sleep regularity gates energy, which gates every KR; it is also the cheapest data point to log. |

### 2. Deep block 90 min (Tiefenarbeit): goal work first
| | |
|---|---|
| Target | One 90-min block of goal work (Study now; Quant/Philosophy via KR2) before 13:00 `TBD(Q-B4)` |
| Cue | End of the wake routine; or first free slot after a shift (BK days: shorter 45-min block, see if-then) |
| Routine | Same desk, phone in another room, one task written on paper the evening before, timer visible; log it at the end |
| Reward | Check off on paper, then something small you like (walk, tea, a page of Jung/Stoic reading, guilt-free) |
| Friction **add** | Site blocker for drift sites during the block; phone in a drawer |
| Friction **remove** | Materials already open on the desk; task chosen the night before (decision cost zero at start) |
| If-then | **If** I'm in the chair at the planned time, **then** I start with the 5-minute version (open the file, write one sentence). **If** I notice the urge to check the phone, **then** I write the urge on paper and continue for 2 more minutes. **If** a BK shift blocks the morning, **then** I do 45 min straight after waking and the 90 min on the next free day (do not skip both). |
| Minimum viable | 25 min counts as "started"; streak needs ≥ 90 min, but logged shorter blocks still count toward KRs |

### 3. German 20 min (Deutsch)
| | |
|---|---|
| Target | ≥ 20 min daily, any mode that produces active use (Anki + sentence writing, reading, tandem) `TBD(Q-E2)` |
| Cue | Right after lunch dishes, or during the commute to BK |
| Routine | Anki reviews (10 min) → write 3 sentences about yesterday in German (10 min); one new idiom per week |
| Reward | Tick; once per week voice-message a German friend or tandem partner |
| Friction **add/remove** | Anki on the phone's first screen; German-only podcast queued for commutes |
| If-then | **If** I finish lunch, **then** I open Anki before checking messages. **If** I only have 5 minutes, **then** I do reviews only (still log it). |

### 4. Evening review (Abendreview): Stoic Abendprüfung + Logbuch close
| | |
|---|---|
| Target | 5 min, same time each evening `TBD(Q-B1)` (about 30 min before bed) |
| Cue | Phone goes onto the charger in the hallway (the same act ends the day) |
| Routine | Log anything missing → three Seneca questions in one line each: *What did I do badly? What did I do well? What did I leave undone?* → choose tomorrow's one deep-block task and write it on paper |
| Reward | Tick; then the screen goes off |
| Friction **add** | Notebook and pen on the charger shelf |
| Friction **remove** | The three questions printed on the first page of the notebook |
| If-then | **If** the phone goes on the charger, **then** I write the three lines before leaving the room. **If** I skip a day, **then** the next morning's wake log includes the missed review in one sentence. |

## Parking lot (not active; unlocks when the stack is stable)
| Candidate | Unlock condition | Notes |
|---|---|---|
| Movement 20 min (walk/zone 2) | Habits 1-2 at ≥ 80% for 21 days | Likely the highest return after sleep for energy; check the data first |
| Meditation / Zeugenbewusstsein 10 min | Habit 4 at ≥ 80% for 21 days | Osho-style witnessing; link it to the evening review |
| Dream log (Traumtagebuch) | After `TBD(Q-F3)` answered yes | 2 min on waking; only with the wake anchor stable |
| Paper-trading journal | Quant sprint shows ≥ 4 weeks of voluntary hours | Counts under `Quant` category, not a new habit |
| Last-meal 3 h before bed (Blueprint-style) | Sleep data shows poor sleep ≥ 3 nights/week | Behavioural experiment; measure via sleep log |

## Drift counter-plan (known leaks `TBD(Q-B6)`)
- **If** I open the leak app before 13:00, **then** I do the 5-minute version of the deep block first, then decide again.
- Remove the app from the home screen; log "Drift" honestly (it counts for nothing and teaches everything).
- Weekly: the top drift activity in `dashboard.md` gets one specific friction change, not a promise.

## Review cadence
Daily: `/daily` writes one adjustment into the sheet. Weekly: adherence per habit and one change at most.
Quarterly: promote, retire or swap habits against KR evidence.
