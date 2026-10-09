import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { NewContactButton } from "@/components/new-contact-button";
import { getPipeline } from "@/server/queries/contacts";
import { PipelineBoard } from "./pipeline-board";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Glissez une carte pour changer l'étape · cliquez pour l'aperçu rapide"
      >
        <Suspense fallback={<Skeleton className="h-9 w-40" />}>
          <NewContactButton />
        </Suspense>
      </PageHeader>
      <Suspense
        fallback={
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[60vh] w-76 shrink-0 rounded-2xl" />
            ))}
          </div>
        }
      >
        <Board />
      </Suspense>
    </>
  );
}

async function Board() {
  const { stages, contacts } = await getPipeline();
  return <PipelineBoard stages={stages} initialContacts={contacts} />;
}
