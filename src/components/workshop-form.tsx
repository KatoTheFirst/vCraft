"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ownProfile } from "@/services/workshop";
type Profile = Awaited<ReturnType<typeof ownProfile>>;
export function WorkshopForm({ profile }: { profile: Profile }) {
  const [current, setCurrent] = useState(profile);
  const [lists, setLists] = useState({
    images: profile.images,
    certificates: profile.certificates,
  });
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section>
      <h1>Hồ sơ xưởng</h1>
      <p>
        {profile.approval === "APPROVED" ? (
          <Link href={"/artisan/" + profile.slug}>Xem trang trưng bày</Link>
        ) : (
          "Xưởng đang chờ Ban quản lý phê duyệt."
        )}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            const data = {
              name: form.get("name"),
              familyHistory: form.get("familyHistory"),
              story: form.get("story"),
              isOpen: form.has("isOpen"),
              version: current.version,
              ...lists,
              latitude: form.get("latitude")
                ? Number(form.get("latitude"))
                : null,
              longitude: form.get("longitude")
                ? Number(form.get("longitude"))
                : null,
            };
            const r = await fetch("/api/v1/workshop", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const result = await r.json();
            if (!r.ok) throw new Error(result.message);
            setCurrent(result.data);
            setMessage("Đã lưu hồ sơ xưởng.");
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Không thể lưu.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend>Thông tin xưởng</legend>
          <label>
            Tên xưởng
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={current.name}
            />
          </label>
          <label>
            Lịch sử gia đình
            <textarea
              name="familyHistory"
              maxLength={5000}
              defaultValue={current.familyHistory ?? ""}
            />
          </label>
          <label>
            Câu chuyện làm nghề
            <textarea
              name="story"
              maxLength={5000}
              defaultValue={current.story ?? ""}
            />
          </label>
          <label>
            Vĩ độ
            <input
              type="number"
              min="-90"
              max="90"
              step="any"
              name="latitude"
              defaultValue={current.latitude ?? ""}
            />
          </label>
          <label>
            Kinh độ
            <input
              type="number"
              min="-180"
              max="180"
              step="any"
              name="longitude"
              defaultValue={current.longitude ?? ""}
            />
          </label>
          <label>
            <input
              type="checkbox"
              name="isOpen"
              defaultChecked={current.isOpen}
            />{" "}
            Mở cửa đón khách
          </label>
          {(["images", "certificates"] as const).map((field) => (
            <section key={field}>
              <label>
                {field === "images" ? "Ảnh xưởng" : "Chứng nhận chất lượng"}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (!files.length) return;
                    if (
                      files.length > 6 ||
                      files.some((f) => f.size > 5 * 1024 * 1024) ||
                      lists[field].length + files.length > 24
                    ) {
                      setMessage(
                        "Tối đa 6 ảnh/lượt, 5 MiB/ảnh và 24 ảnh mỗi mục.",
                      );
                      return;
                    }
                    setBusy(true);
                    setMessage("Đang xử lý ảnh…");
                    try {
                      const form = new FormData();
                      form.set(
                        "purpose",
                        field === "images" ? "workshop" : "certificate",
                      );
                      files.forEach((f) => form.append("files", f));
                      const r = await fetch("/api/v1/uploads", {
                        method: "POST",
                        body: form,
                      });
                      const result = await r.json();
                      if (!r.ok) throw new Error(result.message);
                      setLists((prev) => ({
                        ...prev,
                        [field]: [
                          ...prev[field],
                          ...result.data.map((a: { url: string }) => a.url),
                        ],
                      }));
                      setMessage("Ảnh đã tải lên. Chọn Lưu hồ sơ để cập nhật.");
                    } catch (err) {
                      setMessage(
                        err instanceof Error
                          ? err.message
                          : "Tải ảnh thất bại.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              <div className="gallery">
                {lists[field].map((url, index) => (
                  <figure key={url}>
                    <Image
                      unoptimized
                      width={128}
                      height={96}
                      alt={
                        (field === "images" ? "Ảnh xưởng " : "Chứng nhận ") +
                        (index + 1)
                      }
                      src={url.replace(/\/web$/, "/thumb")}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLists((prev) => ({
                          ...prev,
                          [field]: prev[field].filter((u) => u !== url),
                        }))
                      }
                    >
                      Gỡ ảnh {index + 1}
                    </button>
                  </figure>
                ))}
              </div>
            </section>
          ))}
          <button>Lưu hồ sơ</button>
        </fieldset>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
