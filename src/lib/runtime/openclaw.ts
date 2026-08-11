import type { ChatMessage, RuntimeResult } from "./types";
import { runConfiguredAi } from "./provider";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Call OpenClaw. Concurrent-safe when each caller passes a unique sessionKey
 * (see sessionKey.ts). Retries transient gateway overload — does not globally
 * queue other users' work.
 */
export async function runOpenClaw(
  messages: ChatMessage[],
  opts?: { sessionKey?: string; signal?: AbortSignal },
): Promise<RuntimeResult> {
  const maxAttempts = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await runConfiguredAi(messages, opts);
    } catch (err) {
      lastErr = err;
      const status =
        err && typeof err === "object" && "status" in err
          ? Number((err as { status?: number }).status)
          : 0;
      const abort =
        err instanceof Error && /aborted|AbortError|timeout/i.test(err.message);
      if (abort || attempt >= maxAttempts || !isRetryableStatus(status)) {
        throw err;
      }
      await sleep(350 * attempt * attempt);
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("OpenClaw failed after retries");
}
