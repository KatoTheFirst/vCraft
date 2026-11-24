import { ZodError } from "zod";
import { json } from "./http";
export class Problem extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}
export async function endpoint(req: Request, action: () => Promise<Response>) {
  try {
    const origin = req.headers.get("origin");
    if (req.method !== "GET" && origin && origin !== new URL(req.url).origin)
      throw new Problem(403, "Nguồn yêu cầu không hợp lệ.");
    return await action();
  } catch (e) {
    if (e instanceof Problem) return json(e.code, e.message);
    if (e instanceof ZodError)
      return json(400, e.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
    return json(500, "Không thể hoàn tất yêu cầu.");
  }
}
export async function boundedBody(req: Request, max: number) {
  if (Number(req.headers.get("content-length")) > max)
    throw new Problem(413, "Dữ liệu quá lớn.");
  const reader = req.body?.getReader();
  if (!reader) throw new Problem(400, "Thiếu dữ liệu.");
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new Problem(413, "Dữ liệu quá lớn.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
export async function input(req: Request) {
  if (req.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new Problem(415, "Yêu cầu JSON.");
  const bytes = await boundedBody(req, 32768);
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new Problem(400, "JSON không hợp lệ.");
  }
}
