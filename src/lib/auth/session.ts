import { auth, ADMIN_EMAIL } from "@/lib/auth/config";
import { verifyMobileToken } from "@/lib/auth/mobileToken";
import { getUserByEmail } from "@/lib/auth/store";
import { headers } from "next/headers";

async function sessionFromBearer() {
  const h = await headers();
  const authz = h.get("authorization") || h.get("Authorization");
  if (!authz?.toLowerCase().startsWith("bearer ")) return null;
  const token = authz.slice(7).trim();
  if (!token) return null;
  const payload = verifyMobileToken(token);
  if (!payload) return null;
  const user = getUserByEmail(payload.email);
  if (!user) return null;
  return {
    session: {
      user: {
        email: user.email,
        id: user.id,
        role: user.role,
        name: user.name,
        image: user.image,
      },
    },
    user,
  };
}

export async function requireSession() {
  const bearer = await sessionFromBearer();
  if (bearer) return bearer;

  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  const user = getUserByEmail(email);
  if (!user) return null;
  return { session, user };
}

export async function requireAdmin() {
  const ctx = await requireSession();
  if (!ctx) return null;
  if (ctx.user.role !== "admin" && ctx.user.email !== ADMIN_EMAIL) return null;
  return ctx;
}
