import webpush from "web-push";
import { getRedis, REMINDERS_KEY, SUBS_KEY } from "./_lib.js";

const DAY_MS = 86400000;
const KEEP_SENT_MS = 7 * DAY_MS;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!process.env.CRON_SECRET || req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "Invalid cron secret" });
    return;
  }
  const redis = getRedis();
  if (!redis) {
    res.status(500).json({ error: "Redis not connected" });
    return;
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    res.status(500).json({ error: "VAPID keys not configured" });
    return;
  }

  webpush.setVapidDetails(
    "mailto:beepul9@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  let reminders = (await redis.get(REMINDERS_KEY)) || [];
  let subs = (await redis.get(SUBS_KEY)) || [];
  if (!Array.isArray(reminders)) reminders = [];
  if (!Array.isArray(subs)) subs = [];

  const now = Date.now();
  const due = reminders.filter(r => !r.sent && r.due <= now);
  const deadEndpoints = new Set();
  let pushed = 0;

  for (const reminder of due) {
    const payload = JSON.stringify({
      title: "Don't forget",
      body: reminder.text
    });
    for (const sub of subs) {
      if (deadEndpoints.has(sub.endpoint)) continue;
      try {
        await webpush.sendNotification(sub, payload);
        pushed++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          deadEndpoints.add(sub.endpoint);
        }
      }
    }
    if (reminder.repeat === "daily") {
      while (reminder.due <= now) reminder.due += DAY_MS;
    } else {
      reminder.sent = true;
      reminder.sentAt = now;
    }
  }

  // Re-read before writing: the push loop above is slow (network calls), and a
  // blind write-back would erase any reminder added/deleted meanwhile. Merge the
  // processed state onto the fresh list by id — never resurrect deletions,
  // never drop additions.
  let fresh = (await redis.get(REMINDERS_KEY)) || [];
  if (!Array.isArray(fresh)) fresh = [];
  const processedById = new Map(due.map(r => [r.id, r]));
  let merged = fresh.map(r => {
    const p = processedById.get(r.id);
    return p ? { ...r, due: p.due, sent: p.sent, sentAt: p.sentAt, repeat: p.repeat } : r;
  });
  merged = merged.filter(r => !r.sent || (now - (r.sentAt || now)) < KEEP_SENT_MS);
  await redis.set(REMINDERS_KEY, merged);
  reminders = merged;

  if (deadEndpoints.size) {
    subs = subs.filter(s => !deadEndpoints.has(s.endpoint));
    await redis.set(SUBS_KEY, subs);
  }

  res.status(200).json({ checked: reminders.length, dueNow: due.length, pushed, devices: subs.length });
}
