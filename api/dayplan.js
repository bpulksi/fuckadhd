import { getRedis, pinOk } from "./_lib.js";

const DAYPLAN_KEY = "dayplan";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const redis = getRedis();
  if (!redis) {
    res.status(500).json({ error: "Server not configured: Upstash Redis is not connected in Vercel" });
    return;
  }
  if (!pinOk(req)) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }

  const action = req.body?.action;
  let plan = (await redis.get(DAYPLAN_KEY)) || null;

  if (action === "get") {
    res.status(200).json({ plan });
    return;
  }

  if (action === "set") {
    const { date, items, energy } = req.body;
    if (!date || !Array.isArray(items)) {
      res.status(400).json({ error: "Need date and items array" });
      return;
    }
    plan = {
      date: String(date).slice(0, 10),
      energy: typeof energy === "string" ? energy.slice(0, 20) : "",
      generatedAt: Date.now(),
      items: items.slice(0, 12).map(it => ({
        id: it.id || crypto.randomUUID(),
        text: String(it.text || "").slice(0, 200),
        done: Boolean(it.done)
      })).filter(it => it.text)
    };
    await redis.set(DAYPLAN_KEY, plan);
    res.status(200).json({ plan });
    return;
  }

  if (action === "toggle") {
    if (!plan || !Array.isArray(plan.items)) {
      res.status(400).json({ error: "No plan to toggle" });
      return;
    }
    const item = plan.items.find(it => it.id === req.body.id);
    if (item) item.done = !item.done;
    await redis.set(DAYPLAN_KEY, plan);
    res.status(200).json({ plan });
    return;
  }

  res.status(400).json({ error: "Unknown action" });
}
