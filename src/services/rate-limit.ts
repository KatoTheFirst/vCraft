import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { Problem } from "@/lib/endpoint";
type Client = Pick<PrismaClient, "authAttempt">;
export const WINDOW_MS = 15 * 60 * 1000;
// Fixed 15-minute buckets in AuthAttempt. The key hashes "action|subject|bucket"
// (e.g. "login|<email>|<bucket>", "upload|<artisanId>|<bucket>"), unchanged
// from the original login/register limiter so existing counters stay valid.
export function attemptKey(action: string, subject: string, now = Date.now()) {
  const bucket = Math.floor(now / WINDOW_MS);
  return {
    key: createHash("sha256")
      .update([action, subject, bucket].join("|"))
      .digest("hex"),
    expiresAt: new Date((bucket + 1) * WINDOW_MS),
  };
}
export async function throttle(
  client: Client,
  action: string,
  subject: string,
  limit = 10,
  message = "Vui lòng thử lại sau 15 phút.",
) {
  const { key, expiresAt } = attemptKey(action, subject);
  await client.authAttempt.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  const attempt = await client.authAttempt.upsert({
    where: { key },
    create: { key, count: 1, expiresAt },
    update: { count: { increment: 1 } },
  });
  if (attempt.count > limit) throw new Problem(429, message);
}
