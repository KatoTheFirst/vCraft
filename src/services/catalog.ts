import { db } from "@/lib/db";
import { VillageRepository } from "@/repositories/villages";
export const villages = new VillageRepository(db);
// Both the public page and API must use the same visibility rule.
const visible = {
  approval: "APPROVED" as const,
  user: { role: "ARTISAN" as const },
};
export function publicArtisan(slug: string) {
  return db.artisanProfile.findFirst({
    where: { slug, ...visible },
    select: {
      slug: true,
      name: true,
      story: true,
      isOpen: true,
      village: { select: { name: true } },
    },
  });
}
export function publicBatch(code: string) {
  return db.productionBatch.findFirst({
    where: { code, product: { published: true, artisan: visible } },
    select: {
      code: true,
      quantity: true,
      product: { select: { name: true } },
      logs: {
        select: { title: true, occurredAt: true, images: true },
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      },
    },
  });
}
