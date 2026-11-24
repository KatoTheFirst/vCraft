import { notFound } from "next/navigation";
import Image from "next/image";
import { publicArtisan } from "@/services/catalog";
export default async function Artisan({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const workshop = await publicArtisan((await params).slug);
  if (!workshop) notFound();
  return (
    <article>
      <p>{workshop.village.name}</p>
      <h1>{workshop.name}</h1>
      <p>
        {workshop.isOpen ? "Đang mở cửa đón khách" : "Chưa mở cửa đón khách"}
      </p>
      {workshop.latitude !== null && workshop.longitude !== null && (
        <p>
          Tọa độ xưởng · {workshop.latitude}, {workshop.longitude}
        </p>
      )}
      {workshop.familyHistory && (
        <section>
          <h2>Lịch sử gia đình</h2>
          <p>{workshop.familyHistory}</p>
        </section>
      )}
      {workshop.story && (
        <section>
          <h2>Câu chuyện làm nghề</h2>
          <p>{workshop.story}</p>
        </section>
      )}
      {(["images", "certificates"] as const).map(
        (field) =>
          workshop[field].length > 0 && (
            <section key={field}>
              <h2>
                {field === "images"
                  ? "Hình ảnh xưởng"
                  : "Chứng nhận chất lượng"}
              </h2>
              <div className="gallery">
                {workshop[field].map((url, i) => (
                  <a key={url} href={url}>
                    <Image
                      unoptimized
                      width={240}
                      height={180}
                      src={url.replace(/\/web$/, "/thumb")}
                      alt={
                        (field === "images" ? "Ảnh xưởng " : "Chứng nhận ") +
                        (i + 1)
                      }
                    />
                  </a>
                ))}
              </div>
            </section>
          ),
      )}
    </article>
  );
}
