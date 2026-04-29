import { redirect } from "next/navigation";
import { getSupabaseUser } from "@/lib/auth/permissions";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSupabaseUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
