import { redirect } from "next/navigation";
import { format, addWeeks } from "date-fns";
import { requireChurchRole } from "@/lib/auth/permissions";
import { getPlanningData } from "@/lib/planning/data";
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

  const initialData = await getPlanningData(churchId, from, to);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Planning</h1>
      <PlanningGrid churchId={churchId} from={from} to={to} initialData={initialData} />
    </div>
  );
}
