import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
const base = process.env.TEST_BASE_URL!;
const skip = !process.env.TEST_BASE_URL || !process.env.TEST_DATABASE_URL;
const password = "Hanmuc1-" + randomUUID();
let png: Buffer;
async function artisan() {
  let cookie = "";
  const email = `quota-${randomUUID()}@example.test`;
  const post = async (url: string, body: unknown) => {
    const form = body instanceof FormData;
    const r = await fetch(base + url, {
      method: "POST",
      headers: {
        cookie,
        origin: base,
        ...(form ? {} : { "content-type": "application/json" }),
      },
      body: form ? body : JSON.stringify(body),
    });
    const set = r.headers
      .getSetCookie()
      .find((c) => c.startsWith("vcraft_session="));
    if (set) cookie = set.split(";")[0];
    return { status: r.status, body: await r.json() };
  };
  await post("/api/v1/auth/register", {
    name: "Xưởng hạn mức",
    email,
    phone: "0912345678",
    password,
    role: "ARTISAN",
  });
  await post("/api/v1/auth/login", { email, password });
  png ??= await sharp({
    create: { width: 32, height: 32, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const upload = (count: number, purpose = "workshop") => {
    const form = new FormData();
    form.set("purpose", purpose);
    for (let i = 0; i < count; i++)
      form.append(
        "files",
        new Blob([new Uint8Array(png)], { type: "image/png" }),
        `a${i}.png`,
      );
    return post("/api/v1/uploads", form);
  };
  return { email, upload, post };
}
const db = () =>
  new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
const assets = (client: PrismaClient, email: string) =>
  client.mediaAsset.count({ where: { artisan: { user: { email } } } });
test(
  "the 21st upload request in 15 minutes answers 429",
  { skip },
  async () => {
    const a = await artisan();
    const statuses = [];
    for (let i = 0; i < 21; i++) statuses.push((await a.upload(1)).status);
    assert.deepEqual(statuses.slice(0, 20), Array(20).fill(201));
    assert.equal(statuses[20], 429);
  },
);
test(
  "a pending workshop may store 30 images, certificates included",
  { skip },
  async () => {
    const client = db();
    try {
      const a = await artisan();
      for (let i = 0; i < 4; i++) assert.equal((await a.upload(6)).status, 201);
      // 24 stored: certificates still fit.
      assert.equal((await a.upload(6, "certificate")).status, 201);
      assert.equal(await assets(client, a.email), 30);
      const over = await a.upload(1, "certificate");
      assert.equal(over.status, 409);
      assert.match(over.body.message, /30\/30/);
      assert.equal(await assets(client, a.email), 30);
    } finally {
      await client.$disconnect();
    }
  },
);
test(
  "two concurrent uploads near the quota cannot exceed it, and leave no stray files",
  { skip },
  async () => {
    const client = db();
    try {
      const a = await artisan();
      for (let i = 0; i < 4; i++) await a.upload(6);
      await a.upload(2);
      assert.equal(await assets(client, a.email), 26);
      const dir = process.env.MEDIA_STORAGE_DIR;
      const before = dir ? new Set(await readdir(dir)) : null;
      const results = await Promise.all([a.upload(3), a.upload(3)]);
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
      assert.equal(await assets(client, a.email), 29);
      if (dir && before) {
        // Every new file must belong to a stored asset. Other test files upload
        // in parallel, so give their in-flight requests a moment to commit.
        const owned = async () => {
          const added = (await readdir(dir)).filter((f) => !before.has(f));
          const ids = [...new Set(added.map((f) => f.slice(0, 36)))];
          return (
            (await client.mediaAsset.count({ where: { id: { in: ids } } })) ===
            ids.length
          );
        };
        let clean = await owned();
        for (let i = 0; !clean && i < 20; i++) {
          await new Promise((r) => setTimeout(r, 100));
          clean = await owned();
        }
        assert.ok(clean, "rejected upload left files on disk");
      }
    } finally {
      await client.$disconnect();
    }
  },
);
test(
  "login and register are still limited to 10 attempts per email",
  { skip },
  async () => {
    const a = await artisan();
    const logins = [];
    for (let i = 0; i < 10; i++)
      logins.push(
        (
          await a.post("/api/v1/auth/login", {
            email: a.email,
            password: "sai-mat-khau-1",
          })
        ).status,
      );
    // The artisan() helper already logged in once: attempts 2..11.
    assert.deepEqual(logins.slice(0, 9), Array(9).fill(401));
    assert.equal(logins[9], 429);
    const email = `reg-${randomUUID()}@example.test`;
    const regs = [];
    for (let i = 0; i < 11; i++)
      regs.push(
        (
          await a.post("/api/v1/auth/register", {
            name: "Trùng",
            email,
            phone: "0912345678",
            password,
            role: "BUYER",
          })
        ).status,
      );
    assert.deepEqual(regs, [201, ...Array(9).fill(409), 429]);
  },
);
