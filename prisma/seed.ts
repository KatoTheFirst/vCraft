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
    const buyer = await tx.user.findUniqueOrThrow({
      where: { email: "buyer@example.test" },
    });
    const admin = await tx.user.findUniqueOrThrow({
      where: { email: "admin@example.test" },
    });
    const request = await tx.quoteRequest.upsert({
      where: { id: "demo-don-coc-men-lam" },
      update: {},
      create: {
        id: "demo-don-coc-men-lam",
        buyerId: buyer.id,
        description: "500 cốc men lam in logo, giao theo lô.",
        quantity: 500,
        budget: 40000000,
        category: "Cốc",
        deadline: new Date("2027-02-01T00:00:00+07:00"),
        state: "ARTISANS_BIDDING",
      },
    });
    const invitation = { requestId: request.id, artisanId: artisan.id };
    await tx.quoteRecipient.upsert({
      where: { requestId_artisanId: invitation },
      update: {},
      create: invitation,
    });
    await tx.quoteBid.upsert({
      where: { requestId_artisanId: invitation },
      update: {},
      create: {
        ...invitation,
        quantity: 500,
        unitPrice: 75000,
        completionDate: new Date("2027-01-28T00:00:00+07:00"),
      },
    });
    const secondOwner = await tx.user.upsert({
      where: { email: "artisan2@example.test" },
      update: {},
      create: {
        email: "artisan2@example.test",
        role: "ARTISAN",
        name: "Nghệ nhân xưởng men ngọc (demo)",
        passwordHash,
      },
    });
    const second = await tx.artisanProfile.upsert({
      where: { userId: secondOwner.id },
      update: {},
      create: {
        userId: secondOwner.id,
        villageId: village.id,
        name: "Xưởng men ngọc (minh họa)",
        slug: "xuong-men-ngoc-demo",
        approval: "APPROVED",
        isOpen: true,
        latitude: 20.978,
        longitude: 105.913,
        story: "Xưởng minh họa cho bản đồ và phân bổ đơn sỉ.",
      },
    });
    const secondInvitation = { requestId: request.id, artisanId: second.id };
    await tx.quoteRecipient.upsert({
      where: { requestId_artisanId: secondInvitation },
      update: {},
      create: secondInvitation,
    });
    await tx.quoteBid.upsert({
      where: { requestId_artisanId: secondInvitation },
      update: {},
      create: {
        ...secondInvitation,
        quantity: 200,
        unitPrice: 74000,
        completionDate: new Date("2027-01-30T00:00:00+07:00"),
      },
    });
    await tx.communityNews.upsert({
      where: { id: "demo-thong-bao-trien-lam" },
      update: {},
      create: {
        id: "demo-thong-bao-trien-lam",
        authorId: admin.id,
        title: "Thông báo triển lãm gốm (minh họa)",
        content:
          "Các xưởng chuẩn bị sản phẩm và nhật ký lô cho buổi giới thiệu nghề gốm.",
        pinned: true,
        publishedAt: new Date("2026-11-24T08:00:00+07:00"),
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
