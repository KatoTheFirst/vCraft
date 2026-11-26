import { db } from "@/lib/db";
import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { addLog } from "@/services/production";
import { workshopId } from "@/services/workshop";
import { batchCode } from "@/validations/production";
export function POST(
  req: Request,
  ctx: RouteContext<"/api/v1/batches/[code]/logs">,
) {
  return endpoint(req, async () => {
    const artisanId = await workshopId(true);
    const code = batchCode.parse((await ctx.params).code);
    return json(
      201,
      "Đã thêm mốc chế tác.",
      await addLog(db, artisanId, code, await input(req)),
    );
  });
}
