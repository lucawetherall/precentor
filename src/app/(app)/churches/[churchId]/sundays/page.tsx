import { redirect } from "next/navigation";

export default async function SundaysRedirect({ params }: { params: Promise<{ churchId: string }> }) {
  const { churchId } = await params;
  redirect(`/churches/${churchId}/services`);
}
