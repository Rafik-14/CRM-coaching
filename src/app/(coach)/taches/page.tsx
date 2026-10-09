import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { TaskCheckbox } from "@/components/task-checkbox";
import { EmptyState } from "@/components/illustrations/empty-state";
import { listContactOptions, listTasks } from "@/server/queries/settings";
import { DeleteTaskButton, TaskDialog } from "@/components/coaching/task-dialog";
import { formatDate, fullName, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tâches" };

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tâches" description="Vos rappels et choses à faire">
        <Suspense fallback={<Skeleton className="h-9 w-36" />}>
          <NewTaskButton />
        </Suspense>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <TaskList />
      </Suspense>
    </>
  );
}

async function NewTaskButton() {
  const contacts = await listContactOptions();
  return <TaskDialog contacts={contacts} />;
}

async function TaskList() {
  const [tasks, contacts] = await Promise.all([listTasks(), listContactOptions()]);
  const open = tasks.filter((t) => !t.done).length;

  return (
    <div className="grid gap-4">
      {open === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              illustration="sitting-happy"
              layout="horizontal"
              size={130}
              title="Tout est fait"
              description={
                tasks.length
                  ? "Toutes vos tâches sont terminées. Bravo !"
                  : "Aucune tâche pour le moment. Ajoutez-en avec « Nouvelle tâche »."
              }
              className="py-2"
            />
          </CardContent>
        </Card>
      )}
      {tasks.length > 0 && (
        <Card className="py-2">
          <CardContent className="px-4">
            <ul className="divide-y">
              {tasks.map((t) => {
                const late = isOverdue(t.dueAt, t.done);
                return (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <TaskCheckbox id={t.id} done={t.done} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</p>
                      {t.contact && (
                        <Link href={`/contacts/${t.contact.id}`} className="text-xs text-muted-foreground hover:underline">
                          {fullName(t.contact)}
                        </Link>
                      )}
                    </div>
                    <span className={cn("shrink-0 text-xs tabular-nums", late ? "font-medium text-destructive" : "text-muted-foreground")}>
                      {late ? "En retard · " : ""}
                      {formatDate(t.dueAt)}
                    </span>
                    <TaskDialog task={t} contacts={contacts} />
                    <DeleteTaskButton id={t.id} title={t.title} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
