// Break it down / Ask: AI reply via /api/chat, voice in (/api/transcribe) and out (speechSynthesis).
import { $, escapeHtml, setLoading, setStatus, uid } from "../core/dom.js";
import { api, chat } from "../core/api.js";
import { state, save, hasPin } from "../core/state.js";
import { onShow } from "../core/router.js";
import { modeConfig } from "./modes.js";

let currentMode = "breakdown";
let lastReply = "";
let voiceRequested = false;
let mediaRecorder = null;
let recordChunks = [];

function applyModeUI() {
  const cfg = modeConfig[currentMode];
  $("aiTitle").textContent = cfg.title;
  $("modeDesc").textContent = cfg.desc;
  $("inputLabel").textContent = cfg.label;
  $("userInput").placeholder = cfg.placeholder;
  $("userInput").value = "";
  $("checkinWrap").hidden = !cfg.showCheckin;
  $("checkinWrap").open = false;
  $("output").textContent = "";
  $("firstStepBox").innerHTML = "";
  $("replayBtn").hidden = true;
  setStatus($("status"), hasPin() ? "" : "Add your PIN in Settings first; replies come from your server.", hasPin() ? "" : "err");
}

function buildHistorySummary() {
  const recent = state.history.slice(-5);
  if (!recent.length) return "";
  const lines = recent.map((h) => {
    const fb = h.feedback ? ` (user said this ${h.feedback === "worked" ? "helped" : "did not help"})` : "";
    return `- [${h.mode}] input: "${h.input.slice(0, 80)}"${fb}`;
  });
  return `Recent interactions with this user, for context on what has and hasn't worked:\n${lines.join("\n")}\n`;
}

function buildSystemPrompt(cfg) {
  let sys = `You are a direct, concise, warm personal assistant for someone with ADHD. Never be preachy, never pad with filler, never apologize. Get straight to useful content.\n\n`;
  if (state.aboutMe.trim()) sys += `What this user has told you about themselves:\n${state.aboutMe.trim()}\n\n`;
  const hist = buildHistorySummary();
  if (hist) sys += hist + "\n";
  return sys + cfg.systemExtra;
}

function renderOutput(text) {
  if (currentMode === "breakdown") {
    const m = text.match(/^FIRST:\s*(.+?)(?:\n|$)/i);
    if (m) {
      $("firstStepBox").innerHTML = `<div class="firstStep"><span class="eyebrow">Do this first</span>${escapeHtml(m[1])}</div>`;
      $("output").textContent = text.replace(/^FIRST:.*(?:\n|$)/i, "").trim();
      return;
    }
  }
  $("firstStepBox").innerHTML = "";
  $("output").textContent = text;
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const clean = text.replace(/FIRST:/gi, "First: ").replace(/[*#_`]/g, "");
  const u = new SpeechSynthesisUtterance(clean.slice(0, 1200));
  u.rate = 1.0;
  speechSynthesis.speak(u);
}

function renderSpeakToggle() {
  $("speakToggleBtn").setAttribute("aria-pressed", String(state.voiceOut));
}

async function submit() {
  const cfg = modeConfig[currentMode];
  const input = $("userInput").value.trim();
  if (!input) { $("userInput").focus(); return; }
  const userMsg = cfg.showCheckin
    ? `Task: ${input}\nEnergy: ${$("energy").value}\nMood: ${$("mood").value}\nDeadline: ${$("deadline").value || "none"}`
    : input;

  const statusEl = $("status");
  $("output").textContent = "";
  $("firstStepBox").innerHTML = "";
  setStatus(statusEl, "Thinking…");
  setLoading($("submitBtn"), true);
  try {
    const full = await chat(buildSystemPrompt(cfg), userMsg);
    renderOutput(full);
    setStatus(statusEl, "");
    lastReply = full;
    $("replayBtn").hidden = !full;
    if (voiceRequested || state.voiceOut) speak(full);
    state.history.push({ id: uid(), ts: Date.now(), mode: currentMode, input, output: full, feedback: null });
    if (state.history.length > 100) state.history = state.history.slice(-100);
    save();
  } catch (e) {
    setStatus(statusEl, e.message, "err");
  } finally {
    voiceRequested = false;
    setLoading($("submitBtn"), false);
  }
}

async function toggleRecording() {
  const statusEl = $("status");
  const mic = $("micBtn");
  if (mediaRecorder && mediaRecorder.state === "recording") { mediaRecorder.stop(); return; }
  try {
    if (!navigator.mediaDevices || !window.MediaRecorder) throw new Error("This browser can't record audio.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordChunks = [];
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus" : "";
    mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size) recordChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      mic.classList.remove("recording");
      mic.setAttribute("aria-pressed", "false");
      const blob = new Blob(recordChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      if (blob.size < 1500) { setStatus(statusEl, "Too short. Hold the thought and try again."); return; }
      if (blob.size > 3 * 1024 * 1024) { setStatus(statusEl, "Too long. Keep it under about 45 seconds.", "err"); return; }
      setStatus(statusEl, "Transcribing…");
      try {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        const data = await api("/api/transcribe", { audio: btoa(binary), mime: blob.type });
        const text = (data.text || "").trim();
        if (!text) { setStatus(statusEl, "Didn't catch that. Try again."); return; }
        $("userInput").value = text;
        setStatus(statusEl, "");
        voiceRequested = true;
        submit();
      } catch (e) {
        setStatus(statusEl, e.message, "err");
      }
    };
    mediaRecorder.start();
    mic.classList.add("recording");
    mic.setAttribute("aria-pressed", "true");
    setStatus(statusEl, "Listening… tap the microphone again when you're done.");
    setTimeout(() => { if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); }, 45000);
  } catch (e) {
    setStatus(statusEl, /denied|permission/i.test(e.message) ? "Microphone permission denied. Allow it in your browser settings." : e.message, "err");
  }
}

export function initAi() {
  onShow("ai", (mode) => {
    if (mode && modeConfig[mode] && (mode !== currentMode || !$("userInput").value)) {
      currentMode = mode;
      applyModeUI();
    } else if (!$("aiTitle").dataset.ready) {
      applyModeUI();
    }
    $("aiTitle").dataset.ready = "1";
  });
  $("submitBtn").addEventListener("click", submit);
  $("userInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  });
  $("replayBtn").addEventListener("click", () => speak(lastReply));
  $("speakToggleBtn").addEventListener("click", () => {
    state.voiceOut = !state.voiceOut;
    save();
    renderSpeakToggle();
    if (!state.voiceOut && "speechSynthesis" in window) speechSynthesis.cancel();
  });
  $("micBtn").addEventListener("click", toggleRecording);
  renderSpeakToggle();
}
