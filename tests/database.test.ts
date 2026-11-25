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

test(
  "allocation cap serializes competing bids and enforces delivery progress",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const db = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    try {
      const buyer = await db.user.findUniqueOrThrow({
        where: { email: "buyer@example.test" },
      });
      const workshops = await db.artisanProfile.findMany({
        where: { slug: { in: ["xuong-gom-demo", "xuong-men-ngoc-demo"] } },
      });
      assert.equal(workshops.length, 2);
      const request = await db.quoteRequest.create({
        data: {
          buyerId: buyer.id,
          description: "Integration test",
          deadline: new Date(),
          quantity: 10,
          recipients: { create: workshops.map((w) => ({ artisanId: w.id })) },
        },
      });
      const bids = await Promise.all(
        workshops.map((w) =>
          db.quoteBid.create({
            data: {
              requestId: request.id,
              artisanId: w.id,
              quantity: 10,
              unitPrice: 1,
              completionDate: new Date(),
            },
          }),
        ),
      );
      const competing = await Promise.allSettled(
        bids.map((b) =>
          db.quoteBid.update({
            where: { id: b.id },
            data: { acceptedQuantity: 7 },
          }),
        ),
      );
      assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1);
      const winner = await db.quoteBid.findFirstOrThrow({
        where: { requestId: request.id, acceptedQuantity: 7 },
      });
      await assert.rejects(
        db.quoteRequest.update({
          where: { id: request.id },
          data: { quantity: 6 },
        }),
      );
      await assert.rejects(
        db.quoteBid.update({
          where: { id: winner.id },
          data: { producedQuantity: 8 },
        }),
      );
      await assert.rejects(
        db.quoteBid.update({
          where: { id: winner.id },
          data: { deliveredQuantity: 1 },
        }),
      );
      const delivered = await db.quoteBid.update({
        where: { id: winner.id },
        data: { producedQuantity: 7, deliveredQuantity: 6 },
      });
      assert.equal(delivered.deliveredQuantity, 6);
    } finally {
      await db.$disconnect();
    }
  },
);
