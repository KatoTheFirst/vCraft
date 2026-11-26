import { notFound } from "next/navigation";
import { publicBatch } from "@/services/catalog";
import { TraceView } from "@/components/trace-view";
import { batchCode } from "@/validations/production";
export default async function Trace({ params }: PageProps<"/trace/[code]">) {
  const code = batchCode.safeParse((await params).code);
  const batch = code.success ? await publicBatch(code.data) : null;
  if (!batch) notFound();
  return <TraceView batch={batch} />;
}
