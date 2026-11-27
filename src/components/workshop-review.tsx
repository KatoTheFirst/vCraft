"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { Approval } from "@prisma/client";
import type { listWorkshops } from "@/services/moderation";
import { transitions } from "@/validations/moderation";
import { dateVN, statusLabel } from "./review-format";
type Row = Awaited<ReturnType<typeof listWorkshops>>["items"][number];
// Rows fetched again from the API carry ISO strings instead of Dates.
type Workshop = Omit<Row, "createdAt" | "reviewedAt"> & {
  createdAt: Date | string;
  reviewedAt: Date | string | null;
};
const actions: Record<
  Approval,
  { to: Approval; label: string; destructive?: boolean }[]
> = {
  PENDING: [
    { to: "APPROVED", label: "Duyệt" },
    { to: "REJECTED", label: "Từ chối", destructive: true },
  ],
  APPROVED: [{ to: "SUSPENDED", label: "Khóa", destructive: true }],
  SUSPENDED: [{ to: "APPROVED", label: "Mở khóa" }],
  REJECTED: [],
};
export function ReviewActions({
  workshop,
  onReviewed,
}: {
  workshop: Workshop;
  onReviewed: (w: Workshop) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<(typeof actions)[Approval][number]>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function send(to: Approval, reviewNote?: string) {
    setBusy(true);
    setMessage("Đang lưu…");
    try {
      const r = await fetch("/api/v1/admin/workshops/" + workshop.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval: to,
          version: workshop.version,
          reviewNote,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.message);
      dialog.current?.close();
      setMessage("Đã cập nhật: " + statusLabel[to] + ".");
      onReviewed(result.data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể kết nối.");
    } finally {
      setBusy(false);
    }
  }
  const available = actions[workshop.approval].filter((a) =>
    transitions[workshop.approval].includes(a.to),
  );
  return (
    <div className="review-actions">
      {available.map((a) => (
        <button
          key={a.to}
          type="button"
          disabled={busy}
          className={a.destructive ? "danger" : undefined}
          onClick={() => {
            if (!a.destructive) return send(a.to);
            setPending(a);
            setMessage("");
            dialog.current?.showModal();
          }}
        >
          {a.label}
        </button>
      ))}
      {!available.length && <span>Không còn thao tác.</span>}
      <span role="status" aria-live="polite">
        {message}
      </span>
      <dialog
        ref={dialog}
        aria-labelledby={"review-title-" + workshop.id}
        onClose={() => setPending(undefined)}
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            const note = new FormData(e.currentTarget).get("reviewNote");
            if (pending) send(pending.to, String(note ?? ""));
          }}
        >
          <h2 id={"review-title-" + workshop.id}>
            {pending?.label} xưởng “{workshop.name}”?
          </h2>
          <p>
            {pending?.to === "SUSPENDED"
              ? "Xưởng sẽ mất quyền đăng bán, chào giá và trang công khai bị ẩn ngay."
              : "Hồ sơ sẽ bị từ chối và nghệ nhân không thể hoạt động."}
          </p>
          <label>
            Lý do (bắt buộc, gửi kèm quyết định)
            <textarea
              name="reviewNote"
              required
              minLength={5}
              maxLength={1000}
            />
          </label>
          <p role="status" aria-live="polite">
            {message}
          </p>
          <div className="review-actions">
            <button type="submit" className="danger" disabled={busy}>
              {busy ? "Đang lưu…" : "Xác nhận " + pending?.label.toLowerCase()}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => dialog.current?.close()}
            >
              Hủy
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
export function WorkshopReviewList({ items }: { items: Workshop[] }) {
  const [rows, setRows] = useState(items);
  if (!rows.length)
    return <p className="empty">Không có hồ sơ nào khớp bộ lọc.</p>;
  return (
    <div className="table-wrap">
      <table className="review-table">
        <thead>
          <tr>
            <th scope="col">Xưởng</th>
            <th scope="col">Chủ hộ</th>
            <th scope="col">Đăng ký</th>
            <th scope="col">Chứng nhận</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id}>
              <td data-label="Xưởng">
                <Link href={"/admin/workshops/" + w.id}>{w.name}</Link>
              </td>
              <td data-label="Chủ hộ">
                {w.user.name}
                <br />
                <small>
                  {w.user.email}
                  {w.user.phone && " · " + w.user.phone}
                </small>
              </td>
              <td data-label="Đăng ký">{dateVN(w.createdAt)}</td>
              <td data-label="Chứng nhận" className="num">
                {w.certificates.length}
              </td>
              <td data-label="Trạng thái">
                <span className={"badge " + w.approval.toLowerCase()}>
                  {statusLabel[w.approval]}
                </span>
              </td>
              <td data-label="Thao tác">
                <ReviewActions
                  workshop={w}
                  onReviewed={(next) =>
                    setRows((all) =>
                      all.map((r) => (r.id === next.id ? next : r)),
                    )
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// Detail page: same actions, and the shown decision follows the latest result.
export function ReviewPanel({ workshop }: { workshop: Workshop }) {
  const [current, setCurrent] = useState(workshop);
  return (
    <section aria-labelledby="decision-heading" className="card">
      <h2 id="decision-heading">Quyết định kiểm duyệt</h2>
      <p>
        Trạng thái:{" "}
        <span className={"badge " + current.approval.toLowerCase()}>
          {statusLabel[current.approval]}
        </span>
      </p>
      <p>
        Lần duyệt gần nhất: {dateVN(current.reviewedAt)}
        {current.reviewedBy && <> bởi {current.reviewedBy.name}</>}
        {current.reviewNote && <> · Lý do: {current.reviewNote}</>}
      </p>
      <ReviewActions workshop={current} onReviewed={setCurrent} />
    </section>
  );
}
