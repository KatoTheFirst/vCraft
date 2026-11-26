import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { Problem } from "../src/lib/endpoint";
import * as rules from "../src/validations/production";
import {
  addLog,
  createBatch,
  createProduct,
  logOrder,
  newBatchCode,
  updateLog,
  updateProduct,
} from "../src/services/production";
import { publicProduct } from "../src/services/visibility";
type Where = Record<string, unknown>;
const ME = "artisan-me";
const asset = (id = randomUUID()) => ({ id, url: "/media/" + id + "/web" });
// In-memory stand-in for the Prisma calls the service makes.
function fakeDb(seed: {
  products?: { id: string; artisanId: string }[];
  batches?: { id: string; code: string; artisanId: string }[];
  logs?: { id: string; batchId: string }[];
  media?: { id: string; artisanId: string; purpose: string }[];
}) {
  const calls: { op: string; args: unknown }[] = [];
  const product = (w: Where) =>
    seed.products?.find((p) => p.id === w.id && p.artisanId === w.artisanId);
  const tx = {
    mediaAsset: {
      count: async ({ where }: { where: Where & { id: { in: string[] } } }) =>
        (seed.media ?? []).filter(
          (m) =>
            m.artisanId === where.artisanId &&
            m.purpose === where.purpose &&
            where.id.in.includes(m.id),
        ).length,
    },
    product: {
      findFirst: async ({ where }: { where: Where }) => product(where) ?? null,
      create: async (args: { data: Where }) => (
        calls.push({ op: "product.create", args }),
        {
          ...args.data,
          id: "new",
          price: new Prisma.Decimal(args.data.price as number),
        }
      ),
      update: async (args: { data: Where }) => (
        calls.push({ op: "product.update", args }),
        { ...args.data, price: new Prisma.Decimal(args.data.price as number) }
      ),
    },
    productionBatch: {
      findFirst: async ({
        where,
      }: {
        where: { code: string; product: Where };
      }) =>
        seed.batches?.find(
          (b) =>
            b.code === where.code && b.artisanId === where.product.artisanId,
        ) ?? null,
      create: async (args: unknown) => (
        calls.push({ op: "batch.create", args }),
        args
      ),
    },
    productionLog: {
      findFirst: async ({ where }: { where: Where }) =>
        seed.logs?.find(
          (l) => l.id === where.id && l.batchId === where.batchId,
        ) ?? null,
      create: async (args: unknown) => (
        calls.push({ op: "log.create", args }),
        args
      ),
      update: async (args: unknown) => (
        calls.push({ op: "log.update", args }),
        args
      ),
    },
  };
  let transactions = 0;
  const db = {
    $transaction: async (fn: (t: typeof tx) => unknown) => (
      transactions++,
      fn(tx)
    ),
    product: { findFirst: async () => null },
  };
  return { db: db as never, calls, transactions: () => transactions };
}
const status = (code: number) => (e: unknown) =>
  e instanceof Problem && e.code === code;
const item = {
  name: "Bình hút lộc men rạn",
  category: "Bình hoa",
  price: 450000,
  story: "Men rạn cổ",
  images: [] as string[],
  published: true,
};
const now = new Date().toISOString();
test("product input is validated and gallery duplicates removed", () => {
  const a = asset();
  assert.deepEqual(
    rules.product.parse({ ...item, images: [a.url, a.url] }).images,
    [a.url],
  );
  for (const bad of [
    { price: -1 },
    { price: 1.5 },
    { name: "x" },
    { category: "" },
    { published: "yes" },
    { images: Array.from({ length: 25 }, () => asset().url) },
    { artisanId: "someone-else" },
  ])
    assert.throws(() => rules.product.parse({ ...item, ...bad }));
});
test("log input requires an ISO time that is not in the future", () => {
  const parsed = rules.productionLog.parse({
    occurredAt: "2026-11-01T08:30:00+07:00",
    title: "Nhào đất",
    images: [],
  });
  assert.equal(parsed.occurredAt.toISOString(), "2026-11-01T01:30:00.000Z");
  const future = new Date(Date.now() + 86_400_000).toISOString();
  for (const bad of [
    { occurredAt: future },
    { occurredAt: "01/11/2026" },
    { title: "" },
    { batchId: "other" },
  ])
    assert.throws(() =>
      rules.productionLog.parse({
        occurredAt: now,
        title: "Vuốt",
        images: [],
        ...bad,
      }),
    );
  assert.throws(() => rules.batch.parse({ quantity: 0 }));
  assert.throws(() => rules.batchCode.parse("../BT-1"));
});
test("timeline is ordered by occurredAt then id", () => {
  assert.deepEqual(logOrder, [{ occurredAt: "asc" }, { id: "asc" }]);
});
test("batch codes are unique-looking and URL safe", () => {
  const codes = new Set(Array.from({ length: 1000 }, newBatchCode));
  assert.equal(codes.size, 1000);
  for (const code of codes) assert.match(code, /^BT-[0-9A-F]{10}$/);
});
test("products only accept own product-purpose images, inside a transaction", async () => {
  const mine = asset(),
    theirs = asset(),
    logPhoto = asset();
  const { db, calls, transactions } = fakeDb({
    media: [
      { id: mine.id, artisanId: ME, purpose: "product" },
      { id: theirs.id, artisanId: "other", purpose: "product" },
      { id: logPhoto.id, artisanId: ME, purpose: "production-log" },
    ],
  });
  const created = await createProduct(db, ME, { ...item, images: [mine.url] });
  assert.equal(created.price, 450000);
  assert.equal(transactions(), 1);
  for (const url of [
    theirs.url,
    logPhoto.url,
    "https://evil.test/a.png",
    "/media/x/web",
  ])
    await assert.rejects(
      createProduct(db, ME, { ...item, images: [url] }),
      status(400),
    );
  assert.equal(calls.filter((c) => c.op === "product.create").length, 1);
  assert.equal((calls[0].args as { data: Where }).data.artisanId, ME);
});
test("another workshop's product cannot be edited or batched", async () => {
  const { db, calls } = fakeDb({
    products: [{ id: "p1", artisanId: "other" }],
  });
  await assert.rejects(updateProduct(db, ME, "p1", item), status(404));
  await assert.rejects(
    createBatch(db, ME, "p1", { quantity: 10 }),
    status(404),
  );
  assert.equal(calls.length, 0);
});
test("own product gets a batch with a generated code", async () => {
  const { db, calls } = fakeDb({ products: [{ id: "p1", artisanId: ME }] });
  await createBatch(db, ME, "p1", { quantity: 20 });
  const { data } = calls[0].args as { data: Where };
  assert.equal(data.productId, "p1");
  assert.equal(data.quantity, 20);
  assert.match(data.code as string, /^BT-/);
});
test("logs are written only to own batches with own production-log images", async () => {
  const photo = asset(),
    productPhoto = asset();
  const { db, calls } = fakeDb({
    batches: [
      { id: "b1", code: "BT-MINE", artisanId: ME },
      { id: "b2", code: "BT-THEIRS", artisanId: "other" },
    ],
    logs: [
      { id: "l1", batchId: "b1" },
      { id: "l2", batchId: "b2" },
    ],
    media: [
      { id: photo.id, artisanId: ME, purpose: "production-log" },
      { id: productPhoto.id, artisanId: ME, purpose: "product" },
    ],
  });
  const log = { occurredAt: now, title: "Vẽ men", images: [photo.url] };
  await addLog(db, ME, "BT-MINE", log);
  assert.equal((calls[0].args as { data: Where }).data.batchId, "b1");
  await assert.rejects(addLog(db, ME, "BT-THEIRS", log), status(404));
  await assert.rejects(
    addLog(db, ME, "BT-MINE", { ...log, images: [productPhoto.url] }),
    status(400),
  );
  await updateLog(db, ME, "BT-MINE", "l1", log);
  // l2 exists but belongs to another workshop's batch.
  await assert.rejects(updateLog(db, ME, "BT-MINE", "l2", log), status(404));
  await assert.rejects(updateLog(db, ME, "BT-THEIRS", "l2", log), status(404));
  assert.deepEqual(
    calls.map((c) => c.op),
    ["log.create", "log.update"],
  );
});
test("public product query requires published product and approved artisan", async () => {
  let seen: { where: Where; select: Record<string, unknown> } | undefined;
  const client = {
    product: {
      findFirst: async (args: typeof seen) => ((seen = args), null),
    },
  };
  assert.equal(await publicProduct(client as never, "p1"), null);
  assert.deepEqual(seen!.where, {
    id: "p1",
    published: true,
    artisan: { approval: "APPROVED", user: { role: "ARTISAN" } },
  });
  assert.equal("artisanId" in seen!.select, false);
  assert.equal("published" in seen!.select, false);
});
