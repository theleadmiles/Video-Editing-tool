import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectEditor } from "@/components/editor/project-editor";
import { MobileEditorBlocker } from "@/components/editor/mobile-editor-blocker";
import { ProcessingScreen } from "@/components/editor/processing-screen";

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id }  = await params;
  const sp      = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Show processing screen while transcription runs in the background
  if (project.status === "processing" || project.status === "error") {
    return (
      <ProcessingScreen
        project={project}
        transcriptionJob={
          sp.audioUrl
            ? {
                audioUrl:    sp.audioUrl,
                videoUrl:    sp.videoUrl,
                language:    sp.language,
                aspectRatio: sp.aspectRatio,
              }
            : undefined
        }
      />
    );
  }

  return (
    <>
      <MobileEditorBlocker project={project} />
      <div className="hidden md:block">
        <ProjectEditor project={project} />
      </div>
    </>
  );
}
