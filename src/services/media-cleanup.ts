import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
type Client = Pick<
  PrismaClient,
  "artisanProfile" | "product" | "productionLog" | "mediaAsset"
>;
const FILE = /^([a-f0-9-]{36})-(web|thumb)\.webp$/;
const ID = /^\/media\/([a-f0-9-]{36})\/web$/;
// Every image field in the schema. Add new ones here when a module adds them.
// shortcut: loads every reference into memory, fine for one village; page it
// if the tables reach hundreds of thousands of rows.
export async function referencedIds(client: Client) {
  const [profiles, products, logs] = await Promise.all([
    client.artisanProfile.findMany({
      select: { images: true, certificates: true },
    }),
    client.product.findMany({ select: { images: true } }),
    client.productionLog.findMany({ select: { images: true } }),
  ]);
  const urls = [
    ...profiles.flatMap((p) => [...p.images, ...p.certificates]),
    ...products.flatMap((p) => p.images),
    ...logs.flatMap((l) => l.images),
  ];
  return new Set(urls.map((u) => ID.exec(u)?.[1]).filter(Boolean) as string[]);
}
// Age comes from file modification time: MediaAsset has no createdAt column.
export async function findUnused(
  client: Client,
  dir: string,
  days: number,
  now = Date.now(),
) {
  const groups = new Map<string, { files: string[]; newest: number }>();
  for (const name of await readdir(dir)) {
    const id = FILE.exec(name)?.[1];
    if (!id) continue;
    const file = path.join(dir, name);
    const g = groups.get(id) ?? { files: [], newest: 0 };
    g.files.push(file);
    g.newest = Math.max(g.newest, (await stat(file)).mtimeMs);
    groups.set(id, g);
  }
  const used = await referencedIds(client);
  const cutoff = now - days * 86_400_000;
  return [...groups]
    .filter(([id, g]) => !used.has(id) && g.newest <= cutoff)
    .map(([id, g]) => ({ id, files: g.files, modified: new Date(g.newest) }));
}
export async function cleanupMedia(options: {
  client: Client;
  dir: string;
  days: number;
  apply: boolean;
  now?: number;
}) {
  const { client, dir, days, apply, now } = options;
  const unused = await findUnused(client, dir, days, now);
  if (!apply || !unused.length) return { unused, deleted: [] as string[] };
  // Re-read references just before deleting, so an image attached since the
  // scan is kept.
  const used = await referencedIds(client);
  const deleted: string[] = [];
  for (const item of unused.filter((u) => !used.has(u.id))) {
    // Row first: once it is gone the image can no longer be attached.
    await client.mediaAsset.deleteMany({ where: { id: item.id } });
    await Promise.all(item.files.map((f) => unlink(f)));
    deleted.push(item.id);
  }
  return { unused, deleted };
}
