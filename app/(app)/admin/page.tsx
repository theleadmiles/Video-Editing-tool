import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminPanel } from "./admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const rawAdminEmails = process.env.ADMIN_EMAILS || "";
  const adminEmails = rawAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Default-deny: if no admins are configured, no one can access this page
  if (adminEmails.length === 0 || !adminEmails.includes(user.email?.toLowerCase() || "")) {
    redirect("/dashboard");
  }

  // Fetch all workspaces with user info via join
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, plan, credits_remaining, owner_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  // Fetch user emails for display
  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, plan, created_at");

  // Fetch project counts per workspace
  const { data: projectCounts } = await supabase
    .from("projects")
    .select("workspace_id");

  const countByWorkspace: Record<string, number> = {};
  for (const p of projectCounts || []) {
    countByWorkspace[p.workspace_id] = (countByWorkspace[p.workspace_id] || 0) + 1;
  }

  const userMap: Record<string, { email: string; full_name: string | null }> = {};
  for (const u of users || []) {
    userMap[u.id] = { email: u.email, full_name: u.full_name };
  }

  const enriched = (workspaces || []).map((ws) => ({
    ...ws,
    email: userMap[ws.owner_id]?.email || "Unknown",
    full_name: userMap[ws.owner_id]?.full_name || null,
    project_count: countByWorkspace[ws.id] || 0,
  }));

  return <AdminPanel workspaces={enriched} currentUserId={user.id} />;
}
