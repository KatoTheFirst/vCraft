import { endpoint, input } from "@/lib/endpoint";
import { json } from "@/lib/http";
import { login, logout, register } from "@/services/auth";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  return endpoint(req, async () => {
    switch ((await params).action) {
      case "login":
        return json(200, "Đã đăng nhập.", await login(await input(req)));
      case "register":
        return json(201, "Đã tạo tài khoản.", await register(await input(req)));
      case "logout":
        await logout();
        return json(200, "Đã đăng xuất.");
      default:
        return json(404, "Không tìm thấy endpoint.");
    }
  });
}
