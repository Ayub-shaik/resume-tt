import type { ChatMessage, RuntimeResult } from "./types";
import { assertSafeInternalBaseUrl } from "@/lib/security/validate";

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
  opts?: { sessionKey?: string },
): Promise<RuntimeResult> {
  const rawBase =
    process.env.OPENCLAW_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:18789/v1";
  const parsed = assertSafeInternalBaseUrl(rawBase);
  const endpoint = `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}/chat/completions`;

  const token = process.env.OPENCLAW_GATEWAY_TOKEN?.trim();
  if (!token) {
    throw new Error("OPENCLAW_GATEWAY_TOKEN is not set");
  }
  if (token.length < 16) {
    throw new Error("OPENCLAW_GATEWAY_TOKEN looks invalid");
  }

  const model = process.env.OPENCLAW_MODEL || "openclaw/default";
  const sessionKey = opts?.sessionKey?.trim() || undefined;
  const maxAttempts = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 170_000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(sessionKey ? { "x-openclaw-session-key": sessionKey } : {}),
        },
        body: JSON.stringify({
          model,
          // Distinct user ids help some gateways isolate lanes
          user: sessionKey ? `mpi:${sessionKey}` : undefined,
          temperature: 0.4,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        const err = new Error(
          `OpenClaw HTTP ${res.status}: ${body.slice(0, 200)}`,
        ) as Error & { status?: number };
        err.status = res.status;
        if (
          attempt < maxAttempts &&
          isRetryableStatus(res.status)
        ) {
          lastErr = err;
          await sleep(350 * attempt * attempt);
          continue;
        }
        throw err;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text) throw new Error("OpenClaw returned empty content");
      return { text, runtime: "openclaw" };
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
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("OpenClaw failed after retries");
}
