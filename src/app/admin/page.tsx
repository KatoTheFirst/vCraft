import { redirect } from "next/navigation";
import { requireAdmin } from "./guard";
export default async function AdminHome() {
  await requireAdmin();
  redirect("/admin/workshops");
}
