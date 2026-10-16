import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { AtsStudio } from "@/components/AtsStudio";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ResumeAppPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  return <AtsStudio />;
}
