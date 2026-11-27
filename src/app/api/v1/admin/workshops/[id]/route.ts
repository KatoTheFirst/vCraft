import { db } from "@/lib/db";
import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { currentUser } from "@/services/auth";
import { reviewWorkshop, workshopForReview } from "@/services/moderation";
type Context = RouteContext<"/api/v1/admin/workshops/[id]">;
export function GET(req: Request, ctx: Context) {
  return endpoint(req, async () =>
    json(
      200,
      "Thành công",
      await workshopForReview(db, await currentUser(), (await ctx.params).id),
    ),
  );
}
// Approve, reject, suspend or reinstate a workshop (see docs/api.md).
export function PATCH(req: Request, ctx: Context) {
  return endpoint(req, async () => {
    const user = await currentUser();
    const { id } = await ctx.params;
    return json(
      200,
      "Đã cập nhật trạng thái.",
      await reviewWorkshop(db, user, id, await input(req)),
    );
  });
}
