import { getRedis, pinOk, DEADLINES_KEY } from "./_lib.js";

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

  let deadlines = (await redis.get(DEADLINES_KEY)) || [];
  if (!Array.isArray(deadlines)) deadlines = [];

  if (req.method === "GET" || (req.method === "POST" && req.body?.action === "list")) {
    res.status(200).json({ deadlines });
    return;
  }

  if (req.method === "POST" && req.body?.action === "add") {
    const { label, date } = req.body;
    if (!label || typeof label !== "string" || !Number.isFinite(date)) {
      res.status(400).json({ error: "Need a label and a valid date" });
      return;
    }
    if (deadlines.some(d => d.label === label)) {
      res.status(200).json({ deadlines });
      return;
    }
    deadlines.push({
      id: crypto.randomUUID(),
      label: label.slice(0, 200),
      date
    });
    await redis.set(DEADLINES_KEY, deadlines);
    res.status(200).json({ deadlines });
    return;
  }

  if (req.method === "POST" && req.body?.action === "delete") {
    deadlines = deadlines.filter(d => d.id !== req.body.id);
    await redis.set(DEADLINES_KEY, deadlines);
    res.status(200).json({ deadlines });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
