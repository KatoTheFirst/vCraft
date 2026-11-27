import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/services/auth";
import { listQuotes } from "@/services/quotations";
import { pageNumber } from "@/validations/quotation";
import { QuoteBoard } from "@/components/quote-board";
export default async function Quotes({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (
    user.role === "ADMIN" ||
    (user.role === "ARTISAN" && user.profile?.approval !== "APPROVED")
  )
    redirect("/dashboard");
  const page = pageNumber.catch(1).parse((await searchParams).page);
  const result = await listQuotes(db, user, page);
  const categories =
    user.role === "BUYER"
      ? await db.product.groupBy({
          by: ["category"],
          where: { published: true, artisan: { approval: "APPROVED" } },
          orderBy: { category: "asc" },
        })
      : [];
  return (
    <>
      <h1>
        {user.role === "BUYER" ? "Yêu cầu báo giá" : "Yêu cầu gửi tới xưởng"}
      </h1>
      <QuoteBoard
        items={result.items}
        buyer={user.role === "BUYER"}
        categories={categories.map((c) => c.category)}
      />
      <nav aria-label="Trang báo giá">
        {page > 1 && <Link href={"?page=" + (page - 1)}>Trang trước</Link>}
        {result.hasNext && <Link href={"?page=" + (page + 1)}>Trang sau</Link>}
      </nav>
    </>
  );
}
