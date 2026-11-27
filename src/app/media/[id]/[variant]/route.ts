import { currentUser } from "@/services/auth";
import { mediaBytes } from "@/services/media";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
) {
  const { id, variant } = await params;
  const user = await currentUser();
  const bytes = await mediaBytes(id, variant, user?.id, user?.role === "ADMIN");
  if (!bytes)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/webp",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
