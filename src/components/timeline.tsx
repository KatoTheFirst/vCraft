import Image from "next/image";
export const vnDate = (d: Date) =>
  d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
// Logs arrive already ordered by occurredAt; the index is the step number.
export function Timeline({
  logs,
  heading: Heading = "h3",
}: {
  logs: { title: string; occurredAt: Date; images: string[] }[];
  heading?: "h3" | "h4";
}) {
  if (!logs.length) return <p>Lô này chưa có mốc chế tác nào.</p>;
  return (
    <ol className="timeline">
      {logs.map((log, i) => (
        <li key={i}>
          <span className="step" aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <time dateTime={log.occurredAt.toISOString()}>
              {vnDate(log.occurredAt)}
            </time>
            <Heading>
              <span className="visually-hidden">Bước {i + 1}: </span>
              {log.title}
            </Heading>
            {log.images.length > 0 && (
              <div className="photos">
                {log.images.map((url, j) => (
                  <a key={url} href={url}>
                    <Image
                      unoptimized
                      width={320}
                      height={240}
                      src={url.replace(/\/web$/, "/thumb")}
                      alt={`${log.title} – ảnh minh chứng ${j + 1}`}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
