export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!process.env.APP_PIN || req.body?.pin !== process.env.APP_PIN) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }
  if (!process.env.GROQ_API_KEY) {
    res.status(501).json({ error: "Voice input needs a free Groq key (console.groq.com, no card) added as GROQ_API_KEY in Vercel." });
    return;
  }

  const { audio, mime } = req.body || {};
  if (!audio || typeof audio !== "string") {
    res.status(400).json({ error: "Missing audio" });
    return;
  }

  try {
    const buffer = Buffer.from(audio, "base64");
    if (buffer.length > 3 * 1024 * 1024) {
      res.status(400).json({ error: "Recording too long — keep it under ~45 seconds." });
      return;
    }
    const form = new FormData();
    const ext = (mime || "").includes("ogg") ? "ogg" : "webm";
    form.append("file", new Blob([buffer], { type: mime || "audio/webm" }), `voice.${ext}`);
    form.append("model", "whisper-large-v3-turbo");

    const upstream = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: form
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Transcription error (${upstream.status}): ${data.error?.message || "unknown"}` });
      return;
    }
    res.status(200).json({ text: data.text || "" });
  } catch (e) {
    res.status(500).json({ error: "Server error during transcription" });
  }
}
