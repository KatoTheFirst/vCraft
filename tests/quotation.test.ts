import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
test(
  "buyer and invited workshop complete an order through the HTTP API",
  { skip: !process.env.TEST_DATABASE_URL || !process.env.TEST_BASE_URL },
  async () => {
    const db = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    const base = process.env.TEST_BASE_URL!;
    async function call(
      path: string,
      cookie = "",
      method = "GET",
      data?: unknown,
    ) {
      const r = await fetch(base + path, {
        method,
        headers: { cookie, "content-type": "application/json" },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return {
        status: r.status,
        body: await r.json(),
        cookie: r.headers.get("set-cookie")?.split(";")[0],
      };
    }
    async function account(role: "BUYER" | "ARTISAN") {
      const email = randomUUID() + "@example.test",
        password = "Ceramic1-" + randomUUID();
      const signup = await call("/api/v1/auth/register", "", "POST", {
        email,
        password,
        role,
        name: "Thử nghiệm",
        phone: "0912345678",
      });
      assert.equal(signup.status, 201);
      const login = await call("/api/v1/auth/login", "", "POST", {
        email,
        password,
      });
      assert.ok(login.cookie);
      return { email, cookie: login.cookie };
    }
    try {
      const buyer = await account("BUYER"),
        other = await account("BUYER"),
        shop = await account("ARTISAN");
      const category = "Men thử " + randomUUID();
      const info = {
        description: "Cốc 300 ml in logo",
        category,
        quantity: 500,
        budget: 40000000,
        deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
      const root = "/api/v1/quotes";
      assert.equal((await call(root)).status, 401);
      assert.equal((await call(root, shop.cookie, "POST", info)).status, 403);
      const created = await call(root, buyer.cookie, "POST", info);
      assert.equal(created.status, 201);
      const path = root + "/" + created.body.data.id;
      let version = created.body.data.version;
      const change = (cookie: string, data: Record<string, unknown>) =>
        call(path, cookie, "PATCH", { ...data, version });
      assert.equal(
        (await change(other.cookie, { action: "send" })).status,
        404,
      );
      assert.equal(
        (await change(buyer.cookie, { action: "send" })).status,
        409,
      );
      const edited = await change(buyer.cookie, { ...info, action: "edit" });
      assert.equal(edited.status, 200);
      version = edited.body.data.version;
      const artisan = await db.artisanProfile.findFirstOrThrow({
        where: { user: { email: shop.email } },
      });
      await db.artisanProfile.update({
        where: { id: artisan.id },
        data: { approval: "APPROVED" },
      });
      await db.product.create({
        data: {
          artisanId: artisan.id,
          name: "Cốc mẫu",
          price: 70000,
          category,
          published: true,
        },
      });
      const sent = await change(buyer.cookie, { action: "send" });
      assert.equal(sent.body.data.state, "SENT_TO_ARTISANS");
      version = sent.body.data.version;
      const mine = await call(root, shop.cookie);
      assert.equal(mine.body.data.items[0].id, created.body.data.id);
      const terms = {
        action: "bid",
        quantity: 500,
        unitPrice: 75000,
        completionDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      };
      const bid = await change(shop.cookie, terms);
      assert.equal(bid.body.data.state, "ARTISANS_BIDDING");
      version = bid.body.data.version;
      const list = await call(root, buyer.cookie);
      const accept = {
        action: "accept",
        bidId: list.body.data.items[0].recipients[0].bid.id,
      };
      const race = await Promise.all([
        change(buyer.cookie, accept),
        change(buyer.cookie, accept),
      ]);
      assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
      const accepted = race.find((r) => r.status === 200)!;
      assert.equal(accepted.body.data.state, "BUYER_ACCEPTED");
      version = accepted.body.data.version;
      assert.equal((await change(shop.cookie, terms)).status, 409);
      assert.equal(
        (await change(shop.cookie, { action: "deliver" })).status,
        409,
      );
      const start = await change(shop.cookie, { action: "start" });
      assert.equal(start.body.data.state, "IN_PRODUCTION");
      version = start.body.data.version;
      assert.equal(
        (await change(shop.cookie, { action: "deliver" })).body.data.state,
        "DELIVERED",
      );
    } finally {
      await db.$disconnect();
    }
  },
);
