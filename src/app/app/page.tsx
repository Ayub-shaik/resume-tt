import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { AtsStudio } from "@/components/AtsStudio";

export default async function ResumeAppPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  return <AtsStudio />;
}
