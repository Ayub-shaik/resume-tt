import { auth, ADMIN_EMAIL } from "@/lib/auth/config";
import { getUserByEmail } from "@/lib/auth/store";

export async function requireSession() {
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
