import type { Approval } from "@prisma/client";
// Plain module: used by both the admin server pages and the client table.
export const statusLabel: Record<Approval, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  SUSPENDED: "Đã khóa",
};
export const dateVN = (d: Date | string | null) =>
  d
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(new Date(d))
    : "—";
