import "server-only";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { Problem } from "@/lib/endpoint";
const ttl = 7 * 24 * 3600;
async function cookie() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET");
  return getIronSession<{ id?: string }>(await cookies(), {
    cookieName: "vcraft_session",
    password,
    ttl,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}
export async function currentUser() {
  if (!(await cookies()).has("vcraft_session")) return null;
  const session = await cookie();
  if (!session.id) return null;
  const record = await db.loginSession.findFirst({
    where: { id: session.id, expiresAt: { gt: new Date() } },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          profile: { select: { id: true, slug: true, approval: true } },
        },
      },
    },
  });
  return record?.user ?? null;
}
async function start(userId: string) {
  const session = await cookie();
  const record = await db.$transaction(async (tx) => {
    if (session.id)
      await tx.loginSession.deleteMany({ where: { id: session.id } });
    await tx.loginSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    return tx.loginSession.create({
      data: { userId, expiresAt: new Date(Date.now() + ttl * 1000) },
    });
  });
  session.id = record.id;
  await session.save();
}
export async function logout() {
  const session = await cookie();
  if (session.id)
    await db.loginSession.deleteMany({ where: { id: session.id } });
  session.destroy();
}
const email = z.email().trim().toLowerCase().max(254);
const credentials = z.object({ email, password: z.string().min(1).max(128) });
const registration = credentials
  .extend({
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .regex(/^(?:0|\+84)[1-9]\d{8}$/, "Số điện thoại Việt Nam không hợp lệ."),
    role: z.enum(["ARTISAN", "BUYER"]),
    password: z
      .string()
      .min(10, "Mật khẩu cần ít nhất 10 ký tự.")
      .regex(/\p{L}/u, "Mật khẩu cần có chữ.")
      .regex(/\d/, "Mật khẩu cần có số.")
      .refine((v) => !bcrypt.truncates(v), "Mật khẩu vượt 72 byte."),
  })
  .strict();
async function throttle(action: string, email: string) {
  const window = 15 * 60 * 1000;
  const bucket = Math.floor(Date.now() / window);
  const key = createHash("sha256")
    .update([action, email, bucket].join("|"))
    .digest("hex");
  await db.authAttempt.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  const attempt = await db.authAttempt.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date((bucket + 1) * window) },
    update: { count: { increment: 1 } },
  });
  if (attempt.count > 10)
    throw new Problem(429, "Vui lòng thử lại sau 15 phút.");
}
export async function register(raw: unknown) {
  const data = registration.parse(raw);
  await throttle("register", data.email);
  const passwordHash = await bcrypt.hash(data.password, 12);
  try {
    const user = await db.$transaction(async (tx) => {
      const account = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          role: data.role,
          passwordHash,
        },
      });
      if (data.role === "ARTISAN") {
        const village = await tx.craftVillage.upsert({
          where: { slug: "bat-trang" },
          update: {},
          create: { slug: "bat-trang", name: "Làng gốm Bát Tràng" },
        });
        await tx.artisanProfile.create({
          data: {
            userId: account.id,
            villageId: village.id,
            slug: "xuong-" + randomUUID(),
            name: data.name,
          },
        });
      }
      return account;
    });
    return { role: user.role };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new Problem(409, "Thông tin đăng ký đã được sử dụng.");
    throw e;
  }
}
const dummyHash = bcrypt.hashSync(randomUUID(), 12);
export async function login(raw: unknown) {
  const data = credentials.strict().parse(raw);
  await throttle("login", data.email);
  const user = await db.user.findUnique({ where: { email: data.email } });
  const valid = await bcrypt.compare(
    data.password,
    user?.passwordHash ?? dummyHash,
  );
  if (!valid || !user?.passwordHash || bcrypt.truncates(data.password))
    throw new Problem(401, "Email hoặc mật khẩu không đúng.");
  await start(user.id);
  return { role: user.role };
}
