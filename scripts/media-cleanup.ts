// Usage: npm run media:cleanup -- [--days 7] [--apply]
// Without --apply it only lists unused images (dry run).
import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { cleanupMedia } from "../src/services/media-cleanup";
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const daysArg = args.indexOf("--days");
const days = daysArg >= 0 ? Number(args[daysArg + 1]) : 7;
if (!Number.isFinite(days) || days < 0)
  throw new Error("--days phải là số ≥ 0");
// Same storage rule as src/services/media.ts.
const configured = process.env.MEDIA_STORAGE_DIR;
if (
  configured
    ? !path.isAbsolute(configured)
    : process.env.NODE_ENV === "production"
)
  throw new Error("MEDIA_STORAGE_DIR phải là đường dẫn tuyệt đối");
const dir = configured || path.resolve(".vcraft-media");
async function main() {
  const client = new PrismaClient();
  try {
    const { unused, deleted } = await cleanupMedia({
      client,
      dir,
      days,
      apply,
    });
    for (const u of unused)
      console.log(
        `${deleted.includes(u.id) ? "ĐÃ XÓA" : "không dùng"}  ${u.id}  sửa lần cuối ${u.modified.toISOString()}`,
      );
    console.log(
      apply
        ? `Đã xóa ${deleted.length}/${unused.length} ảnh không dùng quá ${days} ngày trong ${dir}.`
        : `Chạy thử: ${unused.length} ảnh không dùng quá ${days} ngày trong ${dir}. Thêm --apply để xóa.`,
    );
  } finally {
    await client.$disconnect();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
