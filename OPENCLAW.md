# OpenClaw on your Android phone + Fuck ADHD

OpenClaw is a self-hosted AI assistant. Running it directly on the phone
(inside Termux) means no PC needs to be on — the phone is the host AND the
client. You chat with it via Telegram; it stores reminders in this app's
cloud API, and the app's push pipeline delivers them.

- **OpenClaw = capture.** Text it "remind me tomorrow 9am to submit the form"
  from anywhere.
- **Fuck ADHD cloud = delivery.** Reminders live in Upstash Redis and are
  pushed by GitHub Actions — delivery works even if OpenClaw/Termux dies.

## Honest warnings before you start

- Termux is a community-supported way to run OpenClaw, not official. Expect
  some friction; it may take an hour.
- Android kills background apps. Without the battery/wake-lock steps below,
  OpenClaw silently stops and capture breaks (delivery keeps working).
- After a phone reboot you must reopen Termux and start OpenClaw again
  (or set up Termux:Boot to do it automatically).
- You need ~2 GB free storage and Android 10+.

## Phone setup (all on the phone)

1. **Install Termux from F-Droid** (f-droid.org) — NOT from the Play Store
   (the Play Store build is outdated and broken for this).
2. Open Termux and run, one line at a time:
   ```
   pkg update -y
   pkg upgrade -y
   pkg install -y nodejs-lts git
   npm install -g openclaw
   ```
3. Run OpenClaw's guided onboarding (follow prompts):
   ```
   openclaw onboard
   ```
   - Model provider: use the same DeepSeek/OpenRouter key as the app
     (from SECRETS-SETUP.txt step 1).
   - Channel: Telegram — create a bot with @BotFather in Telegram, paste the
     token, and restrict the bot to YOUR Telegram account id only.
4. Keep it alive:
   - In Termux: `termux-wake-lock` (stops Android from suspending it).
   - Android Settings → Apps → Termux → Battery → Unrestricted.
   - Optional: install the Termux:Boot app (F-Droid) so OpenClaw starts on
     reboot.
5. Add the skill below to OpenClaw's skills/workspace directory as
   `fuckadhd-reminders.md`, replacing `<YOUR_PIN>` with the same PIN set as
   APP_PIN in Vercel.

## The skill (paste into OpenClaw)

```markdown
# Skill: Fuck ADHD reminders

When the user asks to be reminded of something, store it in their reminder app
(do NOT keep it only in memory) by calling:

POST https://fuckadhd.vercel.app/api/reminders
Content-Type: application/json

{"pin": "<YOUR_PIN>", "action": "add", "text": "<short reminder text>",
 "due": <due time as UNIX epoch MILLISECONDS in the user's local timezone>,
 "repeat": "none" or "daily"}

- "text": keep it short and imperative, e.g. "take meds", "submit the form".
- "due": compute from the user's words ("tomorrow 9am", "in 2 hours").
  Must be epoch milliseconds, not seconds.
- "repeat": "daily" only if the user says every day / daily; otherwise "none".

To list reminders: same URL with {"pin": "<YOUR_PIN>", "action": "list"}.
To delete one: {"pin": "<YOUR_PIN>", "action": "delete", "id": "<id from list>"}.

A successful add returns {"reminders": [...]}. Confirm to the user in one short
sentence what was set and for when. The user's phone will get a push
notification within ~5 minutes of the due time.
```

## Notes

- The PIN in the skill file lives only on your phone. Never commit it.
- If OpenClaw stops responding on Telegram: open Termux, run `openclaw`
  again. Your reminders are safe in the cloud either way.
- A PC can host OpenClaw instead with the exact same skill file, if the
  Termux route proves too flaky.
