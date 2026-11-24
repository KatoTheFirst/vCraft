import { z } from "zod";
import { json, methodDenied, readResource } from "@/lib/http";
import { publicArtisan, publicBatch, villages } from "@/services/catalog";
const slug = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const code = z
  .string()
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const path = (await params).path ?? [];
  if (path.length !== 2) return json(404, "Không tìm thấy endpoint.");
  const [resource, key] = path;
  if (new URL(request.url).search)
    return json(400, "Endpoint không nhận query.");
  switch (resource) {
    case "villages":
      return readResource(() => villages.find(slug.parse(key)))();
    case "artisans":
      return readResource(() => publicArtisan(slug.parse(key)))();
    case "batches":
      return readResource(() => publicBatch(code.parse(key)))();
    default:
      return json(404, "Không tìm thấy endpoint.");
  }
}
export {
  methodDenied as POST,
  methodDenied as PUT,
  methodDenied as PATCH,
  methodDenied as DELETE,
};
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { Allow: "GET, HEAD, OPTIONS" },
  });
}
