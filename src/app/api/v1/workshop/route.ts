import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { workshopId, ownProfile, saveProfile } from "@/services/workshop";
export function GET(req: Request) {
  return endpoint(req, async () =>
    json(200, "Thành công", await ownProfile(await workshopId())),
  );
}
export function PUT(req: Request) {
  return endpoint(req, async () =>
    json(
      200,
      "Đã lưu hồ sơ.",
      await saveProfile(await workshopId(), await input(req)),
    ),
  );
}
