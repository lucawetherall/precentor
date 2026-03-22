import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <ErrorBoundary>{children}</ErrorBoundary>
    </div>
  );
}
