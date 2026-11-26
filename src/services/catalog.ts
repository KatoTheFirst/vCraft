import { db } from "@/lib/db";
import { VillageRepository } from "@/repositories/villages";
import { visible } from "./visibility";
export const villages = new VillageRepository(db);
export function publicArtisan(slug: string) {
  return db.artisanProfile.findFirst({
    where: { slug, ...visible },
    select: {
      slug: true,
      name: true,
      story: true,
      familyHistory: true,
      latitude: true,
      longitude: true,
      images: true,
      certificates: true,
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
