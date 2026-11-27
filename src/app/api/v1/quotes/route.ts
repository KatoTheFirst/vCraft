import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { db } from "@/lib/db";
import { currentUser } from "@/services/auth";
import { createQuote, listQuotes } from "@/services/quotations";
import { pageNumber } from "@/validations/quotation";
export function GET(req: Request) {
  return endpoint(req, async () =>
    json(
      200,
      "Thành công",
      await listQuotes(
        db,
        await currentUser(),
        pageNumber.parse(new URL(req.url).searchParams.get("page") ?? 1),
      ),
    ),
  );
}
export function POST(req: Request) {
  return endpoint(req, async () =>
    json(
      201,
      "Đã lưu bản nháp.",
      await createQuote(db, await currentUser(), await input(req)),
    ),
  );
}
