import { notFound } from "next/navigation";
import { publicBatch } from "@/services/catalog";
export default async function Trace({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const batch = await publicBatch((await params).code);
  if (!batch) notFound();
  return (
    <article>
      <h1>{batch.product.name}</h1>
      <p>Lô {batch.code}</p>
      <ol>
        {batch.logs.map((log, i) => (
          <li key={i}>
            <time dateTime={log.occurredAt.toISOString()}>
              {log.occurredAt.toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </time>{" "}
            · {log.title}
          </li>
        ))}
      </ol>
    </article>
  );
}
