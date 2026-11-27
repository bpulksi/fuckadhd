// AI tool modes; prompts unchanged from the original app.
export const modeConfig = {
  breakdown: {
    title: "Break it down",
    label: "What's the task?",
    placeholder: "e.g. clean the kitchen, start the report, reply to that email I've been avoiding",
    desc: "Type the thing you're stuck on. You get one concrete trigger to act on, not a to-do list.",
    showCheckin: true,
    systemExtra: `The user is stuck starting a task. Research on ADHD task initiation (Gawrilow & Gollwitzer) shows "implementation intentions" — concrete if-then trigger plans — measurably outperform generic to-do lists at getting action started. Your job is to produce ONE of these, not a checklist.

Start your response with a single line in exactly this form:
"FIRST: If <a concrete, checkable trigger — a specific time, location, or thing that just happened>, then I will <one tiny physical action taking under 2 minutes, phrased as a literal physical movement, e.g. "open the document and type one sentence" not "start the report">."

Then a blank line, then at most 2-3 further if-then pairs for the steps after that (same "If X, then I will Y" format, still small and concrete) — never a generic numbered list of vague steps. Size the trigger and action to their stated energy and mood: low energy or overwhelmed mood means a smaller action and a more immediate/easy-to-satisfy trigger. No commentary, no encouragement filler, no summary at the end.`
  },
  ask: {
    title: "Ask",
    label: "What's on your mind?",
    placeholder: "Paste a message, describe a decision, or tell me what happened...",
    desc: "Paste something before sending it, describe a decision, or tell it what happened. One direct, honest response.",
    showCheckin: false,
    systemExtra: `The user will send you one of: (a) a message they're about to send — tell them honestly and briefly how it reads (tone, clarity, risk of being misread) in 2-4 sentences, offer one rewrite only if it would genuinely help; (b) something they did or didn't accomplish — respond with honest, warm, non-judgmental encouragement in 2-5 sentences, don't minimize the difficulty, don't lecture, don't enable avoidance either; (c) a decision they're weighing — give a direct, honest opinion on whether it's reasonable in 2-4 sentences plus at most one real consideration. Infer which of these fits from what they send and respond accordingly. Do not be sycophantic. Do not pad the response. Do not ask which mode they meant.`
  }
};
