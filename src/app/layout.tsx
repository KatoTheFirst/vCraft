import type { ReactNode } from "react";
import Link from "next/link";
import { currentUser } from "@/services/auth";
import { Logout } from "@/components/logout";
import { destinations } from "@/lib/policy";
import "./base.css";
export const metadata = { title: "vCraft · Làng gốm Bát Tràng" };
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await currentUser();
  return (
    <html lang="vi">
      <body>
        <nav aria-label="Điều hướng chính">
          <Link href="/">vCraft · Bát Tràng</Link>
          {user ? (
            <>
              <Link href={destinations[user.role]}>
                {user.role === "ARTISAN"
                  ? "Hồ sơ xưởng"
                  : user.role === "ADMIN"
                    ? "Ban quản lý"
                    : "Tài khoản"}
              </Link>
              <Logout />
            </>
          ) : (
            <>
              <Link href="/login">Đăng nhập</Link>
              <Link href="/register">Đăng ký</Link>
            </>
          )}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
