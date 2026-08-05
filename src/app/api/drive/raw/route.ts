import { google } from "googleapis";
import { requireSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";
import { createOAuth2Client, isDriveOAuthConfigured } from "@/lib/drive/oauth";
import { getUserDriveToken } from "@/lib/drive/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stream original Drive file bytes for AS-IS preview (PDF etc.). */
export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isDriveOAuthConfigured()) return jsonError("Drive OAuth not configured", 503);

  const fileId = new URL(req.url).searchParams.get("fileId")?.trim();
  if (!fileId) return jsonError("fileId required", 400);

  const row = getUserDriveToken(session.user.id);
  if (!row) return jsonError("Connect Google Drive first", 503);

  try {
    const oauth2 = createOAuth2Client();
    oauth2.setCredentials({ refresh_token: row.refreshToken });
    const drive = google.drive({ version: "v3", auth: oauth2 });

    const meta = await drive.files.get({
      fileId,
      fields: "id,name,mimeType",
    });
    const mime = meta.data.mimeType || "application/octet-stream";
    const name = meta.data.name || "file";

    if (mime === "application/vnd.google-apps.document") {
      const exported = await drive.files.export(
        { fileId, mimeType: "application/pdf" },
        { responseType: "arraybuffer" },
      );
      const buf = Buffer.from(exported.data as ArrayBuffer);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${name}.pdf"`,
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    const downloaded = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );
    const buf = Buffer.from(downloaded.data as ArrayBuffer);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 502);
  }
}
