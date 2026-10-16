import { assertSafeInternalBaseUrl } from "@/lib/security/validate";
import type { ChatMessage, RuntimeResult } from "./types";

/** HTTP failure from an OpenAI-compatible provider — status is typed for retries. */
export class AiHttpError extends Error {
  readonly status: number;
  constructor(status: number, body: string) {
    // Do not embed provider body (may contain secrets/PII) in the Error message.
    super(`AI provider HTTP ${status}`);
    this.name = "AiHttpError";
    this.status = status;
    void body;
  }
}

function aiAbortSignal(user?: AbortSignal): AbortSignal {
  const raw = Number(process.env.AI_TIMEOUT_MS);
  const ms = Number.isFinite(raw) && raw > 0 ? raw : 180_000;
  const timeout = AbortSignal.timeout(ms);
  if (!user) return timeout;
  return AbortSignal.any([user, timeout]);
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "TimeoutError" ||
      err.name === "AbortError" ||
      /aborted|timeout/i.test(err.message))
  );
}

/**
 * Provider-neutral OpenAI-compatible chat endpoint.
 *
 * OpenClaw remains the default for the hosted deployment, but open-source
 * users can point the app at any compatible gateway without changing code.
 */
export async function runConfiguredAi(
  messages: ChatMessage[],
  opts?: { sessionKey?: string; signal?: AbortSignal; fast?: boolean },
): Promise<RuntimeResult> {
  const config = resolveAiConfig({ fast: opts?.fast });
  const { endpoint, apiKey, model, backendModel } = config;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(opts?.sessionKey
          ? { "x-openclaw-session-key": opts.sessionKey }
          : {}),
        ...(backendModel ? { "x-openclaw-model": backendModel } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        user: opts?.sessionKey ? `tt:${opts.sessionKey}` : undefined,
      }),
      signal: aiAbortSignal(opts?.signal),
    });
  } catch (err) {
    if (isAbortError(err)) {
      throw new Error("Timed out waiting for the AI runtime.");
    }
    throw err;
  }
  if (!response.ok) {
    const body = await response.text();
    throw new AiHttpError(response.status, body);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI provider returned empty content");
  return { text, runtime: "openclaw" };
}

export function resolveAiConfig(opts?: { fast?: boolean }): {
  endpoint: string;
  apiKey: string;
  model: string;
  backendModel?: string;
} {
  const baseUrl =
    process.env.AI_BASE_URL?.trim() ||
    process.env.OPENCLAW_BASE_URL?.trim() ||
    "http://127.0.0.1:18789/v1";
  const parsed = assertSafeInternalBaseUrl(baseUrl.replace(/\/$/, ""));
  const endpoint = `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}/chat/completions`;
  const apiKey =
    process.env.AI_API_KEY?.trim() || process.env.OPENCLAW_GATEWAY_TOKEN?.trim();
  if (!apiKey) throw new Error("AI_API_KEY or OPENCLAW_GATEWAY_TOKEN is not set");
  const primary =
    process.env.AI_MODEL?.trim() ||
    process.env.OPENCLAW_MODEL?.trim() ||
    "openclaw/default";
  const fast = process.env.AI_MODEL_FAST?.trim();
  const backendModel =
    process.env.AI_BACKEND_MODEL?.trim() ||
    process.env.OPENCLAW_BACKEND_MODEL?.trim() ||
    "custom-localhost-20128/auto/pro-chat";
  return {
    endpoint,
    apiKey,
    model: opts?.fast && fast ? fast : primary,
    backendModel,
  };
}
