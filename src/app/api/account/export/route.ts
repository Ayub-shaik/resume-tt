import { requireSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/auth/store";
import { exportAllUserOwnedData } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { buildZipStore } from "@/lib/security/zipStore";
import { getUserDriveToken } from "@/lib/drive/store";

export const runtime = "nodejs";

/**
 * GET /api/account/export — download a ZIP of the signed-in user's product data.
 * Secrets (password hashes, Drive refresh tokens) are omitted.
 */
export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return jsonError("Unauthorized", 401);

  const user = getUserById(ctx.user.id);
  const data = exportAllUserOwnedData(ctx.user.id);
  let drive: { connected: boolean; googleEmail: string | null } = {
    connected: false,
    googleEmail: null,
  };
  try {
    const tok = getUserDriveToken(ctx.user.id);
    if (tok) {
      drive = { connected: true, googleEmail: tok.googleEmail };
    }
  } catch {
    // Drive table may be absent on fresh DBs
  }

  const exportedAt = new Date().toISOString();
  const zip = buildZipStore([
    {
      name: "manifest.json",
      body: JSON.stringify(
        {
          app: "resume-tt",
          schemaVersion: 1,
          exportedAt,
          note: "Password hashes and OAuth refresh tokens are not included.",
        },
        null,
        2,
      ),
    },
    {
      name: "account.json",
      body: JSON.stringify(
        {
          user: user
            ? {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                createdAt: user.createdAt,
              }
            : { id: ctx.user.id, email: ctx.user.email },
          drive,
        },
        null,
        2,
      ),
    },
    {
      name: "data.json",
      body: JSON.stringify(data, null, 2),
    },
  ]);

  return new Response(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition":
        'attachment; filename="tomorrowtools-resume-export.zip"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
