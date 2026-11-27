import { redirect } from "next/navigation";
import { currentUser } from "@/services/auth";
import { destinations } from "@/lib/policy";
// Every admin page calls this itself; a layout check alone is not enough.
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect(destinations[user.role]);
  return user;
}
