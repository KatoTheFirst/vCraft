import {
  Prisma,
  type PrismaClient,
  type Role,
  type Approval,
} from "@prisma/client";
import { Problem } from "../lib/endpoint";
import { authorize } from "../lib/policy";
import { command, draft } from "../validations/quotation";
type Actor = {
  id: string;
  role: Role;
  profile: { id: string; approval: Approval } | null;
} | null;
const conflict = (message: string) => new Problem(409, message);
function participant(user: Actor) {
  return authorize(user, user?.role === "ARTISAN" ? "ARTISAN" : "BUYER", true);
}
export async function listQuotes(
  client: PrismaClient,
  user: Actor,
  page: number,
) {
  const actor = participant(user);
  const scope =
    actor.role === "ARTISAN" ? { artisanId: actor.profile!.id } : undefined;
  const rows = await client.quoteRequest.findMany({
    where: scope ? { recipients: { some: scope } } : { buyerId: actor.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 10,
    take: 11,
    select: {
      id: true,
      description: true,
      category: true,
      quantity: true,
      budget: true,
      deadline: true,
      state: true,
      version: true,
      recipients: {
        where: scope,
        orderBy: { artisanId: "asc" },
        select: {
          artisan: { select: { name: true } },
          bid: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              completionDate: true,
              acceptedQuantity: true,
              deliveredQuantity: true,
            },
          },
        },
      },
    },
  });
  return {
    hasNext: rows.length > 10,
    items: rows
      .slice(0, 10)
      .map((r) => ({
        ...r,
        budget: r.budget?.toString() ?? null,
        deadline: r.deadline.toISOString(),
        recipients: r.recipients.map(({ artisan, bid }) => ({
          name: artisan.name,
          bid: bid && {
            ...bid,
            unitPrice: bid.unitPrice.toString(),
            completionDate: bid.completionDate.toISOString(),
          },
        })),
      })),
  };
}
export async function createQuote(
  client: PrismaClient,
  user: Actor,
  raw: unknown,
) {
  const buyer = authorize(user, "BUYER");
  const data = draft.parse(raw);
  return client.quoteRequest.create({
    data: { ...data, buyerId: buyer.id },
    select: { id: true, state: true, version: true },
  });
}
export async function changeQuote(
  client: PrismaClient,
  user: Actor,
  id: string,
  raw: unknown,
) {
  const actor = participant(user);
  const cmd = command.parse(raw);
  const buyerAction = ["edit", "send", "accept"].includes(cmd.action);
  authorize(actor, buyerAction ? "BUYER" : "ARTISAN", !buyerAction);
  return client.$transaction(async (tx) => {
    // All writers acquire the same order lock before inspecting bids or state.
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "QuoteRequest" WHERE id=${id} FOR UPDATE`,
    );
    const q = await tx.quoteRequest.findUnique({ where: { id } });
    if (!q || (buyerAction && q.buyerId !== actor.id))
      throw new Problem(404, "Không tìm thấy yêu cầu.");
    const artisanId = actor.profile?.id;
    if (!buyerAction) {
      const invite = await tx.quoteRecipient.findFirst({
        where: {
          requestId: id,
          artisanId,
          artisan: { approval: "APPROVED", userId: actor.id },
        },
      });
      if (!invite)
        throw new Problem(403, "Xưởng chưa được mời hoặc chưa được duyệt.");
    }
    if (q.version !== cmd.version)
      throw conflict("Yêu cầu đã thay đổi. Hãy tải lại để xem báo giá mới.");
    let state = q.state;
    switch (cmd.action) {
      case "edit": {
        if (state !== "DRAFT_REQUEST")
          throw conflict("Chỉ có thể sửa bản nháp.");
        await tx.quoteRequest.update({
          where: { id },
          data: draft.parse({
            description: cmd.description,
            category: cmd.category,
            quantity: cmd.quantity,
            budget: cmd.budget,
            deadline: cmd.deadline.toISOString(),
          }),
        });
        break;
      }
      case "send": {
        if (
          state !== "DRAFT_REQUEST" ||
          q.deadline <= new Date() ||
          !q.category
        )
          throw conflict("Bản nháp cần phân loại và hạn giao còn hiệu lực.");
        const matches = await tx.artisanProfile.findMany({
          where: {
            approval: "APPROVED",
            user: { role: "ARTISAN" },
            products: {
              some: {
                published: true,
                category: { equals: q.category, mode: "insensitive" },
              },
            },
          },
          select: { id: true },
        });
        if (!matches.length)
          throw conflict("Chưa có xưởng phù hợp với phân loại này.");
        await tx.quoteRecipient.createMany({
          data: matches.map((a) => ({ requestId: id, artisanId: a.id })),
        });
        state = "SENT_TO_ARTISANS";
        break;
      }
      case "bid": {
        if (state !== "SENT_TO_ARTISANS" && state !== "ARTISANS_BIDDING")
          throw conflict("Yêu cầu đã đóng chào giá.");
        if (
          cmd.quantity > q.quantity ||
          cmd.completionDate <= new Date() ||
          cmd.completionDate > q.deadline
        )
          throw new Problem(
            400,
            "Kiểm tra năng lực và ngày hoàn thành so với yêu cầu.",
          );
        const key = { requestId: id, artisanId: artisanId! };
        const terms = {
          quantity: cmd.quantity,
          unitPrice: cmd.unitPrice,
          completionDate: cmd.completionDate,
        };
        await tx.quoteBid.upsert({
          where: { requestId_artisanId: key },
          create: { ...key, ...terms },
          update: terms,
        });
        state = "ARTISANS_BIDDING";
        break;
      }
      case "accept": {
        if (state !== "ARTISANS_BIDDING")
          throw conflict("Yêu cầu chưa mở hoặc đã chốt.");
        const bid = await tx.quoteBid.findFirst({
          where: {
            id: cmd.bidId,
            requestId: id,
            artisan: { approval: "APPROVED" },
          },
        });
        if (
          !bid ||
          bid.quantity < q.quantity ||
          bid.completionDate <= new Date()
        )
          throw conflict("Báo giá phải còn hiệu lực và đủ số lượng.");
        await tx.quoteBid.update({
          where: { id: bid.id },
          data: { acceptedQuantity: q.quantity },
        });
        state = "BUYER_ACCEPTED";
        break;
      }
      case "start":
      case "deliver": {
        const bid = await tx.quoteBid.findFirst({
          where: { requestId: id, artisanId, acceptedQuantity: { gt: 0 } },
        });
        if (!bid)
          throw new Problem(
            403,
            "Chỉ xưởng được chọn có thể cập nhật tiến độ.",
          );
        if (cmd.action === "start") {
          if (state !== "BUYER_ACCEPTED")
            throw conflict("Đơn chưa sẵn sàng sản xuất.");
          state = "IN_PRODUCTION";
        } else {
          if (
            state !== "IN_PRODUCTION" ||
            bid.deliveredQuantity === bid.acceptedQuantity
          )
            throw conflict("Đơn chưa sẵn sàng giao.");
          await tx.quoteBid.update({
            where: { id: bid.id },
            data: {
              producedQuantity: bid.acceptedQuantity,
              deliveredQuantity: bid.acceptedQuantity,
            },
          });
          const remaining = await tx.quoteBid.count({
            where: {
              requestId: id,
              acceptedQuantity: { gt: 0 },
              deliveredQuantity: { lt: tx.quoteBid.fields.acceptedQuantity },
            },
          });
          if (!remaining) state = "DELIVERED";
        }
        break;
      }
    }
    return tx.quoteRequest.update({
      where: { id },
      data: { state, version: { increment: 1 } },
      select: { id: true, state: true, version: true },
    });
  });
}
