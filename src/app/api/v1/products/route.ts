import { db } from "@/lib/db";
import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { createProduct } from "@/services/production";
import { workshopId } from "@/services/workshop";
export function POST(req: Request) {
  return endpoint(req, async () => {
    const artisanId = await workshopId(true);
    return json(
      201,
      "Đã tạo sản phẩm.",
      await createProduct(db, artisanId, await input(req)),
    );
  });
}
