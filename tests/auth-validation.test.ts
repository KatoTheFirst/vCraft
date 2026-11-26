import test from "node:test";
import assert from "node:assert/strict";
import { credentials, registration } from "../src/validations/auth";
const account = {
  name: "Nghệ nhân",
  email: "a@example.test",
  phone: "0912345678",
  password: "matkhau12345",
  role: "BUYER",
};
test("email is trimmed and lowercased before validation", () => {
  assert.equal(
    credentials.parse({ email: "  A@Example.TEST ", password: "x" }).email,
    "a@example.test",
  );
  assert.equal(
    registration.parse({ ...account, email: "\tB@Example.test\n" }).email,
    "b@example.test",
  );
  assert.throws(() => credentials.parse({ email: "not-an-email", password: "x" }));
});
test("registration enforces phone, password strength and allowed roles", () => {
  assert.ok(registration.parse(account));
  for (const bad of [
    { phone: "12345" },
    { password: "short1" },
    { password: "khongcoso!!" },
    { password: "1234567890" },
    { password: "a1" + "ă".repeat(40) },
    { role: "ADMIN" },
    { extra: true },
  ])
    assert.throws(() => registration.parse({ ...account, ...bad }));
});
