import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/services/auth";
import { destinations } from "@/lib/policy";
import { ownProfile } from "@/services/workshop";
import { WorkshopForm } from "@/components/workshop-form";
import { ProductManager } from "@/components/product-manager";
import { ownProducts } from "@/services/production";
import { db } from "@/lib/db";
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
    if (
      !user.profile ||
      (["SUSPENDED", "REJECTED"] as string[]).includes(user.profile.approval)
    )
      return <p>Tài khoản chưa có quyền quản lý xưởng.</p>;
    return (
      <>
        {user.profile.approval === "APPROVED" && (
          <Link href="/dashboard/quotes">Yêu cầu báo giá gửi tới xưởng</Link>
        )}
        <WorkshopForm profile={await ownProfile(user.profile.id)} />
        {user.profile.approval === "APPROVED" ? (
          <ProductManager products={await ownProducts(db, user.profile.id)} />
        ) : (
          <p>Đăng sản phẩm và nhật ký sản xuất mở sau khi xưởng được duyệt.</p>
        )}
      </>
    );
  }
  return (
    <section>
      <h1>
        {user.role === "ADMIN"
          ? "Ban quản lý làng nghề"
          : "Tài khoản khách hàng"}
      </h1>
      <p>{user.name}</p>
      {user.role === "BUYER" && (
        <Link href="/dashboard/quotes">Quản lý yêu cầu báo giá</Link>
      )}
      {user.role === "ADMIN" && (
        <Link href="/admin/workshops">Kiểm duyệt hộ gia đình</Link>
      )}
    </section>
  );
}
