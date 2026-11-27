import "server-only";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Problem } from "@/lib/endpoint";
import { credentials, registration } from "@/validations/auth";
import { throttle } from "./rate-limit";
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
export async function register(raw: unknown) {
  const data = registration.parse(raw);
  await throttle(db, "register", data.email);
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
  const data = credentials.parse(raw);
  await throttle(db, "login", data.email);
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
