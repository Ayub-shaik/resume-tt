import { google } from "googleapis";

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "openid",
  "email",
];

export function driveRedirectUri() {
  const base = (
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://127.0.0.1:3456"
  ).replace(/\/$/, "");
  return `${base}/api/drive/callback`;
}

export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set");
  }
  return new google.auth.OAuth2(clientId, clientSecret, driveRedirectUri());
}

export function isDriveOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}
