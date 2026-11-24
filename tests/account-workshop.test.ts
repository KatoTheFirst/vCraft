import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { authorize } from "../src/lib/policy";
test("business operations require an approved artisan", () => {
  for (const role of ["ADMIN", "BUYER"] as const)
    assert.throws(() => authorize({ role, profile: null }, "ARTISAN", true));
  for (const approval of ["PENDING", "SUSPENDED"] as const)
    assert.throws(() =>
      authorize({ role: "ARTISAN", profile: { approval } }, "ARTISAN", true),
    );
  assert.ok(
    authorize(
      { role: "ARTISAN", profile: { approval: "APPROVED" } },
      "ARTISAN",
      true,
    ),
  );
});
test(
  "accounts, session revocation, workshop ownership and optimized media",
  { skip: !process.env.TEST_BASE_URL || !process.env.TEST_DATABASE_URL },
  async () => {
    const base = process.env.TEST_BASE_URL!;
    const db = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    const password = "Demo1-" + randomUUID(),
      email = randomUUID() + "@example.test";
    const credentials = { email, password };
    const account = {
      ...credentials,
      name: "Nghệ nhân thử nghiệm",
      role: "ARTISAN",
      phone: "0912345678",
    };
    let cookie = "";
    const call = (url: string, method = "GET", value?: unknown) =>
      fetch(base + url, {
        method,
        headers: {
          cookie,
          ...(value === undefined
            ? {}
            : { "content-type": "application/json" }),
        },
        body: value === undefined ? undefined : JSON.stringify(value),
        redirect: "manual",
      });
    try {
      assert.equal((await call("/api/v1/workshop")).status, 401);
      assert.equal(
        (
          await call("/api/v1/auth/register", "POST", {
            ...account,
            role: "ADMIN",
          })
        ).status,
        400,
      );
      assert.equal(
        (await call("/api/v1/auth/register", "POST", account)).status,
        201,
      );
      assert.equal(
        (await call("/api/v1/auth/register", "POST", account)).status,
        409,
      );
      assert.equal(
        (await call("/api/v1/auth/login", "POST", { email, password: "wrong" }))
          .status,
        401,
      );
      const login = await call("/api/v1/auth/login", "POST", credentials);
      assert.equal(login.status, 200);
      const header = login.headers.get("set-cookie")!;
      assert.match(header, /HttpOnly/i);
      cookie = header.split(";")[0];
      const stored = await db.user.findUniqueOrThrow({ where: { email } });
      assert.ok(await bcrypt.compare(password, stored.passwordHash!));
      const profile = (await (await call("/api/v1/workshop")).json()).data;
      assert.equal(profile.approval, "PENDING");
      assert.equal(
        (await call("/api/v1/artisans/" + profile.slug)).status,
        404,
      );
      assert.equal((await call("/dashboard/buyer")).status, 307);
      const png = await sharp({
        create: { width: 1700, height: 850, channels: 3, background: "white" },
      })
        .png()
        .toBuffer();
      const upload = (purpose: string, blobs: Blob[]) => {
        const data = new FormData();
        data.set("purpose", purpose);
        blobs.forEach((b) => data.append("files", b, "sample.png"));
        return fetch(base + "/api/v1/uploads", {
          method: "POST",
          headers: { cookie },
          body: data,
        });
      };
      const image = new Blob([new Uint8Array(png)], { type: "image/png" });
      assert.equal((await upload("product", [image])).status, 403);
      assert.equal(
        (
          await upload("workshop", [
            image,
            new Blob(["text"], { type: "image/png" }),
          ])
        ).status,
        415,
      );
      assert.equal(
        await db.mediaAsset.count({
          where: { artisan: { userId: stored.id } },
        }),
        0,
      );
      const uploaded = await upload("workshop", [image, image]);
      assert.equal(uploaded.status, 201);
      const assets = (await uploaded.json()).data;
      assert.equal(assets.length, 2);
      assert.equal(assets[0].width, 1600);
      const thumb = await call(assets[0].thumbnailUrl);
      assert.equal(thumb.status, 200);
      assert.equal(
        (await sharp(Buffer.from(await thumb.arrayBuffer())).metadata()).width,
        320,
      );
      const update = {
        name: "Xưởng thử nghiệm",
        familyHistory: "Ba thế hệ",
        story: "Nghề vuốt gốm",
        latitude: 20.97,
        longitude: 105.91,
        isOpen: true,
        images: [assets[0].url],
        certificates: [],
        version: profile.version,
      };
      assert.equal(
        (
          await call("/api/v1/workshop", "PUT", {
            ...update,
            certificates: update.images,
          })
        ).status,
        400,
      );
      assert.equal((await call("/api/v1/workshop", "PUT", update)).status, 200);
      assert.equal((await call("/api/v1/workshop", "PUT", update)).status, 409);
      assert.equal((await fetch(base + assets[0].url)).status, 404);
      await db.artisanProfile.update({
        where: { userId: stored.id },
        data: { approval: "APPROVED" },
      });
      assert.equal((await fetch(base + assets[0].url)).status, 200);
      assert.match(
        await (await call("/artisan/" + profile.slug)).text(),
        /Ba thế hệ/,
      );
      await db.artisanProfile.update({
        where: { userId: stored.id },
        data: { approval: "SUSPENDED" },
      });
      assert.equal((await call("/api/v1/workshop")).status, 403);
      assert.equal((await call("/api/v1/auth/logout", "POST")).status, 200);
      assert.equal((await call("/api/v1/workshop")).status, 401);
      const buyer = { ...account, role: "BUYER", email: "buyer-" + email };
      assert.equal(
        (await call("/api/v1/auth/register", "POST", buyer)).status,
        201,
      );
      const buyerLogin = await call("/api/v1/auth/login", "POST", {
        email: buyer.email,
        password,
      });
      cookie = buyerLogin.headers.get("set-cookie")!.split(";")[0];
      assert.equal((await call("/api/v1/workshop")).status, 403);
    } finally {
      await db.$disconnect();
    }
  },
);
