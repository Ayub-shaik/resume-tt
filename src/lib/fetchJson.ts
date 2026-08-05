/** Parse JSON from fetch; surface HTML/timeout pages as clear errors. */
export async function fetchJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ res: Response; data: T }> {
  const res = await fetch(input, init);
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(res.ok ? "Empty response" : `Request failed (${res.status})`);
  }
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    throw new Error(
      res.status === 524 || res.status === 504
        ? "Timed out waiting for OpenClaw. Try again — long resumes can take a minute."
        : `Server returned a web page instead of JSON (HTTP ${res.status}). Try again; if it persists, OpenClaw or the tunnel may be timing out.`,
    );
  }
  try {
    return { res, data: JSON.parse(trimmed) as T };
  } catch {
    throw new Error(
      `Invalid JSON response (HTTP ${res.status}): ${trimmed.slice(0, 120)}`,
    );
  }
}
