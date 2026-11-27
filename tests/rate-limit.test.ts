import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Problem } from "../src/lib/endpoint";
import { attemptKey, throttle, WINDOW_MS } from "../src/services/rate-limit";
// The formula auth.ts used before the limiter was shared.
function legacyKey(action: string, email: string, now: number) {
  const window = 15 * 60 * 1000;
  const bucket = Math.floor(now / window);
  return {
    key: createHash("sha256")
      .update([action, email, bucket].join("|"))
      .digest("hex"),
    expiresAt: new Date((bucket + 1) * window),
  };
}
function counter() {
  const counts = new Map<string, number>();
  return {
    counts,
    client: {
      authAttempt: {
        deleteMany: async () => ({ count: 0 }),
        upsert: async ({ where }: { where: { key: string } }) => {
          const count = (counts.get(where.key) ?? 0) + 1;
          counts.set(where.key, count);
          return { key: where.key, count };
        },
      },
    } as never,
  };
}
const tooMany = (e: unknown) => e instanceof Problem && e.code === 429;
test("login and register keys are byte-for-byte the old ones", () => {
  const now = Date.UTC(2026, 10, 27, 8, 3);
  for (const action of ["login", "register"])
    assert.deepEqual(
      attemptKey(action, "a@example.test", now),
      legacyKey(action, "a@example.test", now),
    );
  assert.equal(WINDOW_MS, 15 * 60 * 1000);
  assert.notEqual(
    attemptKey("upload", "w1", now).key,
    attemptKey("login", "w1", now).key,
  );
});
test("default limit stays 10 attempts per window with the same message", async () => {
  const { client } = counter();
  for (let i = 0; i < 10; i++)
    await throttle(client, "login", "a@example.test");
  await assert.rejects(
    throttle(client, "login", "a@example.test"),
    (e) =>
      tooMany(e) && (e as Error).message === "Vui lòng thử lại sau 15 phút.",
  );
  // Another email and another action keep their own counters.
  await throttle(client, "login", "b@example.test");
  await throttle(client, "register", "a@example.test");
});
test("uploads allow 20 requests per workshop, the 21st answers 429", async () => {
  const { client } = counter();
  for (let i = 0; i < 20; i++)
    await throttle(client, "upload", "w1", 20, "Quá nhiều");
  await assert.rejects(
    throttle(client, "upload", "w1", 20, "Quá nhiều"),
    tooMany,
  );
  await throttle(client, "upload", "w2", 20, "Quá nhiều");
});
