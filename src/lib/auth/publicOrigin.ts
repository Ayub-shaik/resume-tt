/**
 * Public site origin for redirects behind reverse proxies.
 * Next `req.url` often reports localhost:PORT — never use that for OAuth callbacks.
 */
export function publicAppOrigin(req?: Request): string {
  const fromEnv =
    process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* fall through */
    }
  }
  if (req) {
    const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const proto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    if (host && !/^localhost(?::\d+)?$/i.test(host) && host !== "127.0.0.1") {
      return `${proto}://${host}`;
    }
  }
  return "http://127.0.0.1:3060";
}
