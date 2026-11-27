import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Problem } from "@/lib/endpoint";
import { workshopForReview } from "@/services/moderation";
import { ReviewPanel } from "@/components/workshop-review";
import { dateVN } from "@/components/review-format";
import { requireAdmin } from "../../guard";
export default async function WorkshopReview({
  params,
}: PageProps<"/admin/workshops/[id]">) {
  const user = await requireAdmin();
  const w = await workshopForReview(db, user, (await params).id).catch((e) => {
    if (e instanceof Problem && e.code === 404) notFound();
    throw e;
  });
  return (
    <article>
      <p>
        <Link href="/admin/workshops">← Danh sách hộ gia đình</Link>
      </p>
      <h1>{w.name}</h1>
      <ReviewPanel workshop={w} />
      <section className="card">
        <h2>Thông tin đăng ký</h2>
        <dl className="facts">
          <dt>Chủ hộ</dt>
          <dd>{w.user.name}</dd>
          <dt>Email</dt>
          <dd>{w.user.email}</dd>
          <dt>Số điện thoại</dt>
          <dd>{w.user.phone ?? "—"}</dd>
          <dt>Làng nghề</dt>
          <dd>{w.village.name}</dd>
          <dt>Ngày đăng ký</dt>
          <dd>{dateVN(w.createdAt)}</dd>
          <dt>Tọa độ xưởng</dt>
          <dd>
            {w.latitude !== null && w.longitude !== null
              ? `${w.latitude}, ${w.longitude}`
              : "Chưa khai báo"}
          </dd>
          <dt>Đón khách</dt>
          <dd>{w.isOpen ? "Đang mở cửa" : "Chưa mở cửa"}</dd>
        </dl>
      </section>
      <section className="card">
        <h2>Lịch sử gia đình</h2>
        <p>{w.familyHistory || "Chưa khai báo."}</p>
        <h2>Câu chuyện làm nghề</h2>
        <p>{w.story || "Chưa khai báo."}</p>
      </section>
      {(["certificates", "images"] as const).map((field) => (
        <section key={field} className="card">
          <h2>
            {field === "certificates" ? "Chứng nhận chất lượng" : "Ảnh xưởng"}
          </h2>
          {w[field].length ? (
            <div className="gallery">
              {w[field].map((url, i) => (
                <a key={url} href={url} target="_blank" rel="noopener">
                  <Image
                    unoptimized
                    width={240}
                    height={180}
                    src={url.replace(/\/web$/, "/thumb")}
                    alt={
                      (field === "certificates"
                        ? "Chứng nhận "
                        : "Ảnh xưởng ") +
                      (i + 1)
                    }
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="empty">Chưa tải lên.</p>
          )}
        </section>
      ))}
    </article>
  );
}
