import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import {
  ensureAllowlistSeeded,
  getUserByEmail,
  isEmailAllowed,
  upsertUserFromGoogle,
  verifyUserPassword,
} from "@/lib/auth/store";
import { resolveAuthSecret } from "@/lib/auth/secret";
import { clearFailures, clientFingerprint, clientKey, failedDelayMs, rateLimit, recordFailure } from "@/lib/security/rateLimit";

const ADMIN_EMAIL = "ayubshaik642@gmail.com";

ensureAllowlistSeeded(ADMIN_EMAIL);

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Force account picker (avoids silent default-account login)
          prompt: "select_account",
        },
      },
    }),
  );
}

// Password login for allowlisted emails (set AUTH_ADMIN_PASSWORD for admin)
if (process.env.AUTH_DEV_LOGIN === "1" || !process.env.GOOGLE_CLIENT_ID) {
  providers.push(
    Credentials({
      id: "allowlist-dev",
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");
        // Rate limit before any password hashing: per client IP, per TLS/header fingerprint, and
        // progressive delay + temporary stop per (account, client). No global account lockout.
        const req = request as Request;
        if (!rateLimit({ key: clientKey(req, "auth:web:password"), limit: 20, windowMs: 60_000 }).ok) return null;
        if (!rateLimit({ key: `auth:web:password:fp:${clientFingerprint(req)}`, limit: 90, windowMs: 10 * 60_000 }).ok) return null;
        const failKey = `${email}|${clientKey(req, "pw")}`;
        const gate = failedDelayMs(failKey);
        if (gate.hardStop) return null;
        if (gate.delayMs) await new Promise((r) => setTimeout(r, gate.delayMs));
        // generic failure for unknown email and wrong password alike (anti-enumeration)
        if (!email || !password || !isEmailAllowed(email) || !verifyUserPassword(email, password)) {
          if (email) recordFailure(failKey);
          return null;
        }
        clearFailures(failKey);
        const user = upsertUserFromGoogle({
          email,
          name: email === ADMIN_EMAIL ? "Admin" : email.split("@")[0] || email,
          image: null,
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: resolveAuthSecret(),
  trustHost: true,
  providers,
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (!isEmailAllowed(email)) return false;
      upsertUserFromGoogle({
        email,
        name: user.name || email,
        image: user.image || null,
      });
      return true;
    },
    async jwt({ token, user }) {
      const email = (user?.email || token.email || "").toString().toLowerCase();
      if (email) {
        token.email = email;
        const row = getUserByEmail(email);
        if (row) {
          token.uid = row.id;
          token.role = row.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = String(token.email || "");
        (session.user as { id?: string }).id = String(token.uid || "");
        (session.user as { role?: string }).role = String(token.role || "user");
      }
      return session;
    },
  },
});

export { ADMIN_EMAIL };
