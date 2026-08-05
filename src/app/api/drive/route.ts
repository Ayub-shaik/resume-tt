import { google } from "googleapis";
import { requireSession } from "@/lib/auth/session";
import { createResume } from "@/lib/db";
import { formatResumeDisplayName } from "@/lib/context";
import { jsonError, jsonOk, readJsonBody } from "@/lib/api";
import {
  createOAuth2Client,
  isDriveOAuthConfigured,
} from "@/lib/drive/oauth";
import {
  deleteUserDriveToken,
  getUserDriveToken,
} from "@/lib/drive/store";
import { extractResumeText } from "@/lib/resume/extract";
import { z } from "zod";

export const runtime = "nodejs";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const IMPORTABLE = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.google-apps.document",
]);

function driveForUser(userId: string) {
  const row = getUserDriveToken(userId);
  if (!row) return null;
  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({ refresh_token: row.refreshToken });
  return {
    drive: google.drive({ version: "v3", auth: oauth2 }),
    oauth2,
    meta: row,
  };
}

async function folderBreadcrumbs(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
) {
  const crumbs: Array<{ id: string; name: string }> = [];
  let current: string | null = folderId === "root" ? null : folderId;
  // Cap walks so a weird tree can't hang the request
  for (let i = 0; i < 12 && current && current !== "root"; i += 1) {
    const meta = await drive.files.get({
      fileId: current,
      fields: "id,name,parents",
    });
    crumbs.unshift({
      id: String(meta.data.id),
      name: String(meta.data.name || "Folder"),
    });
    current = meta.data.parents?.[0] || null;
  }
  return [{ id: "root", name: "My Drive" }, ...crumbs];
}

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  if (!isDriveOAuthConfigured()) {
    return jsonOk({
      oauthConfigured: false,
      connected: false,
      message:
        "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, enable Drive API, add redirect /api/drive/callback.",
    });
  }

  const client = driveForUser(session.user.id);
  if (!client) {
    return jsonOk({
      oauthConfigured: true,
      connected: false,
      connectUrl: "/api/drive/connect",
    });
  }

  const url = new URL(req.url);
  const folderId = url.searchParams.get("folderId");

  // Status-only when not browsing a folder
  if (!folderId) {
    return jsonOk({
      oauthConfigured: true,
      connected: true,
      googleEmail: client.meta.googleEmail,
    });
  }

  const parent = folderId === "root" ? "root" : folderId;
  try {
    const q = `'${parent.replace(/'/g, "\\'")}' in parents and trashed=false`;
    const res = await client.drive.files.list({
      q,
      pageSize: 100,
      fields: "files(id,name,mimeType,modifiedTime)",
      orderBy: "folder,name_natural",
    });

    const items = (res.data.files || [])
      .filter((f) => {
        const mime = f.mimeType || "";
        return mime === FOLDER_MIME || IMPORTABLE.has(mime);
      })
      .map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        kind: f.mimeType === FOLDER_MIME ? ("folder" as const) : ("file" as const),
      }));

    const breadcrumbs = await folderBreadcrumbs(client.drive, parent);

    return jsonOk({
      oauthConfigured: true,
      connected: true,
      googleEmail: client.meta.googleEmail,
      folderId: parent,
      breadcrumbs,
      items,
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 502);
  }
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const client = driveForUser(session.user.id);
  if (!client) {
    return jsonError(
      "Connect your Google Drive first (Connect Drive in the resume panel).",
      503,
    );
  }

  const body = await readJsonBody<unknown>(req);
  if (!body.ok) return jsonError(body.error, 400);
  const parsed = z.object({ fileId: z.string().min(1) }).safeParse(body.data);
  if (!parsed.success) return jsonError("fileId required", 400);

  const meta = await client.drive.files.get({
    fileId: parsed.data.fileId,
    fields: "id,name,mimeType",
  });
  const mime = meta.data.mimeType || "";

  // Google Docs → export as plain text
  if (mime === "application/vnd.google-apps.document") {
    const exported = await client.drive.files.export(
      { fileId: parsed.data.fileId, mimeType: "text/plain" },
      { responseType: "arraybuffer" },
    );
    const text = Buffer.from(exported.data as ArrayBuffer).toString("utf8").trim();
    if (!text) return jsonError("Google Doc was empty", 400);
    const resume = createResume(
      formatResumeDisplayName(meta.data.name || "Drive resume"),
      text,
      session.user.id,
    );
    return jsonOk({ resume });
  }

  const downloaded = await client.drive.files.get(
    { fileId: parsed.data.fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  const buf = Buffer.from(downloaded.data as ArrayBuffer);
  let text: string;
  try {
    text = await extractResumeText(
      buf,
      meta.data.name || "drive-file",
      meta.data.mimeType,
    );
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 400);
  }

  const resume = createResume(
    formatResumeDisplayName(meta.data.name || "Drive resume"),
    text,
    session.user.id,
  );
  return jsonOk({ resume });
}

export async function DELETE() {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  deleteUserDriveToken(session.user.id);
  return jsonOk({ connected: false });
}
