import { endpoint, boundedBody, Problem } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { ImageUploadService, purposes } from "@/services/media";
import { workshopId } from "@/services/workshop";
import { z } from "zod";
export function POST(req: Request) {
  return endpoint(req, async () => {
    const id = await workshopId();
    const type = req.headers.get("content-type") ?? "";
    if (!type.startsWith("multipart/form-data;"))
      throw new Problem(415, "Yêu cầu multipart/form-data.");
    const bytes = await boundedBody(req, 30 * 1024 * 1024 + 65536);
    let form: FormData;
    try {
      form = await new Response(new Uint8Array(bytes), {
        headers: { "Content-Type": type },
      }).formData();
    } catch {
      throw new Problem(400, "Dữ liệu multipart không hợp lệ.");
    }
    const purpose = z.enum(purposes).parse(form.get("purpose"));
    if (purpose === "product" || purpose === "production-log")
      await workshopId(true);
    const files = form.getAll("files");
    if (!files.every((file): file is File => file instanceof File))
      throw new Problem(400, "Thiếu tệp ảnh.");
    return json(
      201,
      "Đã xử lý ảnh.",
      await new ImageUploadService().upload(id, purpose, files),
    );
  });
}
