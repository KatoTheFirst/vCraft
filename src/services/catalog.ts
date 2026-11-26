import { db } from "@/lib/db";
import { VillageRepository } from "@/repositories/villages";
import { traceBatch, visible } from "./visibility";
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
export const publicBatch = (code: string) => traceBatch(db, code);
