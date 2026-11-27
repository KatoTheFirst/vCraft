"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { listQuotes } from "@/services/quotations";
type Quote = Awaited<ReturnType<typeof listQuotes>>["items"][number];
const labels = {
  DRAFT_REQUEST: "Bản nháp",
  SENT_TO_ARTISANS: "Đã gửi tới xưởng",
  ARTISANS_BIDDING: "Đang chào giá",
  BUYER_ACCEPTED: "Đã chốt xưởng",
  IN_PRODUCTION: "Đang sản xuất",
  DELIVERED: "Đã giao hàng",
};
const money = (value: string) => Number(value).toLocaleString("vi-VN") + " ₫";
const day = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
function dateValue(value: string) {
  return new Date(new Date(value).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
}
function endOfDay(value: FormDataEntryValue | null) {
  return new Date(value + "T23:59:59+07:00").toISOString();
}
function DraftFields({ q }: { q?: Quote }) {
  return (
    <>
      <label>
        Phân loại sản phẩm
        <input
          name="category"
          list="quote-categories"
          defaultValue={q?.category ?? ""}
          required
          maxLength={120}
        />
      </label>
      <label>
        Quy cách và yêu cầu
        <textarea
          name="description"
          defaultValue={q?.description}
          required
          maxLength={5000}
        />
      </label>
      <label>
        Số lượng cần đặt
        <input
          name="quantity"
          type="number"
          min="1"
          defaultValue={q?.quantity}
          required
        />
      </label>
      <label>
        Ngân sách dự kiến (₫)
        <input
          name="budget"
          type="number"
          min="1"
          defaultValue={q?.budget ?? ""}
        />
      </label>
      <label>
        Hạn giao
        <input
          name="deadline"
          type="date"
          defaultValue={q && dateValue(q.deadline)}
          required
        />
      </label>
    </>
  );
}
export function QuoteBoard({
  items,
  buyer,
  categories,
}: {
  items: Quote[];
  buyer: boolean;
  categories: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [pending, refresh] = useTransition(),
    [message, setMessage] = useState("");
  async function save(data: Record<string, unknown>, q?: Quote) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(
        "/api/v1/quotes" + (q ? "/" + encodeURIComponent(q.id) : ""),
        {
          method: q ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(q ? { ...data, version: q.version } : data),
        },
      );
      const result = await r.json();
      setMessage(result.message);
      if (r.ok || r.status === 409) refresh(() => router.refresh());
      return r.ok;
    } catch {
      setMessage("Không thể kết nối. Hãy tải lại để kiểm tra trạng thái.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submitDraft(e: FormEvent<HTMLFormElement>, q?: Quote) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    const ok = await save(
      {
        ...(q ? { action: "edit" } : {}),
        category: f.get("category"),
        description: f.get("description"),
        quantity: Number(f.get("quantity")),
        deadline: endOfDay(f.get("deadline")),
        budget: f.get("budget") ? Number(f.get("budget")) : null,
      },
      q,
    );
    if (ok && !q) form.reset();
  }
  return (
    <>
      <p role="status">{message}</p>
      <fieldset disabled={busy || pending}>
        <legend>{buyer ? "Mua sỉ" : "Chào giá và tiến độ"}</legend>
        {buyer && (
          <details>
            <summary>Tạo yêu cầu mua sỉ</summary>
            <form onSubmit={(e) => submitDraft(e)}>
              <DraftFields />
              <button>Lưu bản nháp</button>
            </form>
          </details>
        )}
        <datalist id="quote-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {!items.length && (
          <p>
            {buyer
              ? "Bạn chưa có yêu cầu trên trang này."
              : "Chưa có yêu cầu trên trang này."}
          </p>
        )}
        {items.map((q) => (
          <article key={q.id + "-" + q.version}>
            <h2>{q.description}</h2>
            <p>
              {labels[q.state]} · {q.category} · {q.quantity} sản phẩm · Giao
              trước {day(q.deadline)}
            </p>
            {q.budget && <p>Ngân sách {money(q.budget)}</p>}
            {buyer && q.state === "DRAFT_REQUEST" && (
              <>
                <details>
                  <summary>Sửa bản nháp</summary>
                  <form onSubmit={(e) => submitDraft(e, q)}>
                    <DraftFields q={q} />
                    <button>Lưu thay đổi</button>
                  </form>
                </details>
                <button onClick={() => save({ action: "send" }, q)}>
                  Gửi tới xưởng phù hợp
                </button>
              </>
            )}
            {q.recipients.length > 0 && (
              <ul>
                {q.recipients.map(({ name, bid }, i) => (
                  <li key={bid?.id ?? i}>
                    <strong>{name}</strong> ·{" "}
                    {bid ? (
                      <>
                        {money(bid.unitPrice)}/sản phẩm · Nhận {bid.quantity} ·
                        Hoàn thành {day(bid.completionDate)}
                        {bid.acceptedQuantity > 0 && (
                          <p>
                            Đã nhận {bid.acceptedQuantity} · Đã giao{" "}
                            {bid.deliveredQuantity}
                          </p>
                        )}
                        {buyer && q.state === "ARTISANS_BIDDING" && (
                          <button
                            disabled={
                              bid.quantity < q.quantity ||
                              Date.parse(bid.completionDate) <= Date.now()
                            }
                            onClick={() =>
                              save({ action: "accept", bidId: bid.id }, q)
                            }
                          >
                            Chọn xưởng
                          </button>
                        )}
                      </>
                    ) : (
                      "Chưa chào giá"
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!buyer &&
              ["SENT_TO_ARTISANS", "ARTISANS_BIDDING"].includes(q.state) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void save(
                      {
                        action: "bid",
                        unitPrice: Number(f.get("price")),
                        quantity: Number(f.get("capacity")),
                        completionDate: endOfDay(f.get("date")),
                      },
                      q,
                    );
                  }}
                >
                  <label>
                    Đơn giá (₫)
                    <input
                      name="price"
                      type="number"
                      min="1"
                      required
                      defaultValue={q.recipients[0]?.bid?.unitPrice}
                    />
                  </label>
                  <label>
                    Số lượng có thể nhận
                    <input
                      name="capacity"
                      type="number"
                      min="1"
                      max={q.quantity}
                      defaultValue={
                        q.recipients[0]?.bid?.quantity ?? q.quantity
                      }
                      required
                    />
                  </label>
                  <label>
                    Ngày hoàn thành
                    <input
                      name="date"
                      type="date"
                      required
                      max={dateValue(q.deadline)}
                      defaultValue={
                        q.recipients[0]?.bid
                          ? dateValue(q.recipients[0].bid.completionDate)
                          : undefined
                      }
                    />
                  </label>
                  <button>Gửi chào giá</button>
                </form>
              )}
            {!buyer &&
              q.recipients.some(
                (r) =>
                  r.bid && r.bid.acceptedQuantity > r.bid.deliveredQuantity,
              ) &&
              (q.state === "BUYER_ACCEPTED" ? (
                <button onClick={() => save({ action: "start" }, q)}>
                  Bắt đầu sản xuất
                </button>
              ) : q.state === "IN_PRODUCTION" ? (
                <button onClick={() => save({ action: "deliver" }, q)}>
                  Xác nhận đã giao hàng
                </button>
              ) : null)}
          </article>
        ))}
      </fieldset>
    </>
  );
}
