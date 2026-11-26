import Image from "next/image";
import Link from "next/link";
import type { traceBatch } from "@/services/visibility";
import { Timeline, vnDate } from "./timeline";
type Batch = NonNullable<Awaited<ReturnType<typeof traceBatch>>>;
// Shared by /trace/{code} and the signed route that B.3 will add.
export function TraceView({ batch }: { batch: Batch }) {
  const { product, logs } = batch;
  const cover = product.images[0];
  return (
    <article className="trace">
      <header className="trace-hero">
        <div>
          <p className="eyebrow">Truy xuất nguồn gốc · Lô {batch.code}</p>
          <h1>{product.name}</h1>
          <p>
            {product.category} · {batch.quantity} sản phẩm cùng lô dùng chung mã
            này
          </p>
          <p>
            Làm tại{" "}
            <Link href={"/artisan/" + product.artisan.slug}>
              {product.artisan.name}
            </Link>
            , {product.artisan.village.name}
          </p>
          {logs.length > 0 && (
            <p>
              Hành trình {logs.length} bước, từ {vnDate(logs[0].occurredAt)} đến{" "}
              {vnDate(logs[logs.length - 1].occurredAt)}
            </p>
          )}
          {batch.qrIssuedAt && (
            <p>Mã QR phát hành ngày {vnDate(batch.qrIssuedAt)}</p>
          )}
          <Link href={"/products/" + product.id}>Xem chi tiết sản phẩm</Link>
        </div>
        {cover && (
          <Image
            unoptimized
            priority
            width={640}
            height={480}
            src={cover}
            alt={product.name}
          />
        )}
      </header>
      {product.story && (
        <section>
          <h2>Câu chuyện sản phẩm</h2>
          <p>{product.story}</p>
        </section>
      )}
      <section>
        <h2>Hành trình chế tác</h2>
        <Timeline logs={logs} />
      </section>
    </article>
  );
}
