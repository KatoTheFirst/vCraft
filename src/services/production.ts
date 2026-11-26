import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { Problem } from "@/lib/endpoint";
import * as rules from "@/validations/production";
import { assertOwnMedia } from "./attachments";
// Route handlers pass the shared client; tests pass a stub.
type Client = Pick<
  PrismaClient,
  "$transaction" | "product" | "productionBatch"
>;
type Tx = Prisma.TransactionClient;
// The timeline order: when each step happened, ties by insertion id.
export const logOrder: Prisma.ProductionLogOrderByWithRelationInput[] = [
  { occurredAt: "asc" },
  { id: "asc" },
];
const productFields = {
  id: true,
  name: true,
  category: true,
  price: true,
  story: true,
  images: true,
  published: true,
} satisfies Prisma.ProductSelect;
const logFields = {
  id: true,
  occurredAt: true,
  title: true,
  images: true,
} satisfies Prisma.ProductionLogSelect;
const batchFields = {
  code: true,
  quantity: true,
  qrIssuedAt: true,
} satisfies Prisma.ProductionBatchSelect;
const missing = () => new Problem(404, "Không tìm thấy dữ liệu.");
// Decimal is not a plain value; VND prices fit safely in a JS number.
const plain = <T extends { price: Prisma.Decimal }>(p: T) => ({
  ...p,
  price: p.price.toNumber(),
});
export const newBatchCode = () =>
  "BT-" + randomBytes(5).toString("hex").toUpperCase();
// Ownership is checked inside the write transaction. Another workshop's
// record looks the same as a missing one.
async function ownedProduct(tx: Tx, artisanId: string, id: string) {
  const found = await tx.product.findFirst({
    where: { id, artisanId },
    select: { id: true },
  });
  if (!found) throw missing();
  return found;
}
async function ownedBatch(tx: Tx, artisanId: string, code: string) {
  const found = await tx.productionBatch.findFirst({
    where: { code, product: { artisanId } },
    select: { id: true, qrIssuedAt: true },
  });
  if (!found) throw missing();
  return found;
}
export function ownProducts(client: Client, artisanId: string) {
  return client.product
    .findMany({
      where: { artisanId },
      orderBy: { createdAt: "desc" },
      // shortcut: one page of 100 products, add pagination when a workshop exceeds it.
      take: 100,
      select: {
        ...productFields,
        batches: {
          orderBy: { createdAt: "desc" },
          select: {
            ...batchFields,
            logs: { orderBy: logOrder, select: logFields },
          },
        },
      },
    })
    .then((list) => list.map(plain));
}
export async function createProduct(
  client: Client,
  artisanId: string,
  raw: unknown,
) {
  const data = rules.product.parse(raw);
  return client.$transaction(async (tx) => {
    await assertOwnMedia(tx, artisanId, "product", data.images);
    return plain(
      await tx.product.create({
        data: { ...data, artisanId },
        select: productFields,
      }),
    );
  });
}
export async function updateProduct(
  client: Client,
  artisanId: string,
  id: string,
  raw: unknown,
) {
  const data = rules.product.parse(raw);
  return client.$transaction(async (tx) => {
    await ownedProduct(tx, artisanId, id);
    await assertOwnMedia(tx, artisanId, "product", data.images);
    return plain(
      await tx.product.update({ where: { id }, data, select: productFields }),
    );
  });
}
// Creating a batch issues its QR code, so qrIssuedAt is set immediately.
export async function createBatch(
  client: Client,
  artisanId: string,
  productId: string,
  raw: unknown,
) {
  const { quantity } = rules.batch.parse(raw);
  try {
    return await client.$transaction(async (tx) => {
      await ownedProduct(tx, artisanId, productId);
      return tx.productionBatch.create({
        data: {
          productId,
          quantity,
          code: newBatchCode(),
          qrIssuedAt: new Date(),
        },
        select: batchFields,
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new Problem(409, "Mã lô bị trùng. Vui lòng thử lại.");
    throw e;
  }
}
export async function addLog(
  client: Client,
  artisanId: string,
  code: string,
  raw: unknown,
) {
  const data = rules.productionLog.parse(raw);
  return client.$transaction(async (tx) => {
    const batch = await ownedBatch(tx, artisanId, code);
    await assertOwnMedia(tx, artisanId, "production-log", data.images);
    return tx.productionLog.create({
      data: { ...data, batchId: batch.id },
      select: logFields,
    });
  });
}
export async function updateLog(
  client: Client,
  artisanId: string,
  code: string,
  id: string,
  raw: unknown,
) {
  const data = rules.productionLog.parse(raw);
  return client.$transaction(async (tx) => {
    const batch = await ownedBatch(tx, artisanId, code);
    const log = await tx.productionLog.findFirst({
      where: { id, batchId: batch.id },
      select: { id: true },
    });
    if (!log) throw missing();
    await assertOwnMedia(tx, artisanId, "production-log", data.images);
    return tx.productionLog.update({
      where: { id },
      data,
      select: logFields,
    });
  });
}
// Idempotent: the first issue time is kept.
export async function issueQr(client: Client, artisanId: string, code: string) {
  return client.$transaction(async (tx) => {
    const batch = await ownedBatch(tx, artisanId, code);
    if (batch.qrIssuedAt) return batch.qrIssuedAt;
    await tx.productionBatch.updateMany({
      where: { id: batch.id, qrIssuedAt: null },
      data: { qrIssuedAt: new Date() },
    });
    return (await ownedBatch(tx, artisanId, code)).qrIssuedAt!;
  });
}
// QR images are only handed out to the owner, and only once issued.
export async function issuedBatch(
  client: Client,
  artisanId: string,
  code: string,
) {
  const batch = await client.productionBatch.findFirst({
    where: { code, product: { artisanId } },
    select: { qrIssuedAt: true },
  });
  if (!batch) throw missing();
  if (!batch.qrIssuedAt) throw new Problem(409, "Lô chưa phát hành mã QR.");
}
