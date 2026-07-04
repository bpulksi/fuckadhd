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

  const modelId = model || "gemini-2.0-flash";

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message }] }],
          systemInstruction: { parts: [{ text: system || "" }] },
          generationConfig: { maxOutputTokens: 1024 }
        })
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data.error?.message || "Upstream error" });
      return;
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text || "").join("");
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: "Server error contacting Gemini" });
  }
}
