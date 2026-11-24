import { redirect } from "next/navigation";
import { currentUser } from "@/services/auth";
import { destinations } from "@/lib/policy";
export default async function Dashboard() {
  const user = await currentUser();
  redirect(user ? destinations[user.role] : "/login");
}
