import { redirect } from "next/navigation";

export default async function SundayDateRedirect({ params }: { params: Promise<{ churchId: string; date: string }> }) {
  const { churchId, date } = await params;
  redirect(`/churches/${churchId}/services/${date}`);
}
