import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const base = process.env.TEST_BASE_URL!;
const skip = !process.env.TEST_BASE_URL || !process.env.TEST_DATABASE_URL;
const password = "Kiemduyet1-" + randomUUID();
function client() {
  let cookie = "";
  return async (url: string, method = "GET", body?: unknown, origin = base) => {
    const r = await fetch(base + url, {
      method,
      redirect: "manual",
      headers: {
        cookie,
        ...(method === "GET" ? {} : { origin }),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = r.headers
      .getSetCookie()
      .find((c) => c.startsWith("vcraft_session="));
    if (set) cookie = set.split(";")[0];
    const text = await r.text();
    let data: { data?: Record<string, unknown> } = {};
    try {
      data = JSON.parse(text);
    } catch {}
    return {
      status: r.status,
      data: data.data as Record<string, never>,
      location: r.headers.get("location"),
      text,
    };
  };
}
async function artisan(name: string) {
  const call = client();
  const email = `${name}-${randomUUID()}@example.test`;
  const reg = await call("/api/v1/auth/register", "POST", {
    name,
    email,
    phone: "0912345678",
    password,
    role: "ARTISAN",
  });
  assert.equal(reg.status, 201);
  assert.equal(
    (await call("/api/v1/auth/login", "POST", { email, password })).status,
    200,
  );
  return { call, email };
}
const product = {
  name: "Bình kiểm duyệt",
  category: "Bình hoa",
  price: 100000,
  story: "",
  images: [],
  published: true,
};
test(
  "admin approves, rejects, suspends and reinstates with immediate effect",
  { skip },
  async () => {
    const db = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    const adminEmail = `admin-${randomUUID()}@example.test`;
    try {
      await db.user.create({
        data: {
          email: adminEmail,
          name: "BQL thử",
          role: "ADMIN",
          passwordHash: await bcrypt.hash(password, 10),
        },
      });
      const admin = client();
      assert.equal(
        (
          await admin("/api/v1/auth/login", "POST", {
            email: adminEmail,
            password,
          })
        ).status,
        200,
      );
      const a = await artisan("xuong-duyet");
      assert.equal(
        (await a.call("/api/v1/products", "POST", product)).status,
        403,
      );
      // Find it through the list: PENDING by default, search by email.
      const list = await admin(
        "/api/v1/admin/workshops?q=" + encodeURIComponent(a.email),
      );
      assert.equal(list.status, 200);
      assert.equal(list.data.status, "PENDING");
      const items = list.data.items as unknown as {
        id: string;
        version: number;
        approval: string;
      }[];
      assert.equal(items.length, 1);
      const id = items[0].id;
      const detail = await admin("/api/v1/admin/workshops/" + id);
      assert.equal(detail.status, 200);
      assert.equal(detail.data.user["email" as never], a.email);
      // The artisan edits the profile while the admin is looking: stale version.
      const own = (await a.call("/api/v1/workshop")).data;
      const saved = await a.call("/api/v1/workshop", "PUT", {
        name: "Xưởng đã sửa",
        story: "",
        familyHistory: "",
        latitude: null,
        longitude: null,
        isOpen: false,
        images: [],
        certificates: [],
        version: own.version,
      });
      assert.equal(saved.status, 200);
      const stale = await admin("/api/v1/admin/workshops/" + id, "PATCH", {
        approval: "APPROVED",
        version: items[0].version,
      });
      assert.equal(stale.status, 409);
      const fresh = (await admin("/api/v1/admin/workshops/" + id)).data;
      assert.equal(
        (
          await admin(
            "/api/v1/admin/workshops/" + id,
            "PATCH",
            { approval: "APPROVED", version: fresh.version },
            "https://evil.test",
          )
        ).status,
        403,
      );
      const approved = await admin("/api/v1/admin/workshops/" + id, "PATCH", {
        approval: "APPROVED",
        version: fresh.version,
      });
      assert.equal(approved.status, 200);
      assert.equal(approved.data.approval, "APPROVED");
      const row = await db.artisanProfile.findUniqueOrThrow({
        where: { id },
        include: { reviewedBy: true },
      });
      assert.equal(row.reviewedBy?.email, adminEmail);
      assert.ok(row.reviewedAt);
      // Next request after approval: the artisan can sell.
      const created = await a.call("/api/v1/products", "POST", product);
      assert.equal(created.status, 201);
      const productPage = "/products/" + created.data.id;
      assert.equal((await client()(productPage)).status, 200);
      assert.equal((await client()("/artisan/" + row.slug)).status, 200);
      // Suspend: a reason is required, then access is gone on the next request.
      assert.equal(
        (
          await admin("/api/v1/admin/workshops/" + id, "PATCH", {
            approval: "SUSPENDED",
            version: approved.data.version,
          })
        ).status,
        400,
      );
      const suspended = await admin("/api/v1/admin/workshops/" + id, "PATCH", {
        approval: "SUSPENDED",
        version: approved.data.version,
        reviewNote: "Bán hàng giả mạo nhãn làng nghề",
      });
      assert.equal(suspended.status, 200);
      assert.equal(
        (await a.call("/api/v1/products", "POST", product)).status,
        403,
      );
      assert.equal(
        (await a.call("/api/v1/products/" + created.data.id, "PUT", product))
          .status,
        403,
      );
      assert.equal(
        (
          await a.call("/api/v1/quotes/any", "PATCH", {
            action: "start",
            version: 0,
          })
        ).status,
        403,
      );
      assert.equal((await client()(productPage)).status, 404);
      assert.equal((await client()("/artisan/" + row.slug)).status, 404);
      // Suspended cannot be rejected, only reinstated.
      assert.equal(
        (
          await admin("/api/v1/admin/workshops/" + id, "PATCH", {
            approval: "REJECTED",
            version: suspended.data.version,
            reviewNote: "Thử chuyển sai",
          })
        ).status,
        409,
      );
      const back = await admin("/api/v1/admin/workshops/" + id, "PATCH", {
        approval: "APPROVED",
        version: suspended.data.version,
      });
      assert.equal(back.status, 200);
      assert.equal(
        (await a.call("/api/v1/products/" + created.data.id, "PUT", product))
          .status,
        200,
      );
      assert.equal((await client()(productPage)).status, 200);
      // Reject a second applicant; it is final.
      const b = await artisan("xuong-tu-choi");
      const bRow = await db.artisanProfile.findFirstOrThrow({
        where: { user: { email: b.email } },
      });
      assert.equal(
        (
          await admin("/api/v1/admin/workshops/" + bRow.id, "PATCH", {
            approval: "REJECTED",
            version: bRow.version,
          })
        ).status,
        400,
      );
      const rejected = await admin(
        "/api/v1/admin/workshops/" + bRow.id,
        "PATCH",
        {
          approval: "REJECTED",
          version: bRow.version,
          reviewNote: "Không có chứng nhận làng nghề",
        },
      );
      assert.equal(rejected.status, 200);
      assert.equal((await b.call("/api/v1/workshop")).status, 403);
      assert.equal(
        (
          await admin("/api/v1/admin/workshops/" + bRow.id, "PATCH", {
            approval: "APPROVED",
            version: rejected.data.version,
          })
        ).status,
        409,
      );
    } finally {
      await db.$disconnect();
    }
  },
);
test("non-admins are blocked from admin pages and APIs", { skip }, async () => {
  const anon = client();
  assert.equal((await anon("/api/v1/admin/workshops")).status, 401);
  const page = await anon("/admin/workshops");
  assert.equal(page.status, 307);
  assert.match(page.location ?? "", /\/login$/);
  const a = await artisan("xuong-tomo");
  assert.equal((await a.call("/api/v1/admin/workshops")).status, 403);
  assert.equal(
    (
      await a.call("/api/v1/admin/workshops/x", "PATCH", {
        approval: "APPROVED",
        version: 0,
      })
    ).status,
    403,
  );
  const artisanPage = await a.call("/admin/workshops");
  assert.equal(artisanPage.status, 307);
  assert.match(artisanPage.location ?? "", /\/dashboard\/artisan$/);
  const buyer = client();
  const email = `buyer-${randomUUID()}@example.test`;
  await buyer("/api/v1/auth/register", "POST", {
    name: "Khách",
    email,
    phone: "0912345678",
    password,
    role: "BUYER",
  });
  await buyer("/api/v1/auth/login", "POST", { email, password });
  assert.equal((await buyer("/api/v1/admin/workshops")).status, 403);
  assert.equal((await buyer("/api/v1/admin/workshops/x")).status, 403);
});
