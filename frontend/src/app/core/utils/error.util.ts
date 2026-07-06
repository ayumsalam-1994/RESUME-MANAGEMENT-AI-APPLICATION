/**
 * Normalizes any HttpErrorResponse/error shape into a human-readable string.
 * Handles the common cases seen across this app's backend responses:
 * - `{ error: "some string" }`
 * - `{ error: [ZodIssue, ...] }` (validation errors — array of {path, message})
 * - `{ message: "some string" }`
 * - network/client-side errors (`error.message`)
 * Without this, rendering a Zod issue array directly (e.g. via template
 * interpolation) prints "[object Object]" instead of anything useful.
 */
export function extractErrorMessage(error: any, fallback = 'Something went wrong. Please try again.'): string {
  const raw = error?.error?.error ?? error?.error?.message ?? error?.message ?? fallback;

  if (typeof raw === 'string' && raw.trim()) {
    return raw;
  }

  if (Array.isArray(raw)) {
    const messages = raw
      .map((issue: any) => {
        if (issue && typeof issue === 'object') {
          const field = Array.isArray(issue.path) && issue.path.length ? issue.path.join('.') : null;
          const msg = issue.message || 'Invalid value';
          return field ? `${field}: ${msg}` : msg;
        }
        return typeof issue === 'string' ? issue : null;
      })
      .filter(Boolean);
    return messages.length ? messages.join(' | ') : 'Please check the form fields and try again.';
  }

  if (raw && typeof raw === 'object') {
    return 'Something went wrong. Please try again.';
  }

  return fallback;
}
