import { requireSession } from "@/lib/auth/session";
import { deleteUserById } from "@/lib/auth/store";
import { deleteAllUserOwnedData } from "@/lib/db";
import { deleteUserDriveToken } from "@/lib/drive/store";
import { jsonError, jsonOk } from "@/lib/api";

export const runtime = "nodejs";

/**
 * DELETE /api/account — erase the signed-in user's product data and account row.
 * Body optional: { "confirm": "DELETE" } required.
 */
export async function DELETE(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  let confirm = "";
  try {
    const body = (await req.json()) as { confirm?: string };
    confirm = String(body?.confirm || "");
  } catch {
    return jsonError('Send JSON body {"confirm":"DELETE"}', 400);
  }
  if (confirm !== "DELETE") {
    return jsonError('Confirmation required: {"confirm":"DELETE"}', 400);
  }

  const deleted = deleteAllUserOwnedData(ctx.user.id);
  try {
    deleteUserDriveToken(ctx.user.id);
  } catch {
    // Drive table may be empty
  }
  deleteUserById(ctx.user.id, ctx.user.email);

  return jsonOk({
    ok: true,
    deleted,
    message: "Account and stored data erased. Sign out on all devices.",
  });
}
