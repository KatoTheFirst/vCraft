import "server-only";
import { PrismaClient } from "@prisma/client";
const runtime = globalThis as typeof globalThis & { db?: PrismaClient };
// Reuse one connection pool during Next.js hot reloads.
export const db = runtime.db ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") runtime.db = db;
