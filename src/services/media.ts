import "server-only";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import type { Approval, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Problem } from "@/lib/endpoint";
import { throttle } from "./rate-limit";
export const purposes = [
  "workshop",
  "certificate",
  "product",
  "production-log",
] as const;
export type Purpose = (typeof purposes)[number];
const formats: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
// Per-workshop limits (Đ-1). Pending workshops still get room for workshop
// photos and certificates, which they need in order to be approved.
export const UPLOAD_REQUESTS_PER_15_MIN = 20;
export const MEDIA_QUOTA_PENDING = 30;
export const MEDIA_QUOTA_APPROVED = 600;
const quota = (approval: Approval) =>
  approval === "APPROVED" ? MEDIA_QUOTA_APPROVED : MEDIA_QUOTA_PENDING;
// 409: the request is valid, but conflicts with what the workshop already stores.
function overQuota(approval: Approval, used: number, adding: number) {
  const max = quota(approval);
  if (used + adding <= max) return;
  const left = Math.max(0, max - used);
  throw new Problem(
    409,
    `Xưởng đã lưu ${used}/${max} ảnh, ` +
      (left
        ? `chỉ còn tải thêm được ${left} ảnh. Hãy chọn ít ảnh hơn.`
        : "đã hết hạn mức ảnh.") +
      (approval === "APPROVED"
        ? " Liên hệ Ban quản lý nếu cần thêm."
        : ` Sau khi xưởng được duyệt, hạn mức tăng lên ${MEDIA_QUOTA_APPROVED} ảnh.`),
  );
}
// Cheap checks before the request body (up to 30 MiB) is read.
export async function admitUpload(artisanId: string) {
  await throttle(
    db,
    "upload",
    artisanId,
    UPLOAD_REQUESTS_PER_15_MIN,
    "Bạn tải ảnh quá nhiều lần. Vui lòng thử lại sau 15 phút.",
  );
  const p = await db.artisanProfile.findUniqueOrThrow({
    where: { id: artisanId },
    select: { approval: true, _count: { select: { assets: true } } },
  });
  overQuota(p.approval, p._count.assets, 1);
}
// The binding check: lock the workshop row so concurrent uploads count in turn.
async function saveWithinQuota(rows: Prisma.MediaAssetCreateManyInput[]) {
  const artisanId = rows[0].artisanId;
  await db.$transaction(async (tx) => {
    const [p] = await tx.$queryRaw<{ approval: Approval }[]>`
      SELECT approval FROM "ArtisanProfile" WHERE id = ${artisanId} FOR UPDATE`;
    overQuota(
      p.approval,
      await tx.mediaAsset.count({ where: { artisanId } }),
      rows.length,
    );
    await tx.mediaAsset.createMany({ data: rows });
  });
}
function root() {
  const dir = process.env.MEDIA_STORAGE_DIR;
  if (dir && path.isAbsolute(dir)) return dir;
  if (process.env.NODE_ENV === "production" || dir)
    throw new Error("MEDIA_STORAGE_DIR");
  return path.resolve(".vcraft-media");
}
function filename(id: string, variant: string) {
  return path.join(root(), id + "-" + variant + ".webp");
}
export class ImageUploadService {
  async upload(artisanId: string, purpose: Purpose, files: File[]) {
    if (!files.length || files.length > 6)
      throw new Problem(400, "Chọn từ 1 đến 6 ảnh.");
    const written: string[] = [];
    const rows = [];
    try {
      await mkdir(root(), { recursive: true });
      for (const file of files) {
        if (!file.size || file.size > 5 * 1024 * 1024)
          throw new Problem(413, "Mỗi ảnh phải từ 1 byte đến 5 MiB.");
        const source = sharp(Buffer.from(await file.arrayBuffer()), {
          limitInputPixels: 24000000,
          failOn: "warning",
        });
        let web, thumb;
        try {
          const meta = await source.metadata();
          if (
            !meta.format ||
            formats[meta.format] !== file.type ||
            !formats[meta.format] ||
            (meta.pages ?? 1) > 1
          )
            throw new Error();
          web = await source
            .clone()
            .rotate()
            .resize({
              width: 1600,
              height: 1600,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toBuffer({ resolveWithObject: true });
          thumb = await source
            .rotate()
            .resize({
              width: 320,
              height: 320,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 72 })
            .toBuffer();
        } catch {
          throw new Problem(
            415,
            "Chỉ nhận ảnh JPEG, PNG hoặc WebP tĩnh hợp lệ, tối đa 24 megapixel.",
          );
        }
        const id = randomUUID();
        for (const [variant, bytes] of [
          ["web", web.data],
          ["thumb", thumb],
        ] as const) {
          const target = filename(id, variant);
          written.push(target);
          await writeFile(target, bytes, { flag: "wx" });
        }
        rows.push({
          id,
          artisanId,
          purpose,
          width: web.info.width,
          height: web.info.height,
          bytes: web.data.length,
        });
      }
      // Rejected here: the catch below removes the files already written.
      await saveWithinQuota(rows);
      return rows.map(({ id, width, height, bytes }) => ({
        id,
        width,
        height,
        bytes,
        url: "/media/" + id + "/web",
        thumbnailUrl: "/media/" + id + "/thumb",
      }));
    } catch (e) {
      await Promise.allSettled(written.map((p) => unlink(p)));
      throw e;
    }
  }
}
export async function mediaBytes(
  id: string,
  variant: string,
  ownerId?: string,
  isAdmin = false,
) {
  if (!/^[a-f0-9-]{36}$/.test(id) || !["thumb", "web"].includes(variant))
    return null;
  const asset = await db.mediaAsset.findUnique({
    where: { id },
    select: {
      artisanId: true,
      purpose: true,
      artisan: {
        select: {
          userId: true,
          approval: true,
          images: true,
          certificates: true,
        },
      },
    },
  });
  if (!asset) return null;
  const a = asset.artisan;
  const url = "/media/" + id + "/web";
  const onProfile = a.images.includes(url) || a.certificates.includes(url);
  // Admins review photos and certificates attached to any workshop profile (7.1).
  if (a.userId !== ownerId && !(isAdmin && onProfile)) {
    if (a.approval !== "APPROVED") return null;
    let published = onProfile;
    if (!published && asset.purpose === "product")
      published = !!(await db.product.findFirst({
        where: {
          artisanId: asset.artisanId,
          published: true,
          images: { has: url },
        },
        select: { id: true },
      }));
    if (!published && asset.purpose === "production-log")
      published = !!(await db.productionLog.findFirst({
        where: {
          images: { has: url },
          batch: { product: { artisanId: asset.artisanId, published: true } },
        },
        select: { id: true },
      }));
    if (!published) return null;
  }
  return readFile(filename(id, variant));
}
