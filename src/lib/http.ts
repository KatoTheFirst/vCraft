import { ZodError } from "zod";
export function json(
  code: number,
  message: string,
  data: unknown = null,
  headers?: HeadersInit,
) {
  return Response.json(
    { status: code < 400 ? "success" : "error", message, data },
    { status: code, headers },
  );
}
export function readResource<T>(load: () => Promise<T | null>) {
  return async () => {
    try {
      const record = await load();
      return record === null
        ? json(404, "Không tìm thấy dữ liệu.")
        : json(200, "Thành công", record);
    } catch (error) {
      if (error instanceof ZodError)
        return json(400, "Định dạng tham số không hợp lệ.");
      return json(500, "Không thể tải dữ liệu.");
    }
  };
}
export function methodDenied() {
  return json(405, "Phương thức không được hỗ trợ.", null, {
    Allow: "GET, HEAD, OPTIONS",
  });
}
