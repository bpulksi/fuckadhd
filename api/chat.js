export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { pin, model, system, message } = req.body || {};

  if (!process.env.APP_PIN || pin !== process.env.APP_PIN) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: model || "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: system || "",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data.error?.message || "Upstream error" });
      return;
    }

    const text = (data.content || []).map(block => block.text || "").join("");
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: "Server error contacting Anthropic" });
  }
}
