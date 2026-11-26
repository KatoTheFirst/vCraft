import { z } from "zod";
const mediaUrl = z.string().max(512);
// Store each image once, keeping the artisan's order.
const gallery = (max: number) =>
  z
    .array(mediaUrl)
    .max(max)
    .transform((urls) => [...new Set(urls)]);
export const batchCode = z
  .string()
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
export const product = z
  .object({
    name: z.string().trim().min(2).max(120),
    category: z.string().trim().min(1).max(60),
    price: z.number().int().min(0).max(999_999_999_999),
    story: z.string().trim().max(5000),
    images: gallery(24),
    published: z.boolean(),
  })
  .strict();
export const batch = z
  .object({ quantity: z.number().int().min(1).max(1_000_000) })
  .strict();
// Logs are ordered by when the step happened, so a future time is a mistake.
const skew = 10 * 60 * 1000;
export const productionLog = z
  .object({
    occurredAt: z.iso
      .datetime({ offset: true })
      .transform((v) => new Date(v))
      .refine(
        (d) => d.getTime() <= Date.now() + skew,
        "Thời điểm công đoạn không được ở tương lai.",
      ),
    title: z.string().trim().min(2).max(120),
    images: gallery(12),
  })
  .strict();
