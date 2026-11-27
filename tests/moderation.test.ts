import test from "node:test";
import assert from "node:assert/strict";
import type { Approval, Role } from "@prisma/client";
import { Problem } from "../src/lib/endpoint";
import { review, transitions } from "../src/validations/moderation";
import {
  OPEN_ORDER_STATES,
  listWorkshops,
  reviewWorkshop,
  workshopForReview,
} from "../src/services/moderation";
const status = (code: number) => (e: unknown) =>
  e instanceof Problem && e.code === code;
const admin = { id: "admin-1", role: "ADMIN" as Role, profile: null };
const as = (role: Role, approval: Approval = "APPROVED") => ({
  id: "u-" + role,
  role,
  profile: role === "ARTISAN" ? { approval } : null,
});
// One workshop row; updateMany applies the same conditions PostgreSQL would.
function fakeDb(row: { approval: Approval; version: number; role?: Role }) {
  const updates: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }[] = [];
  const state = { ...row, role: row.role ?? "ARTISAN" };
  const matches = (where: { id?: string; user?: { role: Role } }) =>
    where.id === "w1" && (!where.user || where.user.role === state.role);
  const groupCalls: unknown[] = [];
  const client = {
    quoteBid: {
      groupBy: async (args: unknown) => (
        groupCalls.push(args),
        [{ artisanId: "w1", _count: { _all: 2 } }]
      ),
    },
    artisanProfile: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; user: { role: Role } };
      }) =>
        matches(where)
          ? { id: "w1", approval: state.approval, version: state.version }
          : null,
      findMany: async (args: unknown) => (updates.push(args as never), []),
      findUniqueOrThrow: async () => ({ id: "w1", ...state }),
      updateMany: async (args: {
        where: {
          id: string;
          user: { role: Role };
          approval: Approval;
          version: number;
        };
        data: { approval: Approval };
      }) => {
        updates.push(args as never);
        const ok =
          matches(args.where) &&
          args.where.approval === state.approval &&
          args.where.version === state.version;
        if (ok)
          Object.assign(state, {
            approval: args.data.approval,
            version: state.version + 1,
          });
        return { count: ok ? 1 : 0 };
      },
    },
  };
  return { client: client as never, updates, state, groupCalls };
}
test("transition table is exactly the agreed one", () => {
  assert.deepEqual(transitions, {
    PENDING: ["APPROVED", "REJECTED"],
    APPROVED: ["SUSPENDED"],
    SUSPENDED: ["APPROVED"],
    REJECTED: [],
  });
});
test("rejecting or suspending requires a reason; approving does not", () => {
  assert.ok(review.parse({ approval: "APPROVED", version: 0 }));
  for (const approval of ["REJECTED", "SUSPENDED"] as const) {
    assert.throws(() => review.parse({ approval, version: 0 }));
    assert.throws(() =>
      review.parse({ approval, version: 0, reviewNote: "   " }),
    );
    assert.ok(
      review.parse({ approval, version: 0, reviewNote: "Hồ sơ giả mạo" }),
    );
  }
  assert.throws(() => review.parse({ approval: "PENDING", version: 0 }));
  assert.throws(() =>
    review.parse({ approval: "APPROVED", version: 0, role: "ADMIN" }),
  );
});
test("every allowed move succeeds and records reviewer, time and version", async () => {
  for (const [from, targets] of Object.entries(transitions) as [
    Approval,
    Approval[],
  ][])
    for (const to of targets) {
      const { client, updates, state } = fakeDb({ approval: from, version: 3 });
      await reviewWorkshop(client, admin, "w1", {
        approval: to,
        version: 3,
        reviewNote: "Lý do kiểm duyệt",
      });
      const { where, data } = updates[0];
      assert.equal(where.approval, from);
      assert.equal(where.version, 3);
      assert.equal(data.reviewedById, "admin-1");
      assert.ok(data.reviewedAt instanceof Date);
      assert.deepEqual(data.version, { increment: 1 });
      assert.equal(state.approval, to);
    }
});
test("moves outside the table answer 409 without writing", async () => {
  const banned: [Approval, Approval][] = [
    ["PENDING", "SUSPENDED"],
    ["APPROVED", "REJECTED"],
    ["SUSPENDED", "REJECTED"],
    ["REJECTED", "APPROVED"],
    ["REJECTED", "SUSPENDED"],
  ];
  for (const [from, to] of banned) {
    const { client, updates } = fakeDb({ approval: from, version: 0 });
    await assert.rejects(
      reviewWorkshop(client, admin, "w1", {
        approval: to,
        version: 0,
        reviewNote: "Không hợp lệ",
      }),
      status(409),
    );
    assert.equal(updates.length, 0);
  }
});
test("a stale version (artisan edited meanwhile) answers 409", async () => {
  const { client, state } = fakeDb({ approval: "PENDING", version: 5 });
  await assert.rejects(
    reviewWorkshop(client, admin, "w1", { approval: "APPROVED", version: 4 }),
    status(409),
  );
  assert.equal(state.approval, "PENDING");
});
test("only admins may list, read or review; admin-owned profiles are untouchable", async () => {
  const { client } = fakeDb({ approval: "PENDING", version: 0 });
  const cmd = { approval: "APPROVED", version: 0 };
  await assert.rejects(reviewWorkshop(client, null, "w1", cmd), status(401));
  for (const user of [as("BUYER"), as("ARTISAN"), as("ARTISAN", "PENDING")]) {
    await assert.rejects(reviewWorkshop(client, user, "w1", cmd), status(403));
    await assert.rejects(listWorkshops(client, user, {}), status(403));
    await assert.rejects(workshopForReview(client, user, "w1"), status(403));
  }
  const owned = fakeDb({ approval: "PENDING", version: 0, role: "ADMIN" });
  await assert.rejects(
    reviewWorkshop(owned.client, admin, "w1", cmd),
    status(404),
  );
  await assert.rejects(
    reviewWorkshop(client, admin, "missing", cmd),
    status(404),
  );
});
test("list defaults to PENDING, searches name or email and pages on the server", async () => {
  const { client, updates } = fakeDb({ approval: "PENDING", version: 0 });
  const first = await listWorkshops(client, admin, {});
  assert.equal(first.status, "PENDING");
  const where = (updates[0] as unknown as { where: Record<string, unknown> })
    .where;
  assert.equal(where.approval, "PENDING");
  assert.deepEqual(where.user, { role: "ARTISAN" });
  await listWorkshops(client, admin, {
    status: "SUSPENDED",
    q: "gốm",
    page: "3",
  });
  const args = updates[1] as unknown as {
    where: { OR: unknown[] };
    skip: number;
    take: number;
  };
  assert.equal(args.where.OR.length, 2);
  assert.equal(args.skip, 40);
  assert.equal(args.take, 21);
  const junk = await listWorkshops(client, admin, {
    status: "ALL",
    page: "-1",
  });
  assert.equal(junk.status, "PENDING");
  assert.equal(junk.page, 1);
});

test("open wholesale orders are counted once per page, read-only", async () => {
  const { client, groupCalls, updates } = fakeDb({
    approval: "APPROVED",
    version: 0,
  });
  const detail = await workshopForReview(client, admin, "w1");
  assert.equal(detail.openOrders, 2);
  assert.equal(groupCalls.length, 1);
  assert.deepEqual(groupCalls[0], {
    by: ["artisanId"],
    where: {
      artisanId: { in: ["w1"] },
      acceptedQuantity: { gt: 0 },
      recipient: {
        request: { state: { in: ["BUYER_ACCEPTED", "IN_PRODUCTION"] } },
      },
    },
    _count: { _all: true },
  });
  assert.deepEqual([...OPEN_ORDER_STATES], ["BUYER_ACCEPTED", "IN_PRODUCTION"]);
  // An empty page makes no count query; the result of a decision carries the count.
  const before = groupCalls.length;
  assert.deepEqual((await listWorkshops(client, admin, {})).items, []);
  assert.equal(groupCalls.length, before);
  const suspended = await reviewWorkshop(client, admin, "w1", {
    approval: "SUSPENDED",
    version: 0,
    reviewNote: "Kiểm tra đơn dở",
  });
  assert.equal(suspended.openOrders, 2);
  assert.ok(updates.length > 0);
});
