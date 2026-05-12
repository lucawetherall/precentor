import { redirect } from "next/navigation";
import { requireChurchRole } from "@/lib/auth/permissions";
import NewPresetForm from "./new-preset-form";

interface Props {
  params: Promise<{ churchId: string }>;
}

export default async function NewPresetPage({ params }: Props) {
  const { churchId } = await params;
  const { error } = await requireChurchRole(churchId, "ADMIN");
  if (error) redirect(`/churches/${churchId}`);

  return <NewPresetForm />;
}
