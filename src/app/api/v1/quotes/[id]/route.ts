import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { db } from "@/lib/db";
import { currentUser } from "@/services/auth";
import { changeQuote } from "@/services/quotations";
export function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(req, async () =>
    json(
      200,
      "Đã cập nhật.",
      await changeQuote(
        db,
        await currentUser(),
        (await params).id,
        await input(req),
      ),
    ),
  );
}
