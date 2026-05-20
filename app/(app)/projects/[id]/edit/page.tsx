import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectEditor } from "@/components/editor/project-editor";
import { MobileEditorBlocker } from "@/components/editor/mobile-editor-blocker";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  return (
    <>
      {/* Mobile fallback — shown only below md */}
      <MobileEditorBlocker project={project} />
      {/* Desktop editor — hidden below md */}
      <div className="hidden md:block">
        <ProjectEditor project={project} />
      </div>
    </>
  );
}
