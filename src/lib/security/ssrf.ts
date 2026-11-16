import dns from "node:dns";
import https from "node:https";
import net from "node:net";

/** True for loopback, private, link-local, CGNAT, multicast, reserved and mapped-private addresses. */
export function isBlockedIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0)
    );
  }
  if (v === 6) {
    const x = ip.toLowerCase();
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedIp(mapped[1]!);
    return (
      x === "::" || x === "::1" || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") ||
      x.startsWith("feb") || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("ff") || x.startsWith("::ffff:")
    );
  }
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return h === "localhost" || h.endsWith(".localhost") || h === "internal" || h.endsWith(".internal") || h.endsWith(".local");
}

/** Resolve a hostname once and return a safe IP to connect to (throws if any answer is private). */
export async function resolvePublicIp(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isBlockedHostname(host)) throw new Error("That URL host is not allowed");
  const answers = net.isIP(host)
    ? [{ address: host, family: net.isIP(host) }]
    : await dns.promises.lookup(host, { all: true });
  if (!answers.length || answers.some((a) => isBlockedIp(a.address))) {
    throw new Error("That URL host is not allowed");
  }
  return { address: answers[0]!.address, family: answers[0]!.family as 4 | 6 };
}

export type PinnedResponse = { status: number; location: string | null; contentType: string; body: string; truncated: boolean };

/** HTTPS-only GET with the socket pinned to the IP validated for this hop. Redirects are NOT followed. */
export async function pinnedGet(
  url: string,
  opts: { headers?: Record<string, string>; signal?: AbortSignal; maxBytes: number },
): Promise<PinnedResponse> {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new Error("Only https URLs are allowed");
  const pinned = await resolvePublicIp(u.hostname);
  return new Promise((resolve, reject) => {
    const req = https.request(
      u,
      {
        method: "GET",
        headers: opts.headers,
        signal: opts.signal,
        lookup: (_h, _o, cb) => (cb as (e: null, a: string, f: number) => void)(null, pinned.address, pinned.family),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let n = 0;
        let truncated = false;
        res.on("data", (c: Buffer) => {
          n += c.length;
          if (n <= opts.maxBytes) chunks.push(c);
          else { truncated = true; res.destroy(); }
        });
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          resolve({
            status: res.statusCode || 0,
            location: (res.headers.location as string | undefined) ?? null,
            contentType: String(res.headers["content-type"] || "").toLowerCase(),
            body: Buffer.concat(chunks).toString("utf8"),
            truncated,
          });
        };
        res.on("end", done);
        res.on("close", done);
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.end();
  });
}
