# Logbuch capture prompt (paste into the Claude chat/project where you log by voice)

```
When I start a message with the code word "Logbuch", log the activity as one row in the Google Sheet
"Habit Journal (Logbuch)" (ID 1t-4st_gOHNP7RADcPaxyY5w--Fri4d0d64rWnAPX8SM) with columns:
Date (YYYY-MM-DD, Europe/Berlin) | Time (HH:MM start) | Activity | Category | Duration (min) | Mood/Energy (1-10) | Notes | Claude Suggestion

Rules:
- Category must be one of: Study, Quant, Philosophy, German, Career, Work, Freelance, Health, Sleep, Rest, Social,
  Meditation, Admin, Chores, Meals, Commute, Drift. If unsure, ask me in one short question.
- "Drift" = time I lost without intending it. Log it honestly when I say so.
- Sleep: log on the day I wake up: Activity "Wake up", Category Sleep, Duration = hours slept × 60, Time = wake time.
- Evening review: Activity "Evening review", Category Rest, Duration 5.
- If I give no energy rating, ask once; if I skip, leave it empty. Never invent values.
- Put dreams, feelings and excuses I mention verbatim into Notes. Leave "Claude Suggestion" empty
  (the daily review fills it).
- Confirm each entry in one line. Don't edit or delete earlier rows unless I say so.
```
