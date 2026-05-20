import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { MobileNav } from "@/components/shared/mobile-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("credits_remaining, plan")
    .eq("owner_id", user.id)
    .single();

  const planCreditsTotal: Record<string, number> = {
    free: 3,
    creator: 30,
    pro: 100,
    team: 250,
    agency: 1000,
  };
  const creditsTotal = planCreditsTotal[workspace?.plan ?? "free"] ?? 3;

  return (
    <div className="flex h-screen flex-col bg-base lg:flex-row overflow-hidden">
      {/* Desktop sidebar */}
      <AppSidebar
        user={user}
        creditsRemaining={workspace?.credits_remaining ?? 0}
        creditsTotal={creditsTotal}
      />
      {/* Mobile nav (hamburger + drawer) */}
      <MobileNav
        user={user}
        creditsRemaining={workspace?.credits_remaining ?? 0}
        creditsTotal={creditsTotal}
      />
      <main id="main-content" className="flex-1 overflow-y-auto min-h-0">
        {children}
      </main>
    </div>
  );
}
