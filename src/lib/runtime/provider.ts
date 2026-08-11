import { assertSafeInternalBaseUrl } from "@/lib/security/validate";
import type { ChatMessage, RuntimeResult } from "./types";

/** HTTP failure from an OpenAI-compatible provider — status is typed for retries. */
export class AiHttpError extends Error {
  readonly status: number;
  constructor(status: number, body: string) {
    super(`AI provider HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = "AiHttpError";
    this.status = status;
  }
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
  const { endpoint, apiKey, model } = config;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(opts?.sessionKey
        ? { "x-openclaw-session-key": opts.sessionKey }
        : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      user: opts?.sessionKey ? `tt:${opts.sessionKey}` : undefined,
    }),
    signal: opts?.signal,
  });
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
  return {
    endpoint,
    apiKey,
    model: opts?.fast && fast ? fast : primary,
  };
}
