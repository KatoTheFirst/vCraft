import type { Approval, Prisma, PrismaClient, Role } from "@prisma/client";
import { Problem } from "@/lib/endpoint";
import { authorize } from "@/lib/policy";
import { listQuery, review, transitions } from "@/validations/moderation";
type Client = Pick<PrismaClient, "artisanProfile">;
type Viewer = {
  id: string;
  role: Role;
  profile: { approval: Approval } | null;
} | null;
export const PAGE_SIZE = 20;
// Only workshops owned by artisan accounts are moderated; admin accounts never.
const artisans = {
  user: { role: "ARTISAN" },
} satisfies Prisma.ArtisanProfileWhereInput;
const row = {
  id: true,
  slug: true,
  name: true,
  approval: true,
  version: true,
  createdAt: true,
  reviewedAt: true,
  reviewNote: true,
  certificates: true,
  user: { select: { name: true, email: true, phone: true } },
  reviewedBy: { select: { name: true } },
} satisfies Prisma.ArtisanProfileSelect;
const label: Record<Approval, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  SUSPENDED: "Đã khóa",
};
export async function listWorkshops(
  client: Client,
  viewer: Viewer,
  raw: Record<string, unknown>,
) {
  authorize(viewer, "ADMIN");
  const { status, q, page } = listQuery.parse(raw);
  const search = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { user: { email: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};
  const rows = await client.artisanProfile.findMany({
    where: { ...artisans, approval: status, ...search },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: row,
  });
  return {
    status,
    q,
    page,
    hasNext: rows.length > PAGE_SIZE,
    items: rows.slice(0, PAGE_SIZE),
  };
}
export async function workshopForReview(
  client: Client,
  viewer: Viewer,
  id: string,
) {
  authorize(viewer, "ADMIN");
  const found = await client.artisanProfile.findFirst({
    where: { id, ...artisans },
    select: {
      ...row,
      story: true,
      familyHistory: true,
      latitude: true,
      longitude: true,
      isOpen: true,
      images: true,
      village: { select: { name: true } },
    },
  });
  if (!found) throw new Problem(404, "Không tìm thấy hồ sơ xưởng.");
  return found;
}
// Conditional update: the row must still have the status and version the
// admin was looking at, so a concurrent artisan edit or admin decision wins
// and this one answers 409 instead of overwriting it.
export async function reviewWorkshop(
  client: Client,
  viewer: Viewer,
  id: string,
  raw: unknown,
) {
  const admin = authorize(viewer, "ADMIN");
  const cmd = review.parse(raw);
  const current = await client.artisanProfile.findFirst({
    where: { id, ...artisans },
    select: { approval: true, version: true },
  });
  if (!current) throw new Problem(404, "Không tìm thấy hồ sơ xưởng.");
  if (!transitions[current.approval].includes(cmd.approval))
    throw new Problem(
      409,
      `Không thể chuyển hồ sơ từ "${label[current.approval]}" sang "${label[cmd.approval]}".`,
    );
  const { count } = await client.artisanProfile.updateMany({
    where: {
      id,
      ...artisans,
      approval: current.approval,
      version: cmd.version,
    },
    data: {
      approval: cmd.approval,
      reviewNote: cmd.reviewNote || null,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      version: { increment: 1 },
    },
  });
  if (!count)
    throw new Problem(
      409,
      "Hồ sơ vừa được cập nhật. Vui lòng tải lại để xem bản mới trước khi duyệt.",
    );
  return client.artisanProfile.findUniqueOrThrow({
    where: { id },
    select: row,
  });
}
