import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/services/auth";
import { destinations } from "@/lib/policy";
import { ownProfile } from "@/services/workshop";
import { WorkshopForm } from "@/components/workshop-form";
export default async function Dashboard({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { role } = await params;
  if (!["admin", "buyer", "artisan"].includes(role)) notFound();
  if (role !== user.role.toLowerCase()) redirect(destinations[user.role]);
  if (user.role === "ARTISAN") {
    if (!user.profile || user.profile.approval === "SUSPENDED")
      return <p>Tài khoản chưa có quyền quản lý xưởng.</p>;
    return <WorkshopForm profile={await ownProfile(user.profile.id)} />;
  }
  return (
    <section>
      <h1>
        {user.role === "ADMIN"
          ? "Ban quản lý làng nghề"
          : "Tài khoản khách hàng"}
      </h1>
      <p>{user.name}</p>
    </section>
  );
}
