/**
 * Auth signing secret. Dev may fall back; production must set AUTH_SECRET
 * (or NEXTAUTH_SECRET) explicitly.
 */
export function resolveAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET or NEXTAUTH_SECRET must be set in production (fail-closed)",
    );
  }
  return "mpi-dev-secret-change-me";
}
