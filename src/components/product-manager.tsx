"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { ownProducts } from "@/services/production";
import { ImagePicker } from "./image-picker";
import { vnDate } from "./timeline";
type Product = Awaited<ReturnType<typeof ownProducts>>[number];
type Batch = Product["batches"][number];
type Log = Batch["logs"][number];
// datetime-local holds Bát Tràng time (UTC+7, no DST) on server and browser alike.
const toInput = (d: Date) =>
  new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 16);
const fromInput = (v: FormDataEntryValue | null) => v + ":00+07:00";
const categories = [
  "Trà cụ",
  "Đồ bàn ăn",
  "Bình hoa",
  "Cốc và tách",
  "Gốm trang trí",
  "Chậu cây",
  "Đồ gia dụng",
];
const steps = [
  "Luyện đất",
  "Tạo hình",
  "Phơi mộc",
  "Vẽ men",
  "Nung",
  "Thành phẩm",
];
function useSend() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function send(url: string, method: string, body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.message);
      setMessage(result.message);
      router.refresh();
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể lưu.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, message, send };
}
function submit(handler: (form: HTMLFormElement) => Promise<unknown>) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handler(e.currentTarget);
  };
}
function ProductForm({ product }: { product?: Product }) {
  const [images, setImages] = useState(product?.images ?? []);
  const { busy, message, send } = useSend();
  return (
    <form
      onSubmit={submit(async (form) => {
        const f = new FormData(form);
        const ok = await send(
          product ? "/api/v1/products/" + product.id : "/api/v1/products",
          product ? "PUT" : "POST",
          {
            name: f.get("name"),
            category: f.get("category"),
            price: Number(f.get("price")),
            story: f.get("story"),
            published: f.has("published"),
            images,
          },
        );
        if (ok && !product) {
          form.reset();
          setImages([]);
        }
      })}
    >
      <fieldset disabled={busy}>
        <legend>{product ? "Thông tin sản phẩm" : "Sản phẩm mới"}</legend>
        <label>
          Tên sản phẩm
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={product?.name}
          />
        </label>
        <label>
          Phân loại
          <input
            name="category"
            required
            maxLength={60}
            list="product-categories"
            defaultValue={product?.category}
          />
        </label>
        <label>
          Giá tham khảo (VND)
          <input
            name="price"
            type="number"
            required
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={product?.price}
          />
        </label>
        <label>
          Câu chuyện độc bản
          <textarea
            name="story"
            maxLength={5000}
            defaultValue={product?.story ?? ""}
          />
        </label>
        <ImagePicker
          label="Ảnh sản phẩm"
          purpose="product"
          max={24}
          urls={images}
          onChange={setImages}
        />
        <label>
          <input
            type="checkbox"
            name="published"
            defaultChecked={product?.published}
          />{" "}
          Công khai trên trang triển lãm
        </label>
        <button>{product ? "Lưu sản phẩm" : "Đăng sản phẩm"}</button>
      </fieldset>
      <p role="status">{message}</p>
    </form>
  );
}
function BatchForm({ productId }: { productId: string }) {
  const { busy, message, send } = useSend();
  return (
    <form
      onSubmit={submit(async (form) => {
        const quantity = Number(new FormData(form).get("quantity"));
        if (
          await send(`/api/v1/products/${productId}/batches`, "POST", {
            quantity,
          })
        )
          form.reset();
      })}
    >
      <fieldset disabled={busy}>
        <legend>Lô sản xuất mới</legend>
        <label>
          Số sản phẩm trong lô
          <input
            name="quantity"
            type="number"
            required
            min={1}
            max={1000000}
            step={1}
          />
        </label>
        <button>Tạo lô</button>
      </fieldset>
      <p role="status">{message}</p>
    </form>
  );
}
// The QR can be printed for a draft, but /trace answers 404 until it is public.
export function DraftQrWarning({ published }: { published: boolean }) {
  if (published) return null;
  return (
    <p className="warning">
      Sản phẩm đang ở chế độ Nháp: quét mã QR sẽ báo không tìm thấy trang cho
      đến khi bạn bật &quot;Công khai trên trang triển lãm&quot;.
    </p>
  );
}
// One QR per batch: every product in the batch carries the same label.
function BatchQr({ batch, published }: { batch: Batch; published: boolean }) {
  const { busy, message, send } = useSend();
  const code = encodeURIComponent(batch.code);
  const qr = `/api/v1/batches/${code}/qr?format=`;
  if (!batch.qrIssuedAt)
    return (
      <p>
        <button
          type="button"
          disabled={busy}
          onClick={() => send(`/api/v1/batches/${code}/qr`, "POST", {})}
        >
          Phát hành mã QR
        </button>{" "}
        <span role="status">{message}</span>
      </p>
    );
  return (
    <div className="qr">
      <Image
        unoptimized
        width={128}
        height={128}
        src={qr + "png"}
        alt={"Mã QR truy xuất lô " + batch.code}
      />
      <p>
        Phát hành ngày {vnDate(batch.qrIssuedAt)}
        <br />
        <a href={qr + "png"} download>
          Tải PNG
        </a>{" "}
        ·{" "}
        <a href={qr + "svg"} download>
          Tải SVG để in
        </a>{" "}
        · <Link href={"/trace/" + code}>Trang truy xuất</Link>
      </p>
      <DraftQrWarning published={published} />
    </div>
  );
}
function LogForm({ code, log }: { code: string; log?: Log }) {
  const [images, setImages] = useState(log?.images ?? []);
  const { busy, message, send } = useSend();
  const base = `/api/v1/batches/${encodeURIComponent(code)}/logs`;
  return (
    <form
      onSubmit={submit(async (form) => {
        const f = new FormData(form);
        const ok = await send(
          log ? base + "/" + log.id : base,
          log ? "PUT" : "POST",
          {
            occurredAt: fromInput(f.get("occurredAt")),
            title: f.get("title"),
            images,
          },
        );
        if (ok && !log) {
          form.reset();
          setImages([]);
        }
      })}
    >
      <fieldset disabled={busy}>
        <legend>{log ? "Sửa mốc chế tác" : "Mốc chế tác mới"}</legend>
        <label>
          Thời điểm (giờ Việt Nam)
          <input
            name="occurredAt"
            type="datetime-local"
            required
            defaultValue={log && toInput(log.occurredAt)}
          />
        </label>
        <label>
          Công đoạn
          <input
            name="title"
            required
            minLength={2}
            maxLength={120}
            list="production-steps"
            defaultValue={log?.title}
          />
        </label>
        <ImagePicker
          label="Ảnh minh chứng"
          purpose="production-log"
          max={12}
          urls={images}
          onChange={setImages}
        />
        <button>{log ? "Lưu mốc" : "Thêm mốc"}</button>
      </fieldset>
      <p role="status">{message}</p>
    </form>
  );
}
export function ProductManager({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="products-heading">
      <h2 id="products-heading">Sản phẩm và nhật ký sản xuất</h2>
      <datalist id="product-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="production-steps">
        {steps.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <details>
        <summary>Đăng sản phẩm mới</summary>
        <ProductForm />
      </details>
      {!products.length && <p>Xưởng chưa có sản phẩm nào.</p>}
      {products.map((p) => (
        <details key={p.id} className="card">
          <summary>
            {p.name} · {p.published ? "Công khai" : "Nháp"} · {p.batches.length}{" "}
            lô
          </summary>
          {p.published && (
            <Link href={"/products/" + p.id}>Xem trang sản phẩm</Link>
          )}
          <ProductForm product={p} />
          <BatchForm productId={p.id} />
          {p.batches.map((b) => (
            <section key={b.code} className="card">
              <h3>
                Lô {b.code} · {b.quantity} sản phẩm
              </h3>
              <BatchQr batch={b} published={p.published} />
              <ol>
                {b.logs.map((l) => (
                  <li key={l.id}>
                    <details>
                      <summary>
                        {vnDate(l.occurredAt)} · {l.title} · {l.images.length}{" "}
                        ảnh
                      </summary>
                      <LogForm code={b.code} log={l} />
                    </details>
                  </li>
                ))}
              </ol>
              <details>
                <summary>Thêm mốc chế tác</summary>
                <LogForm code={b.code} />
              </details>
            </section>
          ))}
        </details>
      ))}
    </section>
  );
}
