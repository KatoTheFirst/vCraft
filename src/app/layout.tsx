import type { ReactNode } from "react";
export const metadata = { title: "vCraft · Làng gốm Bát Tràng" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
