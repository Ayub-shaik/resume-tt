import { requireAdmin } from "@/lib/auth/session";
import {
  addAllowlistEmail,
  listAllowlist,
  removeAllowlistEmail,
} from "@/lib/auth/store";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Admin only", 403);
  return jsonOk({ allowlist: listAllowlist() });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Admin only", 403);
  const body = await readJsonBody<unknown>(req);
  if (!body.ok) return jsonError(body.error, 400);
  const parsed = z
    .object({ email: z.string().email() })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("Valid email required", 400);
  const allowlist = addAllowlistEmail(parsed.data.email, admin.user.email);
  return jsonOk({ allowlist });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return jsonError("Admin only", 403);
  const body = await readJsonBody<unknown>(req);
  if (!body.ok) return jsonError(body.error, 400);
  const parsed = z
    .object({ email: z.string().email() })
    .safeParse(body.data);
  if (!parsed.success) return jsonError("Valid email required", 400);
  if (parsed.data.email.toLowerCase() === "ayubshaik642@gmail.com") {
    return jsonError("Cannot remove the primary admin", 400);
  }
  const allowlist = removeAllowlistEmail(parsed.data.email);
  return jsonOk({ allowlist });
}
