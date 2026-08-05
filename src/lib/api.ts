import { NextResponse } from "next/server";
import { LIMITS } from "@/lib/security/validate";

export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error: message, ...extra },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function readJsonBody<T>(
  req: Request,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const len = req.headers.get("content-length");
  if (len && Number(len) > LIMITS.jsonBodyBytes) {
    return { ok: false, error: "Request body too large" };
  }

  const text = await req.text();
  if (text.length > LIMITS.jsonBodyBytes) {
    return { ok: false, error: "Request body too large" };
  }
  if (!text.trim()) {
    return { ok: true, data: {} as T };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

export function logApi(
  route: string,
  meta: Record<string, unknown>,
) {
  const safe = { ...meta };
  for (const key of Object.keys(safe)) {
    if (/token|key|secret|password|authorization/i.test(key)) {
      safe[key] = "[redacted]";
    }
  }
  console.info(`[api] ${route}`, JSON.stringify(safe));
}

export function publicError(err: unknown, fallback = "Request failed"): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message;
  // Never echo secrets or huge payloads
  if (/token|api[_-]?key|bearer|authorization/i.test(msg)) {
    return fallback;
  }
  return msg.slice(0, 300) || fallback;
}
