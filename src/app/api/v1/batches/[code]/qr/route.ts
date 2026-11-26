import { z } from "zod";
import { db } from "@/lib/db";
import { endpoint } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { issueQr, issuedBatch } from "@/services/production";
import { qrFormats, qrImage, traceUrl } from "@/services/qr";
import { workshopId } from "@/services/workshop";
import { batchCode } from "@/validations/production";
type Context = RouteContext<"/api/v1/batches/[code]/qr">;
// Download the printable QR image (owner only).
export function GET(req: Request, ctx: Context) {
  return endpoint(req, async () => {
    const artisanId = await workshopId(true);
    const code = batchCode.parse((await ctx.params).code);
    const format = z
      .enum(qrFormats)
      .parse(new URL(req.url).searchParams.get("format") ?? "png");
    await issuedBatch(db, artisanId, code);
    const image = await qrImage(code, format);
    return new Response(
      typeof image === "string" ? image : new Uint8Array(image),
      {
        headers: {
          "content-type": format === "svg" ? "image/svg+xml" : "image/png",
          "content-disposition": `attachment; filename="qr-${code}.${format}"`,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
        },
      },
    );
  });
}
// Issue the QR for batches created before codes were issued automatically.
export function POST(req: Request, ctx: Context) {
  return endpoint(req, async () => {
    const artisanId = await workshopId(true);
    const code = batchCode.parse((await ctx.params).code);
    const qrIssuedAt = await issueQr(db, artisanId, code);
    return json(200, "Đã phát hành mã QR.", {
      code,
      qrIssuedAt,
      traceUrl: traceUrl(code),
    });
  });
}
