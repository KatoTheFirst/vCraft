import type { Prisma } from "@prisma/client";
import { Problem } from "@/lib/endpoint";
import type { Purpose } from "./media";
type Client = Pick<Prisma.TransactionClient, "mediaAsset">;
// Only images uploaded by this workshop for this purpose may be attached.
export async function assertOwnMedia(
  client: Client,
  artisanId: string,
  purpose: Purpose,
  urls: string[],
) {
  const ids = [
    ...new Set(
      urls.map((url) => /^\/media\/([a-f0-9-]{36})\/web$/.exec(url)?.[1]),
    ),
  ];
  if (!ids.length) return;
  const found = ids.every(Boolean)
    ? await client.mediaAsset.count({
        where: { artisanId, purpose, id: { in: ids as string[] } },
      })
    : -1;
  if (found !== ids.length)
    throw new Problem(400, "Ảnh không thuộc xưởng hoặc sai mục đích.");
}
