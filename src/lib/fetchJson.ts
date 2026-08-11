/** Parse JSON from fetch; surface HTML/timeout pages as clear errors. */
export async function fetchJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ res: Response; data: T }> {
  const headers = new Headers(init?.headers);
  if ((init?.method || "GET").toUpperCase() === "POST" &&
      !headers.has("x-idempotency-key") &&
      typeof crypto !== "undefined" && "randomUUID" in crypto) {
    headers.set("x-idempotency-key", crypto.randomUUID());
  }
  const res = await fetch(input, { ...init, headers });
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
    const data = JSON.parse(trimmed) as T & {
      recoveryJobId?: string;
      status?: number;
    };
    if (res.status === 202 && data.recoveryJobId) {
      for (let attempt = 0; attempt < 180; attempt += 1) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 500);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          }, { once: true });
        });
        const poll = await fetch(`/api/recovery/jobs/${encodeURIComponent(data.recoveryJobId)}`, {
          headers: { Accept: "application/json" },
          signal: init?.signal,
        });
        if (!poll.ok) throw new Error(`Recovery status failed (${poll.status})`);
        const payload = (await poll.json()) as { job?: { status?: string; result?: T; error?: string } };
        const job = payload.job;
        if (job?.status === "completed") {
          return { res: new Response(JSON.stringify(job.result), { status: 200, headers: { "content-type": "application/json" } }), data: job.result as T };
        }
        if (job?.status === "failed" || job?.status === "cancelled") {
          throw new Error(job.error || "Recovery job failed");
        }
      }
      throw new Error("Recovery job is still running; retry status polling later.");
    }
    return { res, data: data as T };
  } catch {
    throw new Error(
      `Invalid JSON response (HTTP ${res.status}): ${trimmed.slice(0, 120)}`,
    );
  }
}
