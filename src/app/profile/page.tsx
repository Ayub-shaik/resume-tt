import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { ProfileClient } from "@/components/ProfileClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  return <ProfileClient />;
}
