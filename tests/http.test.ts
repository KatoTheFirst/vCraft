import test from "node:test";
import assert from "node:assert/strict";
import { readResource } from "../src/lib/http";
test("internal errors are redacted", async () => {
  const response = await readResource(async () => {
    throw new Error("private");
  })();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    status: "error",
    message: "Không thể tải dữ liệu.",
    data: null,
  });
});
