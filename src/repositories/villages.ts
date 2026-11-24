import type { Prisma, PrismaClient } from "@prisma/client";
type Client = Pick<PrismaClient, "craftVillage">;
// Inject either the application client or a transaction-scoped client.
export class VillageRepository {
  constructor(private readonly client: Client) {}
  create(input: Prisma.CraftVillageCreateInput) {
    return this.client.craftVillage.create({ data: input });
  }
  find(slug: string) {
    return this.client.craftVillage.findUnique({ where: { slug } });
  }
  update(slug: string, name: string) {
    return this.client.craftVillage.update({ where: { slug }, data: { name } });
  }
  delete(slug: string) {
    return this.client.craftVillage.delete({ where: { slug } });
  }
}
