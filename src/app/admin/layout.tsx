import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "./guard";
// Shared admin navigation. 7.2 (tin tức) and B.4 (thống kê) add their links here.
// The check here runs before loading.tsx streams, so outsiders get a real 307.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin">
      <nav aria-label="Quản trị" className="admin-nav">
        <strong>Ban quản lý</strong>
        <Link href="/admin/workshops">Kiểm duyệt hộ gia đình</Link>
      </nav>
      {children}
    </div>
  );
}
