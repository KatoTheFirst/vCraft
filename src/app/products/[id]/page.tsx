import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { publicProduct } from "@/services/visibility";
import { Timeline } from "@/components/timeline";
export default async function ProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const product = await publicProduct(db, (await params).id);
  if (!product) notFound();
  return (
    <article>
      <p>
        {product.category} ·{" "}
        <Link href={"/artisan/" + product.artisan.slug}>
          {product.artisan.name}
        </Link>
        , {product.artisan.village.name}
      </p>
      <h1>{product.name}</h1>
      <p>Giá tham khảo: {product.price.toLocaleString("vi-VN")} ₫</p>
      {product.story && (
        <section>
          <h2>Câu chuyện độc bản</h2>
          <p>{product.story}</p>
        </section>
      )}
      {product.images.length > 0 && (
        <div className="gallery">
          {product.images.map((url, i) => (
            <a key={url} href={url}>
              <Image
                unoptimized
                width={240}
                height={180}
                src={url.replace(/\/web$/, "/thumb")}
                alt={`${product.name} – ảnh ${i + 1}`}
              />
            </a>
          ))}
        </div>
      )}
      <h2>Nhật ký sản xuất theo lô</h2>
      {!product.batches.length && <p>Sản phẩm chưa có lô sản xuất.</p>}
      {product.batches.map((batch) => (
        <section key={batch.code} className="card">
          <h3>
            Lô {batch.code} · {batch.quantity} sản phẩm
          </h3>
          <Timeline logs={batch.logs} heading="h4" />
        </section>
      ))}
    </article>
  );
}
