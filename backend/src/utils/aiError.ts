const BUSY_PATTERNS = [
  /\b503\b/,
  /\b429\b/,
  /service unavailable/i,
  /overloaded/i,
  /too many requests/i,
  /rate limit/i,
  /resource_exhausted/i,
  /quota exceeded/i,
  /\bUNAVAILABLE\b/
];

export const AI_BUSY_MESSAGE = "The AI service is currently busy. Please wait a moment and try again.";

/**
 * Detects whether an error thrown by a Gemini SDK call (`model.generateContent(...)`)
 * represents transient upstream overload/rate-limiting, as opposed to a genuine
 * programming/parsing error. Used to swap in a clean, actionable message instead
 * of surfacing raw Google API error text to end users.
 */
export function isAiServiceBusyError(err: any): boolean {
  const msg = String(err?.message ?? err ?? "");
  return BUSY_PATTERNS.some((pattern) => pattern.test(msg));
}
