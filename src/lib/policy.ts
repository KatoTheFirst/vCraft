import type { Approval, Role } from "@prisma/client";
import { Problem } from "./endpoint";
export const destinations = {
  ADMIN: "/dashboard/admin",
  ARTISAN: "/dashboard/artisan",
  BUYER: "/dashboard/buyer",
} satisfies Record<Role, string>;
export function authorize<
  T extends { role: Role; profile: { approval: Approval } | null },
>(user: T | null, role: Role, approved = false): T {
  if (!user) throw new Problem(401, "Vui lòng đăng nhập.");
  if (
    user.role !== role ||
    (role === "ARTISAN" &&
      (!user.profile ||
        (["SUSPENDED", "REJECTED"] as string[]).includes(
          user.profile.approval,
        ) ||
        (approved && user.profile.approval !== "APPROVED")))
  )
    throw new Problem(403, "Tài khoản chưa được phép thực hiện thao tác này.");
  return user;
}
