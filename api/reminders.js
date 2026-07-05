import { getRedis, pinOk, REMINDERS_KEY } from "./_lib.js";

export default async function handler(req, res) {
  const redis = getRedis();
  if (!redis) {
    res.status(500).json({ error: "Server not configured: Upstash Redis is not connected in Vercel" });
    return;
  }
  if (!pinOk(req)) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  let reminders = (await redis.get(REMINDERS_KEY)) || [];
  if (!Array.isArray(reminders)) reminders = [];

  if (req.method === "GET" || (req.method === "POST" && req.body?.action === "list")) {
    res.status(200).json({ reminders });
    return;
  }

  if (req.method === "POST" && req.body?.action === "add") {
    const { text, due, repeat, tag } = req.body;
    if (!text || typeof text !== "string" || !Number.isFinite(due)) {
      res.status(400).json({ error: "Need text and a valid due time" });
      return;
    }
    if (tag) {
      reminders = reminders.filter(r => r.tag !== tag);
    }
    const reminder = {
      id: crypto.randomUUID(),
      text: text.slice(0, 300),
      due,
      repeat: repeat === "daily" ? "daily" : "none",
      sent: false,
      tag: typeof tag === "string" ? tag.slice(0, 50) : undefined
    };
    reminders.push(reminder);
    await redis.set(REMINDERS_KEY, reminders);
    res.status(200).json({ reminders });
    return;
  }

  if (req.method === "POST" && req.body?.action === "delete") {
    reminders = reminders.filter(r => r.id !== req.body.id);
    await redis.set(REMINDERS_KEY, reminders);
    res.status(200).json({ reminders });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
