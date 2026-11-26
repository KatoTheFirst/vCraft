"use client";
import { useState } from "react";
import Image from "next/image";
// Uploads through the shared 4.2 endpoint and keeps the returned URLs.
export function ImagePicker({
  label,
  purpose,
  urls,
  max,
  onChange,
}: {
  label: string;
  purpose: "product" | "production-log";
  urls: string[];
  max: number;
  onChange: (urls: string[]) => void;
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <fieldset disabled={busy}>
      <legend>{label}</legend>
      <input
        type="file"
        multiple
        aria-label={"Tải " + label.toLowerCase()}
        accept="image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          if (
            files.length > 6 ||
            files.some((f) => f.size > 5 * 1024 * 1024) ||
            urls.length + files.length > max
          )
            return setStatus(`Tối đa 6 ảnh/lượt, 5 MiB/ảnh và ${max} ảnh.`);
          setBusy(true);
          setStatus("Đang xử lý ảnh…");
          try {
            const form = new FormData();
            form.set("purpose", purpose);
            files.forEach((f) => form.append("files", f));
            const r = await fetch("/api/v1/uploads", {
              method: "POST",
              body: form,
            });
            const result = await r.json();
            if (!r.ok) throw new Error(result.message);
            onChange([
              ...urls,
              ...result.data.map((a: { url: string }) => a.url),
            ]);
            setStatus("Đã tải ảnh. Nhấn Lưu để cập nhật.");
          } catch (err) {
            setStatus(err instanceof Error ? err.message : "Tải ảnh thất bại.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <div className="gallery">
        {urls.map((url, i) => (
          <figure key={url}>
            <Image
              unoptimized
              width={128}
              height={96}
              alt={label + " " + (i + 1)}
              src={url.replace(/\/web$/, "/thumb")}
            />
            <button
              type="button"
              onClick={() => onChange(urls.filter((u) => u !== url))}
            >
              Gỡ ảnh {i + 1}
            </button>
          </figure>
        ))}
      </div>
      <p role="status">{status}</p>
    </fieldset>
  );
}
