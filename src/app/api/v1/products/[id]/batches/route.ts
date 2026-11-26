import { db } from "@/lib/db";
import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { createBatch } from "@/services/production";
import { workshopId } from "@/services/workshop";
export function POST(
  req: Request,
  ctx: RouteContext<"/api/v1/products/[id]/batches">,
) {
  return endpoint(req, async () => {
    const artisanId = await workshopId(true);
    const { id } = await ctx.params;
    return json(
      201,
      "Đã tạo lô sản xuất.",
      await createBatch(db, artisanId, id, await input(req)),
    );
  });
}
