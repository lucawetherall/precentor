import { redirect } from "next/navigation";
import { Suspense } from "react";
import { format, addWeeks } from "date-fns";
import { requireChurchRole } from "@/lib/auth/permissions";
import { PlanningGrid } from "./planning-grid";

interface Props {
  params: Promise<{ churchId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function PlanningPage({ params, searchParams }: Props) {
  const { churchId } = await params;
  const sp = await searchParams;
  const { error } = await requireChurchRole(churchId, "EDITOR");
  if (error) redirect(`/churches/${churchId}`);

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultTo = format(addWeeks(new Date(), 6), "yyyy-MM-dd");
  const from = sp.from ?? today;
  const to = sp.to ?? defaultTo;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Planning</h1>
      <Suspense fallback={<div>Loading grid…</div>}>
        <PlanningGrid churchId={churchId} from={from} to={to} />
      </Suspense>
    </div>
  );
}
