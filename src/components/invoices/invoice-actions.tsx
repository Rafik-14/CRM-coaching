"use client";

import { useActionState, useState, useTransition } from "react";
import { FilePlus2, FileX2, Loader2, Plus, Send, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { PAYMENT_METHODS, formatCents } from "@/lib/invoices";
import { addPayment, createInvoice, creditNoteAction, invoiceFromPackage, issueInvoiceAction, removeInvoiceDraft, removePayment, saveInvoiceDraft } from "@/server/actions/invoices";
import type { ActionState } from "@/server/actions/coaching";
import { InvoiceForm, type ContactOption, type InvoiceFormDefaults } from "./invoice-form";

const EMPTY: InvoiceFormDefaults = {
  currency: "EUR",
  billName: "",
  billCompany: "",
  billAddress: "",
  billEmail: "",
  billVatNumber: "",
  billReference: "",
  notes: "",
  lines: [],
};

/** Factures › « Nouvelle facture ». */
export function NewInvoiceDialog({ contacts, vatRateBps }: { contacts: ContactOption[]; vatRateBps: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nouvelle facture
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>Elle est créée en brouillon : vous la vérifiez, puis vous l’émettez.</DialogDescription>
        </DialogHeader>
        <InvoiceForm action={createInvoice} defaults={EMPTY} contacts={contacts} vatRateBps={vatRateBps} submitLabel="Créer le brouillon" />
      </DialogContent>
    </Dialog>
  );
}

/** Invoice page: edit the draft. */
export function DraftEditor({ id, defaults, vatRateBps }: { id: string; defaults: InvoiceFormDefaults; vatRateBps: number }) {
  return <InvoiceForm action={saveInvoiceDraft.bind(null, id)} defaults={defaults} vatRateBps={vatRateBps} submitLabel="Enregistrer le brouillon" />;
}

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionState>, ok?: string) =>
    start(async () => {
      const r = await fn();
      if (r?.error) toast.error(r.error);
      else if (ok || r?.message) toast.success(r?.message ?? ok);
    });
  return { pending, run };
}

export function IssueButton({ id, credit }: { id: string; credit: boolean }) {
  return (
    <ConfirmDialog
      trigger={
        <Button>
          <Send /> {credit ? "Émettre l’avoir" : "Émettre la facture"}
        </Button>
      }
      title={credit ? "Émettre cet avoir ?" : "Émettre cette facture ?"}
      description="Elle reçoit son numéro définitif et ne pourra plus être modifiée ni supprimée (en cas d’erreur, vous ferez un avoir)."
      confirmLabel="Émettre"
      onConfirm={async () => {
        const r = await issueInvoiceAction(id);
        if (r.error) return { error: r.error };
        toast.success(r.message ?? "Émise");
      }}
    />
  );
}

export function DeleteDraftButton({ id }: { id: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost">
          <Trash2 /> Supprimer le brouillon
        </Button>
      }
      title="Supprimer ce brouillon ?"
      description="Il n’a pas encore de numéro : vous pouvez le supprimer."
      onConfirm={async () => {
        const r = await removeInvoiceDraft(id);
        if (r?.error) return { error: r.error };
      }}
    />
  );
}

export function CreditNoteButton({ id }: { id: string }) {
  const { pending, run } = useRun();
  return (
    <Button variant="outline" disabled={pending} onClick={() => run(() => creditNoteAction(id))}>
      {pending ? <Loader2 className="animate-spin" /> : <FileX2 />} Faire un avoir
    </Button>
  );
}

export function PackageInvoiceButton({ clientPackageId }: { clientPackageId: string }) {
  const { pending, run } = useRun();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => invoiceFromPackage(clientPackageId))}>
      {pending ? <Loader2 className="animate-spin" /> : <FilePlus2 />} Facture
    </Button>
  );
}

/** « Enregistrer un paiement » (bank transfer, card in person, cash…). */
export function PaymentDialog({ invoiceId, dueCents, currency, today }: { invoiceId: string; dueCents: number; currency: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("virement");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await addPayment(invoiceId, prev, fd);
    if (r.ok) {
      toast.success("Paiement enregistré");
      setOpen(false);
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const e = state.fieldErrors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Wallet /> Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>Reste à payer : {formatCents(dueCents, currency)}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="method" value={method} />
          <FormField label={`Montant (${currency})`} htmlFor="pay-amount" error={e?.amount?.[0]}>
            <Input id="pay-amount" name="amount" inputMode="decimal" defaultValue={(dueCents / 100).toFixed(2).replace(".", ",")} />
          </FormField>
          <FormField label="Moyen de paiement" htmlFor="pay-method">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="pay-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHODS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Date" htmlFor="pay-date" error={e?.paidOn?.[0]}>
            <Input id="pay-date" name="paidOn" type="date" defaultValue={today} />
          </FormField>
          <FormField label="Référence (facultatif)" htmlFor="pay-ref">
            <Input id="pay-ref" name="reference" placeholder="N° de virement, de chèque…" />
          </FormField>
          <Button type="submit" disabled={pending} className="justify-self-start">
            {pending && <Loader2 className="animate-spin" />}
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RemovePaymentButton({ id }: { id: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label="Supprimer le paiement">
          <Trash2 />
        </Button>
      }
      title="Supprimer ce paiement ?"
      description="La facture repassera « à encaisser » si elle n’est plus couverte."
      successMessage="Paiement supprimé"
      onConfirm={() => removePayment(id)}
    />
  );
}
