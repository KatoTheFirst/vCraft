import { z } from "zod";
import { db } from "@/lib/db";
import { Problem } from "@/lib/endpoint";
import { authorize } from "@/lib/policy";
import { currentUser } from "./auth";
import { assertOwnMedia } from "./attachments";
export async function workshopId(approved = false) {
  const user = authorize(await currentUser(), "ARTISAN", approved);
  return user.profile!.id;
}
export function ownProfile(id: string) {
  return db.artisanProfile.findUniqueOrThrow({
    where: { id },
    select: {
      slug: true,
      name: true,
      story: true,
      familyHistory: true,
      latitude: true,
      longitude: true,
      isOpen: true,
      images: true,
      certificates: true,
      approval: true,
      version: true,
    },
  });
}
const photo = z.string().max(512);
const profile = z
  .object({
    name: z.string().trim().min(2).max(120),
    story: z.string().trim().max(5000),
    familyHistory: z.string().trim().max(5000),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    isOpen: z.boolean(),
    images: z.array(photo).max(24),
    certificates: z.array(photo).max(24),
    version: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (p) => (p.latitude === null) === (p.longitude === null),
    "Vui lòng nhập đủ hai tọa độ.",
  );
export async function saveProfile(id: string, raw: unknown) {
  const { version, ...data } = profile.parse(raw);
  const previous = await ownProfile(id);
  for (const [field, purpose] of [
    ["images", "workshop"],
    ["certificates", "certificate"],
  ] as const) {
    await assertOwnMedia(
      db,
      id,
      purpose,
      data[field].filter((url) => !previous[field].includes(url)),
    );
  }
  const result = await db.artisanProfile.updateMany({
    where: { id, version, approval: { in: ["PENDING", "APPROVED"] } },
    data: { ...data, version: { increment: 1 } },
  });
  if (!result.count)
    throw new Problem(409, "Hồ sơ đã thay đổi. Vui lòng tải lại trang.");
  return ownProfile(id);
}
