import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function seed() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Seed chỉ dùng cho phát triển hoặc kiểm thử.");
  const password = process.env.DEMO_PASSWORD;
  if (
    password &&
    (password.length < 10 ||
      !/\p{L}/u.test(password) ||
      !/\d/.test(password) ||
      bcrypt.truncates(password))
  )
    throw new Error("DEMO_PASSWORD");
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  await db.$transaction(async (tx) => {
    for (const role of ["ADMIN", "ARTISAN", "BUYER"] as const) {
      await tx.user.upsert({
        where: { email: role.toLowerCase() + "@example.test" },
        update: {},
        create: {
          passwordHash,
          name: "Demo " + role,
          email: role.toLowerCase() + "@example.test",
          role,
        },
      });
    }
    if (passwordHash)
      await tx.user.updateMany({
        where: {
          email: {
            in: [
              "admin@example.test",
              "artisan@example.test",
              "buyer@example.test",
            ],
          },
          passwordHash: null,
        },
        data: { passwordHash },
      });
    const village = await tx.craftVillage.upsert({
      where: { slug: "bat-trang" },
      update: {},
      create: { name: "Làng gốm Bát Tràng", slug: "bat-trang" },
    });
    const artisan = await tx.artisanProfile.upsert({
      where: { slug: "xuong-gom-demo" },
      update: {},
      create: {
        slug: "xuong-gom-demo",
        name: "Xưởng gốm minh họa",
        approval: "APPROVED",
        village: { connect: { id: village.id } },
        user: { connect: { email: "artisan@example.test" } },
      },
    });
    const product = await tx.product.upsert({
      where: { id: "demo-coc-men-lam" },
      update: {},
      create: {
        id: "demo-coc-men-lam",
        name: "Cốc men lam",
        category: "Cốc",
        price: 85000,
        published: true,
        artisanId: artisan.id,
      },
    });
    const batch = await tx.productionBatch.upsert({
      where: { code: "BATCH-001" },
      update: {},
      create: { code: "BATCH-001", quantity: 20, productId: product.id },
    });
    await tx.productionLog.upsert({
      where: { id: "demo-tao-hinh" },
      update: {},
      create: {
        id: "demo-tao-hinh",
        title: "Tạo hình",
        occurredAt: new Date("2026-11-01T08:00:00+07:00"),
        batchId: batch.id,
      },
    });
  });
}
seed()
  .catch(() => {
    console.error("Seed thất bại. Kiểm tra môi trường và migration.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
