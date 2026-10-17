"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { formatMoney, offerPrice } from "@/lib/format";
import { PAYMENT_STATUSES, paymentLabel } from "@/lib/validations/phase1";
import { assignPackage, removeClientPackage, setPaymentStatus } from "@/server/actions/client-data";
import type { ActionState } from "@/server/actions/coaching";
import { PackageInvoiceButton } from "@/components/invoices/invoice-actions";

type ClientPackage = {
  id: string;
  sessionsUsed: number;
  paymentStatus: (typeof PAYMENT_STATUSES)[number];
  /** Price and currency at the time of sale (null only for very old rows). */
  price: string | null;
  currency: string | null;
  package: { name: string; sessionsCount: number; price: string; currency: string };
};
type PackageOption = { id: string; name: string; sessionsCount: number; price: string; priceChf: string | null };

export function PackagesPanel({
  contactId,
  currency,
  clientPackages,
  options,
}: {
  contactId: string;
  /** The contact's currency: decides which price list is used. */
  currency: string;
  clientPackages: ClientPackage[];
  options: PackageOption[];
}) {
  return (
    <div className="grid gap-4">
      {clientPackages.length === 0 && <p className="text-sm text-muted-foreground">Aucun accompagnement attribué.</p>}
      {clientPackages.map((cp) => (
        <PackageRow key={cp.id} cp={cp} />
      ))}
      <AssignPackageDialog contactId={contactId} currency={currency} options={options} />
    </div>
  );
}

function PackageRow({ cp }: { cp: ClientPackage }) {
  const [pending, startTransition] = useTransition();
  const pct = Math.min(100, Math.round((cp.sessionsUsed / cp.package.sessionsCount) * 100));
  const remaining = cp.package.sessionsCount - cp.sessionsUsed;

  return (
    <div className="grid gap-2 rounded-xl border border-border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{cp.package.name}</span>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {formatMoney(cp.price ?? cp.package.price, cp.currency ?? cp.package.currency)}
          <PackageInvoiceButton clientPackageId={cp.id} />
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${remaining <= 0 ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {cp.sessionsUsed} / {cp.package.sessionsCount} séances
          {remaining === 1 && <span className="ml-1 font-medium text-warning">· dernière séance</span>}
          {remaining <= 0 && <span className="ml-1 font-medium text-success">· terminé</span>}
        </span>
        <div className="flex items-center gap-1">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          <Select
            value={cp.paymentStatus}
            onValueChange={(v) =>
              startTransition(async () => {
                await setPaymentStatus(cp.id, v as ClientPackage["paymentStatus"]);
                toast.success(`Paiement : ${paymentLabel[v as ClientPackage["paymentStatus"]].toLowerCase()}`);
              })
            }
          >
            <SelectTrigger size="sm" className="h-7 text-xs" aria-label="Statut du paiement">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {paymentLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cp.sessionsUsed === 0 && (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-label="Retirer l'accompagnement">
                  <Trash2 />
                </Button>
              }
              title="Retirer cet accompagnement ?"
              description="Aucune séance n'a encore été décomptée : il peut être retiré sans effet sur l'historique."
              confirmLabel="Retirer"
              successMessage="Accompagnement retiré"
              onConfirm={() => removeClientPackage(cp.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AssignPackageDialog({
  contactId,
  currency,
  options,
}: {
  contactId: string;
  currency: string;
  options: PackageOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await assignPackage(prev, fd);
    if (r.ok) {
      setOpen(false);
      toast.success("Accompagnement attribué");
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="justify-self-start">
          <Plus /> Attribuer un accompagnement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attribuer un accompagnement</DialogTitle>
          <DialogDescription>
            Prix en {currency === "CHF" ? "francs suisses" : "euros"} (devise du contact). Les séances effectuées seront
            décomptées automatiquement.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="contactId" value={contactId} />
          <FormField label="Accompagnement" htmlFor="packageId" error={state.fieldErrors?.packageId?.[0]}>
            <Select name="packageId" defaultValue={options[0]?.id}>
              <SelectTrigger id="packageId" className="w-full">
                <SelectValue placeholder="Choisissez un accompagnement" />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {p.sessionsCount} séance{p.sessionsCount > 1 ? "s" : ""} ·{" "}
                    {formatMoney(offerPrice(p, currency).amount, offerPrice(p, currency).currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Paiement" htmlFor="paymentStatus">
            <Select name="paymentStatus" defaultValue="pending">
              <SelectTrigger id="paymentStatus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {paymentLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending || options.length === 0}>
              {pending && <Loader2 className="animate-spin" />}
              Attribuer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
