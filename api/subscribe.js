import { getRedis, pinOk, SUBS_KEY } from "./_lib.js";

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

  const sub = req.body?.subscription;
  if (!sub || !sub.endpoint) {
    res.status(400).json({ error: "Missing subscription" });
    return;
  }

  let subs = (await redis.get(SUBS_KEY)) || [];
  if (!Array.isArray(subs)) subs = [];
  subs = subs.filter(s => s.endpoint !== sub.endpoint);
  subs.push(sub);
  if (subs.length > 10) subs = subs.slice(-10);
  await redis.set(SUBS_KEY, subs);

  res.status(200).json({ ok: true, devices: subs.length });
}
