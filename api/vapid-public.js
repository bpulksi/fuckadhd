export default function handler(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(500).json({ error: "Server not configured: VAPID_PUBLIC_KEY env var is missing in Vercel" });
    return;
  }
  res.status(200).json({ key });
}
