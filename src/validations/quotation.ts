import { z } from "zod";
const count = z.number().int().positive().max(2147483647);
const date = z.iso.datetime({ offset: true }).transform((v) => new Date(v));
export const draft = z
  .object({
    category: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(5000),
    quantity: count,
    budget: z.number().int().positive().safe().nullable(),
    deadline: date,
  })
  .strict();
const version = z.number().int().nonnegative();
export const command = z.discriminatedUnion("action", [
  draft.extend({ action: z.literal("edit"), version }),
  z.object({ action: z.literal("send"), version }).strict(),
  z
    .object({
      action: z.literal("bid"),
      unitPrice: z.number().int().positive().max(99999999999999),
      quantity: count,
      completionDate: date,
      version,
    })
    .strict(),
  z
    .object({
      action: z.literal("accept"),
      bidId: z.string().min(1).max(160),
      version,
    })
    .strict(),
  z.object({ action: z.enum(["start", "deliver"]), version }).strict(),
]);
export const pageNumber = z.coerce.number().int().min(1).max(1000000);
