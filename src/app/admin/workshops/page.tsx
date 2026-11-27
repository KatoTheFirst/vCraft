import Link from "next/link";
import { db } from "@/lib/db";
import { listWorkshops } from "@/services/moderation";
import { approvals } from "@/validations/moderation";
import { WorkshopReviewList, statusLabel } from "@/components/workshop-review";
import { requireAdmin } from "../guard";
export default async function Workshops({
  searchParams,
}: PageProps<"/admin/workshops">) {
  const user = await requireAdmin();
  const result = await listWorkshops(db, user, await searchParams);
  const link = (page: number) =>
    "?" +
    new URLSearchParams({
      status: result.status,
      q: result.q,
      page: String(page),
    });
  return (
    <>
      <h1>Kiểm duyệt hộ gia đình</h1>
      <form className="filters" role="search">
        <label>
          Trạng thái
          <select name="status" defaultValue={result.status}>
            {approvals.map((a) => (
              <option key={a} value={a}>
                {statusLabel[a]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tên xưởng hoặc email
          <input
            name="q"
            type="search"
            defaultValue={result.q}
            maxLength={100}
          />
        </label>
        <button>Lọc</button>
      </form>
      {/* key: a new filter or page starts from fresh rows */}
      <WorkshopReviewList key={link(result.page)} items={result.items} />
      <nav aria-label="Phân trang" className="pager">
        {result.page > 1 && (
          <Link href={link(result.page - 1)}>Trang trước</Link>
        )}
        <span>Trang {result.page}</span>
        {result.hasNext && <Link href={link(result.page + 1)}>Trang sau</Link>}
      </nav>
    </>
  );
}
