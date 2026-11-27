import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { cleanupMedia } from "../src/services/media-cleanup";
test(
  "cleanup lists by default and with --apply only removes old, unreferenced images",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const client = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    const dir = await mkdtemp(path.join(tmpdir(), "vcraft-cleanup-"));
    try {
      const village = await client.craftVillage.upsert({
        where: { slug: "bat-trang" },
        update: {},
        create: { slug: "bat-trang", name: "Làng gốm Bát Tràng" },
      });
      const user = await client.user.create({
        data: {
          email: `cleanup-${randomUUID()}@example.test`,
          name: "Dọn ảnh",
          role: "ARTISAN",
        },
      });
      const ids = {
        certificate: randomUUID(),
        productPhoto: randomUUID(),
        logPhoto: randomUUID(),
        oldLoose: randomUUID(),
        newLoose: randomUUID(),
        orphanFile: randomUUID(),
      };
      const url = (id: string) => `/media/${id}/web`;
      const profile = await client.artisanProfile.create({
        data: {
          userId: user.id,
          villageId: village.id,
          slug: "cleanup-" + randomUUID(),
          name: "Xưởng dọn ảnh",
          certificates: [url(ids.certificate)],
        },
      });
      const product = await client.product.create({
        data: {
          artisanId: profile.id,
          name: "SP",
          category: "Cốc",
          price: 1,
          images: [url(ids.productPhoto)],
        },
      });
      const batch = await client.productionBatch.create({
        data: {
          productId: product.id,
          code: "CLEAN-" + randomUUID(),
          quantity: 1,
        },
      });
      await client.productionLog.create({
        data: {
          batchId: batch.id,
          occurredAt: new Date(),
          title: "Nung",
          images: [url(ids.logPhoto)],
        },
      });
      const withRow = Object.values(ids).filter((id) => id !== ids.orphanFile);
      await client.mediaAsset.createMany({
        data: withRow.map((id) => ({
          id,
          artisanId: profile.id,
          purpose: "workshop",
          width: 1,
          height: 1,
          bytes: 1,
        })),
      });
      const old = new Date(Date.now() - 30 * 86_400_000);
      for (const id of Object.values(ids))
        for (const v of ["web", "thumb"]) {
          const file = path.join(dir, `${id}-${v}.webp`);
          await writeFile(file, "x");
          if (id !== ids.newLoose) await utimes(file, old, old);
        }
      await writeFile(path.join(dir, "README.txt"), "not an image");
      const all = (await readdir(dir)).length;
      const dry = await cleanupMedia({ client, dir, days: 7, apply: false });
      assert.deepEqual(
        dry.unused.map((u) => u.id).sort(),
        [ids.oldLoose, ids.orphanFile].sort(),
      );
      assert.deepEqual(dry.deleted, []);
      assert.equal((await readdir(dir)).length, all);
      const applied = await cleanupMedia({ client, dir, days: 7, apply: true });
      assert.deepEqual(
        applied.deleted.sort(),
        [ids.oldLoose, ids.orphanFile].sort(),
      );
      const left = await readdir(dir);
      for (const id of [
        ids.certificate,
        ids.productPhoto,
        ids.logPhoto,
        ids.newLoose,
      ])
        assert.ok(
          left.includes(`${id}-web.webp`) && left.includes(`${id}-thumb.webp`),
          id,
        );
      assert.ok(left.includes("README.txt"));
      assert.equal(left.length, all - 4);
      assert.equal(
        await client.mediaAsset.count({ where: { id: ids.oldLoose } }),
        0,
      );
      assert.equal(
        await client.mediaAsset.count({
          where: {
            id: {
              in: [
                ids.certificate,
                ids.productPhoto,
                ids.logPhoto,
                ids.newLoose,
              ],
            },
          },
        }),
        4,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
      await client.$disconnect();
    }
  },
);
