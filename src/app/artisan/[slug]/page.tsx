import { notFound } from "next/navigation";
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
      <h1>{workshop.name}</h1>
      <p>{workshop.village.name}</p>
      <p>{workshop.story}</p>
    </article>
  );
}
