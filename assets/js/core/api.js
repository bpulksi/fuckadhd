import { state } from "./state.js";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** POST JSON to one of the /api functions with the PIN attached. Throws ApiError with a human message. */
export async function api(path, body = {}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError("You're offline. This needs a connection.", 0);
  }
  let res;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: state.pin, ...body })
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new ApiError("Wrong or missing PIN. Set it in Settings.", 401);
  if (!res.ok) throw new ApiError(data.error || `Server error (HTTP ${res.status})`, res.status);
  return data;
}

/** Chat completion through /api/chat. Returns the reply text. */
export async function chat(system, message) {
  const data = await api("/api/chat", { system, message });
  return data.text || "";
}
