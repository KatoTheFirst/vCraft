import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { VillageRepository } from "../src/repositories/villages";
test(
  "PostgreSQL seed roles and repository CRUD",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const db = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    try {
      const roles = await db.user.findMany({
        where: {
          email: {
            in: [
              "artisan@example.test",
              "admin@example.test",
              "buyer@example.test",
            ],
          },
        },
        select: { role: true },
      });
      assert.deepEqual(roles.map((u) => u.role).sort(), [
        "ADMIN",
        "ARTISAN",
        "BUYER",
      ]);
      await db.$transaction(async (tx) => {
        const villages = new VillageRepository(tx);
        const slug = "test-" + randomUUID();
        await villages.create({ slug, name: "Test" });
        await villages.update(slug, "Updated");
        assert.equal((await villages.find(slug))?.name, "Updated");
        await villages.delete(slug);
        assert.equal(await villages.find(slug), null);
      });
    } finally {
      await db.$disconnect();
    }
  },
);
