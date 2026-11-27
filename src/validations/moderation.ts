import { z } from "zod";
import type { Approval } from "@prisma/client";
// The only moves an admin may make. Anything else answers 409.
export const transitions: Record<Approval, Approval[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED"],
  SUSPENDED: ["APPROVED"],
  REJECTED: [],
};
export const approvals = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;
export const review = z
  .object({
    approval: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
    version: z.number().int().nonnegative(),
    reviewNote: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (r) => r.approval === "APPROVED" || (r.reviewNote?.length ?? 0) >= 5,
    {
      message: "Từ chối hoặc khóa cần ghi lý do (ít nhất 5 ký tự).",
      path: ["reviewNote"],
    },
  );
export const listQuery = z.object({
  status: z.enum(approvals).catch("PENDING"),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
});
