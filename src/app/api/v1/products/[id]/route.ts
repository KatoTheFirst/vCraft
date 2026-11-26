import { db } from "@/lib/db";
import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { updateProduct } from "@/services/production";
import { workshopId } from "@/services/workshop";
export function PUT(req: Request, ctx: RouteContext<"/api/v1/products/[id]">) {
  return endpoint(req, async () => {
    const artisanId = await workshopId(true);
    const { id } = await ctx.params;
    return json(
      200,
      "Đã lưu sản phẩm.",
      await updateProduct(db, artisanId, id, await input(req)),
    );
  });
}
