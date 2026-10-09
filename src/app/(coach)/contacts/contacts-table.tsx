"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, MoreVertical, SquareArrowOutUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StageBadge } from "@/components/stage-badge";
import { FollowUpBadge } from "@/components/follow-up-badge";
import { ContactQuickView } from "@/components/contact-quick-view";
import { formatMoney, fullName, initials } from "@/lib/format";
import type { ContactRow } from "@/server/queries/contacts";

const avatarTones = ["bg-primary/20 text-primary", "bg-info/20 text-info", "bg-success/20 text-success", "bg-warning/20 text-warning"];

/** `lastActivityLabel` is computed on the server so the text matches during hydration. */
export function ContactsTable({
  rows,
  empty,
}: {
  rows: (ContactRow & { lastActivityLabel: string | null })[];
  /** Shown instead of the table body when there are no rows. */
  empty?: React.ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5 text-[11px] tracking-wider uppercase">Contact</TableHead>
            <TableHead className="text-[11px] tracking-wider uppercase">Étape</TableHead>
            <TableHead className="hidden text-[11px] tracking-wider uppercase md:table-cell">Valeur</TableHead>
            <TableHead className="hidden text-[11px] tracking-wider uppercase xl:table-cell">Dernière activité</TableHead>
            <TableHead className="hidden text-[11px] tracking-wider uppercase sm:table-cell">Suivi</TableHead>
            <TableHead className="w-12 pr-5">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="whitespace-normal">
                {empty ?? <p className="py-12 text-center text-muted-foreground">Aucun contact trouvé.</p>}
              </TableCell>
            </TableRow>
          )}
          {rows.map((c, i) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
              <TableCell className="py-3 pl-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${avatarTones[i % avatarTones.length]}`}
                  >
                    {initials(fullName(c))}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/contacts/${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate font-medium hover:underline"
                    >
                      {fullName(c)}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">{c.email ?? c.phone ?? "—"}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StageBadge name={c.stageName} color={c.stageColor} />
              </TableCell>
              <TableCell className="hidden font-semibold tabular-nums md:table-cell">
                {c.estimatedValue ? formatMoney(c.estimatedValue) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground xl:table-cell first-letter:uppercase">
                {c.lastActivityLabel ?? "—"}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <FollowUpBadge nextDue={c.nextTaskDue} />
              </TableCell>
              <TableCell className="pr-5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions pour ${fullName(c)}`}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setOpenId(c.id)}>
                      <Eye /> Aperçu rapide
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/contacts/${c.id}`}>
                        <SquareArrowOutUpRight /> Ouvrir la fiche
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ContactQuickView contactId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
