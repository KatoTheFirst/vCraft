import { db } from "@/lib/db";
import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { updateLog } from "@/services/production";
import { workshopId } from "@/services/workshop";
import { batchCode } from "@/validations/production";
export function PUT(
  req: Request,
  ctx: RouteContext<"/api/v1/batches/[code]/logs/[id]">,
) {
  return endpoint(req, async () => {
    const artisanId = await workshopId(true);
    const params = await ctx.params;
    const code = batchCode.parse(params.code);
    return json(
      200,
      "Đã cập nhật mốc chế tác.",
      await updateLog(db, artisanId, code, params.id, await input(req)),
    );
  });
}
