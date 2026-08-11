import { requireSession } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/api";
import { getRecoveryJob } from "@/lib/recovery/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await context.params;
  const job = getRecoveryJob(session.user.id, id);
  if (!job) return jsonError("Recovery job not found", 404);
  return jsonOk({ job });
}
