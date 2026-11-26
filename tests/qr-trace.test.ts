import test from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { Problem } from "../src/lib/endpoint";
import { qrImage, traceUrl } from "../src/services/qr";
import { createBatch, issueQr, issuedBatch } from "../src/services/production";
import { traceBatch } from "../src/services/visibility";
const status = (code: number) => (e: unknown) =>
  e instanceof Problem && e.code === code;
async function withBase<T>(base: string | undefined, fn: () => T) {
  const saved = process.env.PUBLIC_APP_URL;
  const set = (v: string | undefined) =>
    v === undefined
      ? delete process.env.PUBLIC_APP_URL
      : (process.env.PUBLIC_APP_URL = v);
  set(base);
  try {
    return await fn();
  } finally {
    set(saved);
  }
}
test("QR URL comes from PUBLIC_APP_URL and points at the batch trace page", async () => {
  await withBase("https://vcraft.example.vn/", () =>
    assert.equal(
      traceUrl("BT-0A1B2C3D4E"),
      "https://vcraft.example.vn/trace/BT-0A1B2C3D4E",
    ),
  );
  await withBase("https://example.vn/vcraft//", () =>
    assert.equal(
      traceUrl("BATCH_1"),
      "https://example.vn/vcraft/trace/BATCH_1",
    ),
  );
  for (const bad of [
    undefined,
    "",
    "vcraft.example.vn",
    "javascript:alert(1)",
    "ftp://x.vn",
  ])
    await withBase(bad, () =>
      assert.throws(() => traceUrl("BT-1"), /PUBLIC_APP_URL/),
    );
});
test("QR images encode the trace URL, one stable image per batch", async () => {
  await withBase("https://vcraft.example.vn", async () => {
    const png = (await qrImage("BT-AAAA", "png")) as Buffer;
    assert.deepEqual(
      [...png.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
    const svg = (await qrImage("BT-AAAA", "svg")) as string;
    assert.match(svg, /^<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.equal(await qrImage("BT-AAAA", "svg"), svg);
    assert.notEqual(await qrImage("BT-BBBB", "svg"), svg);
    // Same encoding parameters as qrImage: the payload is exactly the URL.
    const symbol = QRCode.create(traceUrl("BT-AAAA"), {
      errorCorrectionLevel: "M",
    });
    const bytes = symbol.segments.map((s) =>
      Buffer.from((s as { data: Uint8Array }).data),
    );
    assert.equal(
      Buffer.concat(bytes).toString(),
      "https://vcraft.example.vn/trace/BT-AAAA",
    );
  });
});
function batchDb(batch: {
  id: string;
  code: string;
  artisanId: string;
  qrIssuedAt: Date | null;
}) {
  const updates: unknown[] = [];
  const findFirst = async ({
    where,
  }: {
    where: { code: string; product: { artisanId: string } };
  }) =>
    where.code === batch.code && where.product.artisanId === batch.artisanId
      ? { id: batch.id, qrIssuedAt: batch.qrIssuedAt }
      : null;
  const tx = {
    product: { findFirst: async () => ({ id: "p1" }) },
    productionBatch: {
      findFirst,
      updateMany: async (args: { data: { qrIssuedAt: Date } }) => {
        updates.push(args);
        batch.qrIssuedAt ??= args.data.qrIssuedAt;
        return { count: 1 };
      },
      create: async (args: { data: Record<string, unknown> }) => args.data,
    },
  };
  const db = {
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    productionBatch: { findFirst },
  };
  return { db: db as never, updates };
}
test("creating a batch issues its QR code", async () => {
  const { db } = batchDb({
    id: "b",
    code: "x",
    artisanId: "me",
    qrIssuedAt: null,
  });
  const created = (await createBatch(db, "me", "p1", {
    quantity: 5,
  })) as unknown as { qrIssuedAt: Date };
  assert.ok(created.qrIssuedAt instanceof Date);
});
test("issuing a QR sets qrIssuedAt once and only for the owner", async () => {
  const first = new Date("2026-11-01T00:00:00Z");
  const issued = batchDb({
    id: "b1",
    code: "BT-1",
    artisanId: "me",
    qrIssuedAt: first,
  });
  assert.equal(await issueQr(issued.db, "me", "BT-1"), first);
  assert.equal(issued.updates.length, 0);
  const legacy = batchDb({
    id: "b2",
    code: "BT-2",
    artisanId: "me",
    qrIssuedAt: null,
  });
  await assert.rejects(issuedBatch(legacy.db, "me", "BT-2"), status(409));
  const at = await issueQr(legacy.db, "me", "BT-2");
  assert.ok(at instanceof Date);
  assert.deepEqual((legacy.updates[0] as { where: unknown }).where, {
    id: "b2",
    qrIssuedAt: null,
  });
  await issuedBatch(legacy.db, "me", "BT-2");
  await assert.rejects(issueQr(legacy.db, "intruder", "BT-2"), status(404));
  await assert.rejects(issuedBatch(legacy.db, "intruder", "BT-2"), status(404));
});
test("trace page only reads published products of approved workshops", async () => {
  let seen: { where: unknown; select: Record<string, unknown> } | undefined;
  const client = {
    productionBatch: {
      findFirst: async (args: typeof seen) => ((seen = args), null),
    },
  };
  assert.equal(await traceBatch(client as never, "BT-1"), null);
  assert.deepEqual(seen!.where, {
    code: "BT-1",
    product: {
      published: true,
      artisan: { approval: "APPROVED", user: { role: "ARTISAN" } },
    },
  });
  // No internal ids, ownership or draft flags leave the server.
  const fields = JSON.stringify(seen!.select);
  for (const hidden of [
    "artisanId",
    "productId",
    "batchId",
    "published",
    "userId",
    "approval",
    "email",
    "phone",
  ])
    assert.equal(fields.includes(`"${hidden}"`), false, hidden);
});
