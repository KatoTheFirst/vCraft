import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const base = process.env.TEST_BASE_URL!;
const password = "Anhduyet1-" + randomUUID();
function client() {
  let cookie = "";
  return async (url: string, method = "GET", body?: unknown | FormData) => {
    const form = body instanceof FormData;
    const r = await fetch(base + url, {
      method,
      redirect: "manual",
      headers: {
        cookie,
        ...(method === "GET" ? {} : { origin: base }),
        ...(body === undefined || form
          ? {}
          : { "content-type": "application/json" }),
      },
      body: form ? body : body === undefined ? undefined : JSON.stringify(body),
    });
    const set = r.headers
      .getSetCookie()
      .find((c) => c.startsWith("vcraft_session="));
    if (set) cookie = set.split(";")[0];
    const type = r.headers.get("content-type") ?? "";
    return {
      status: r.status,
      json: type.includes("json") ? await r.json() : null,
    };
  };
}
async function login(role: "ARTISAN" | "BUYER") {
  const call = client();
  const email = `${role.toLowerCase()}-${randomUUID()}@example.test`;
  await call("/api/v1/auth/register", "POST", {
    name: "Thử ảnh",
    email,
    phone: "0912345678",
    password,
    role,
  });
  await call("/api/v1/auth/login", "POST", { email, password });
  return call;
}
test(
  "admins see photos and certificates attached to a pending workshop; nobody else does",
  { skip: !process.env.TEST_BASE_URL || !process.env.TEST_DATABASE_URL },
  async () => {
    const db = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    try {
      const owner = await login("ARTISAN");
      const png = await sharp({
        create: { width: 64, height: 64, channels: 3, background: "white" },
      })
        .png()
        .toBuffer();
      const upload = async (purpose: string) => {
        const form = new FormData();
        form.set("purpose", purpose);
        form.append(
          "files",
          new Blob([new Uint8Array(png)], { type: "image/png" }),
          "a.png",
        );
        const r = await owner("/api/v1/uploads", "POST", form);
        assert.equal(r.status, 201);
        return r.json.data[0].url as string;
      };
      const certificate = await upload("certificate");
      const photo = await upload("workshop");
      const loose = await upload("workshop");
      const profile = (await owner("/api/v1/workshop")).json.data;
      const saved = await owner("/api/v1/workshop", "PUT", {
        name: "Xưởng chờ duyệt có chứng nhận",
        story: "",
        familyHistory: "",
        latitude: null,
        longitude: null,
        isOpen: false,
        images: [photo],
        certificates: [certificate],
        version: profile.version,
      });
      assert.equal(saved.status, 200);
      assert.equal(profile.approval, "PENDING");
      const adminEmail = `admin-${randomUUID()}@example.test`;
      await db.user.create({
        data: {
          email: adminEmail,
          name: "BQL",
          role: "ADMIN",
          passwordHash: await bcrypt.hash(password, 10),
        },
      });
      const admin = client();
      await admin("/api/v1/auth/login", "POST", {
        email: adminEmail,
        password,
      });
      const anon = client();
      const buyer = await login("BUYER");
      const stranger = await login("ARTISAN");
      const thumb = (url: string) => url.replace(/\/web$/, "/thumb");
      for (const url of [certificate, photo, thumb(certificate)]) {
        assert.equal((await admin(url)).status, 200, "admin " + url);
        assert.equal((await owner(url)).status, 200, "owner " + url);
        for (const [who, call] of [
          ["anon", anon],
          ["buyer", buyer],
          ["other artisan", stranger],
        ] as const)
          assert.equal((await call(url)).status, 404, who + " " + url);
      }
      // Not attached to the profile: still private to the owner, even for admins.
      assert.equal((await admin(loose)).status, 404);
      assert.equal((await owner(loose)).status, 200);
    } finally {
      await db.$disconnect();
    }
  },
);
