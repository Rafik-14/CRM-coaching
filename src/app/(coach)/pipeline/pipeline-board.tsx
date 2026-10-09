"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownWideNarrow, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { daysSince, formatMoney, fullName, initials } from "@/lib/format";
import { stageDot } from "@/components/stage-badge";
import { FollowUpBadge } from "@/components/follow-up-badge";
import { ContactQuickView } from "@/components/contact-quick-view";
import { moveContactToStage } from "@/server/actions/contacts";
import type { PipelineContact, Stage } from "@/server/queries/contacts";

type Sort = "recent" | "value" | "days";
/** Days in a stage before the card is flagged as stalling. */
const STALE_AFTER_DAYS = 14;

export function PipelineBoard({
  stages,
  initialContacts,
}: {
  stages: Stage[];
  initialContacts: PipelineContact[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    // Small distance so a simple click still opens the quick view.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? contacts.filter((c) => `${fullName(c)} ${c.source ?? ""} ${c.tags.join(" ")}`.toLowerCase().includes(term))
      : contacts;
    if (sort === "recent") return list;
    return [...list].sort((a, b) =>
      sort === "value"
        ? Number(b.estimatedValue ?? 0) - Number(a.estimatedValue ?? 0)
        : a.stageChangedAt.getTime() - b.stageChangedAt.getTime(),
    );
  }, [contacts, search, sort]);

  const active = contacts.find((c) => c.id === activeId);
  const total = stages.reduce((n, s) => n + visible.filter((c) => c.stageId === s.id).length, 0);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const contactId = String(e.active.id);
    const stageId = e.over ? String(e.over.id) : null;
    const contact = contacts.find((c) => c.id === contactId);
    if (!stageId || !contact || contact.stageId === stageId) return;

    const previous = contacts;
    setContacts((cs) => cs.map((c) => (c.id === contactId ? { ...c, stageId, stageChangedAt: new Date() } : c)));
    const stage = stages.find((s) => s.id === stageId)!;

    startTransition(async () => {
      try {
        await moveContactToStage(contactId, stageId);
        toast.success(`${fullName(contact)} → ${stage.name}`);
      } catch {
        setContacts(previous);
        toast.error("Impossible de déplacer le contact. Réessayez.");
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer les cartes…"
            aria-label="Filtrer les cartes"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="sm:w-56" aria-label="Trier">
            <ArrowDownWideNarrow className="size-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Plus récents</SelectItem>
            <SelectItem value="value">Valeur la plus élevée</SelectItem>
            <SelectItem value="days">Depuis le plus longtemps</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground sm:ml-auto">
          {total} contact{total > 1 ? "s" : ""} sur {stages.length} étapes
        </p>
      </div>

      <DndContext
        id="pipeline-board" // stable id keeps server and client a11y ids in sync (no hydration mismatch)
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
          {stages.map((stage) => {
            const items = visible.filter((c) => c.stageId === stage.id);
            const value = items.reduce((n, c) => n + Number(c.estimatedValue ?? 0), 0);
            return (
              <Column key={stage.id} stage={stage} count={items.length} value={value}>
                {items.map((c) => (
                  <DraggableCard key={c.id} contact={c} onOpen={() => setOpenId(c.id)} />
                ))}
              </Column>
            );
          })}
        </div>
        <DragOverlay>{active && <CardBody contact={active} className="rotate-2 shadow-2xl" />}</DragOverlay>
      </DndContext>

      <ContactQuickView contactId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function Column({
  stage,
  count,
  value,
  children,
}: {
  stage: Stage;
  count: number;
  value: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      className={cn(
        "flex max-h-[calc(100vh-16rem)] min-h-64 w-76 shrink-0 flex-col rounded-2xl border border-border bg-card/60 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <header className="flex items-center gap-2 px-4 py-3">
        <span className={cn("size-2 rounded-full", stageDot[stage.color] ?? stageDot.slate)} />
        <h2 className="text-[11px] font-semibold tracking-wider uppercase">{stage.name}</h2>
        <span className="rounded-md bg-secondary px-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
          {count}
        </span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{value ? formatMoney(value) : ""}</span>
      </header>
      <div className="grid gap-2.5 overflow-y-auto px-2.5 pb-2.5">{children}</div>
    </section>
  );
}

function DraggableCard({ contact, onOpen }: { contact: PipelineContact; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: contact.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter") onOpen();
      }}
    >
      <CardBody contact={contact} />
    </div>
  );
}

function CardBody({ contact, className }: { contact: PipelineContact; className?: string }) {
  const days = daysSince(contact.stageChangedAt);
  const stale = days >= STALE_AFTER_DAYS;
  return (
    <div
      className={cn(
        "cursor-grab rounded-xl border border-border bg-background/70 p-3.5 text-sm transition-colors hover:border-primary/40 active:cursor-grabbing",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{fullName(contact)}</span>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            stale ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success",
          )}
          title="Temps passé dans cette étape"
        >
          {days} j
        </span>
      </div>
      <p className="mt-1.5 text-lg font-bold text-primary tabular-nums">
        {contact.estimatedValue ? formatMoney(contact.estimatedValue) : "—"}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold">
            {initials(fullName(contact))}
          </span>
          <span className="truncate">{contact.source ?? "Source inconnue"}</span>
        </span>
        {contact.nextTaskDue ? (
          <FollowUpBadge nextDue={contact.nextTaskDue} />
        ) : (
          <Clock className="size-3.5 text-muted-foreground/50" aria-hidden />
        )}
      </div>
    </div>
  );
}
