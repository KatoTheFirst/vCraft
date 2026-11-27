import { db } from "@/lib/db";
import { endpoint } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { currentUser } from "@/services/auth";
import { listWorkshops } from "@/services/moderation";
export function GET(req: Request) {
  return endpoint(req, async () =>
    json(
      200,
      "Thành công",
      await listWorkshops(
        db,
        await currentUser(),
        Object.fromEntries(new URL(req.url).searchParams),
      ),
    ),
  );
}
