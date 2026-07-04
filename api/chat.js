const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.APP_PIN) {
    res.status(500).json({ error: "Server not configured: APP_PIN env var is missing in Vercel" });
    return;
  }
  if (!process.env.AI_API_KEY) {
    res.status(500).json({ error: "Server not configured: AI_API_KEY env var is missing in Vercel" });
    return;
  }

  const { pin, system, message } = req.body || {};

  if (pin !== process.env.APP_PIN) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${process.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          { role: "system", content: system || "" },
          { role: "user", content: message }
        ]
      })
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `AI provider error (${upstream.status}): ${data.error?.message || JSON.stringify(data.error) || "unknown upstream error"}`
      });
      return;
    }

    const text = data.choices?.[0]?.message?.content || "";
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: "Server error contacting the AI provider" });
  }
}
