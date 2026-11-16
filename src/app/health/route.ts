export const dynamic = "force-dynamic";

/** Liveness only: no version, runtime, or config details. */
export function GET() {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
