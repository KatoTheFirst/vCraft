import type { Prisma, PrismaClient } from "@prisma/client";
import { logOrder } from "./production";
type Client = Pick<PrismaClient, "product" | "productionBatch">;
// Public pages and the API must use the same visibility rule.
export const visible = {
  approval: "APPROVED" as const,
  user: { role: "ARTISAN" as const },
} satisfies Prisma.ArtisanProfileWhereInput;
export const publicProductWhere = {
  published: true,
  artisan: visible,
} satisfies Prisma.ProductWhereInput;
const logs = {
  orderBy: logOrder,
  select: { title: true, occurredAt: true, images: true },
} satisfies Prisma.ProductionBatch$logsArgs;
const workshop = {
  select: { slug: true, name: true, village: { select: { name: true } } },
} satisfies Prisma.ArtisanProfileDefaultArgs;
export async function publicProduct(client: Client, id: string) {
  const product = await client.product.findFirst({
    where: { id, ...publicProductWhere },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      story: true,
      images: true,
      artisan: workshop,
      batches: {
        orderBy: { createdAt: "desc" },
        // shortcut: newest 20 batches on the page, paginate if a product needs more.
        take: 20,
        select: { code: true, quantity: true, logs },
      },
    },
  });
  return product && { ...product, price: product.price.toNumber() };
}
// Read model for /trace/{code} and GET /api/v1/batches/{code}.
export function traceBatch(client: Client, code: string) {
  return client.productionBatch.findFirst({
    where: { code, product: publicProductWhere },
    select: {
      code: true,
      quantity: true,
      qrIssuedAt: true,
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          story: true,
          images: true,
          artisan: workshop,
        },
      },
      logs,
    },
  });
}
