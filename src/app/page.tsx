import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { LandingPage } from "@/components/LandingPage";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.email) redirect("/app");
  const sp = await searchParams;
  return (
    <LandingPage
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
      error={
        sp.error
          ? "Sign-in blocked. Your Google account is not on the allowlist."
          : null
      }
    />
  );
}
