import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
  "Strict-Transport-Security": "max-age=31536000",
};

function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function csp(isDev: boolean, allowSelfFrame: boolean, nonce: string): string {
  // Nonce only (no 'unsafe-inline' for scripts); style-src keeps it for Next/Tailwind style attributes.
  const script = `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`;
  return [
    "default-src 'self'",
    script,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    // AS-IS PDF preview may iframe same-origin /api/drive/raw (prefer blob: URLs client-side).
    allowSelfFrame ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
    "frame-src 'self' blob:",
  ].join("; ");
}

export function middleware(req: NextRequest) {
  const nonce = newNonce();
  const isDev = process.env.NODE_ENV !== "production";
  const path = req.nextUrl.pathname;
  const allowSelfFrame = path === "/api/drive/raw";
  const policy = csp(isDev, allowSelfFrame, nonce);
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-nonce", nonce);
  reqHeaders.set("Content-Security-Policy", policy);
  const res = NextResponse.next({ request: { headers: reqHeaders } });

  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (allowSelfFrame && k === "X-Frame-Options") continue;
    res.headers.set(k, v);
  }
  if (allowSelfFrame) {
    // Explicit SAMEORIGIN so Chromium will embed the PDF stream in our preview iframe.
    res.headers.set("X-Frame-Options", "SAMEORIGIN");
  }
  res.headers.set("Content-Security-Policy", policy);

  if (req.nextUrl.pathname.startsWith("/api/")) {
    const method = req.method.toUpperCase();
    if (!["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"].includes(method)) {
      return new NextResponse("Method Not Allowed", { status: 405 });
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
