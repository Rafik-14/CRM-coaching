"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { computeTotals, formatCents, parseAmount } from "@/lib/invoices";
import type { ActionState } from "@/server/actions/coaching";

export type InvoiceFormDefaults = {
  currency: string;
  billName: string;
  billCompany: string;
  billAddress: string;
  billEmail: string;
  billVatNumber: string;
  billReference: string;
  notes: string;
  lines: { description: string; quantity: number; unitCents: number }[];
};

export type ContactOption = { id: string; firstName: string; lastName: string; email: string | null; organization: string | null; currency: string };

type LineDraft = { description: string; quantity: string; unit: string };
const toDraft = (l: InvoiceFormDefaults["lines"][number]): LineDraft => ({
  description: l.description,
  quantity: String(l.quantity).replace(".", ","),
  unit: (l.unitCents / 100).toFixed(2).replace(".", ","),
});

/** Client, currency and lines of an invoice (new invoice or draft). Total shown live. */
export function InvoiceForm({
  action,
  defaults,
  contacts,
  vatRateBps,
  submitLabel,
  onSaved,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaults: InvoiceFormDefaults;
  /** For a new invoice: pick a contact to fill the client details. */
  contacts?: ContactOption[];
  vatRateBps: number;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const [v, setV] = useState(defaults);
  const [contactId, setContactId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(defaults.lines.length ? defaults.lines.map(toDraft) : [{ description: "", quantity: "1", unit: "" }]);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await action(prev, fd);
    if (r.ok) {
      toast.success(r.message ?? "Enregistré");
      onSaved?.();
    } else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const e = state.fieldErrors;

  const parsedLines = useMemo(
    () =>
      lines.map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity.replace(",", ".")) || 0,
        unitCents: parseAmount(l.unit) ?? 0,
      })),
    [lines],
  );
  const totals = computeTotals(parsedLines, vatRateBps);
  const set = (k: keyof InvoiceFormDefaults) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: ev.target.value });

  const pick = (id: string) => {
    setContactId(id);
    const c = contacts?.find((x) => x.id === id);
    if (c) setV({ ...v, billName: `${c.firstName} ${c.lastName}`.trim(), billCompany: c.organization ?? "", billEmail: c.email ?? "", currency: c.currency });
  };

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="lines" value={JSON.stringify(parsedLines)} />
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="currency" value={v.currency} />

      <div className="grid gap-4 sm:grid-cols-2">
        {contacts && (
          <FormField label="Contact" htmlFor="inv-contact" hint="Remplit les coordonnées du client.">
            <Select value={contactId} onValueChange={pick}>
              <SelectTrigger id="inv-contact" className="w-full">
                <SelectValue placeholder="Choisir un contact (facultatif)" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {`${c.firstName} ${c.lastName}`.trim()}
                    {c.organization ? ` · ${c.organization}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
        <FormField label="Devise" htmlFor="inv-currency">
          <Select value={v.currency} onValueChange={(c) => setV({ ...v, currency: c })}>
            <SelectTrigger id="inv-currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">Euros (€)</SelectItem>
              <SelectItem value="CHF">Francs suisses (CHF)</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <fieldset className="grid gap-4 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-medium">Facturé à</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nom *" htmlFor="billName" error={e?.billName?.[0]}>
            <Input id="billName" name="billName" value={v.billName} onChange={set("billName")} />
          </FormField>
          <FormField label="Société (si une entreprise paie)" htmlFor="billCompany">
            <Input id="billCompany" name="billCompany" value={v.billCompany} onChange={set("billCompany")} />
          </FormField>
          <FormField label="Adresse" htmlFor="billAddress">
            <Textarea id="billAddress" name="billAddress" rows={2} value={v.billAddress} onChange={set("billAddress")} />
          </FormField>
          <div className="grid gap-4">
            <FormField label="E-mail" htmlFor="billEmail" error={e?.billEmail?.[0]}>
              <Input id="billEmail" name="billEmail" type="email" value={v.billEmail} onChange={set("billEmail")} />
            </FormField>
          </div>
          <FormField label="N° de TVA du client (entreprise)" htmlFor="billVatNumber">
            <Input id="billVatNumber" name="billVatNumber" value={v.billVatNumber} onChange={set("billVatNumber")} />
          </FormField>
          <FormField label="Référence / bon de commande" htmlFor="billReference">
            <Input id="billReference" name="billReference" value={v.billReference} onChange={set("billReference")} />
          </FormField>
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">Lignes</legend>
        <div className="hidden grid-cols-[1fr_80px_120px_110px_36px] gap-2 px-1 text-xs text-muted-foreground sm:grid">
          <span>Désignation</span>
          <span>Qté</span>
          <span>Prix unitaire</span>
          <span className="text-right">Total</span>
          <span />
        </div>
        {lines.map((l, i) => {
          const p = parsedLines[i];
          return (
            <div key={i} className="grid grid-cols-[1fr_80px] gap-2 sm:grid-cols-[1fr_80px_120px_110px_36px] sm:items-center">
              <Input aria-label="Désignation" value={l.description} onChange={(ev) => setLines(lines.map((x, j) => (j === i ? { ...x, description: ev.target.value } : x)))} placeholder="Accompagnement, séance…" />
              <Input aria-label="Quantité" inputMode="decimal" value={l.quantity} onChange={(ev) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: ev.target.value } : x)))} />
              <Input aria-label="Prix unitaire" inputMode="decimal" value={l.unit} onChange={(ev) => setLines(lines.map((x, j) => (j === i ? { ...x, unit: ev.target.value } : x)))} placeholder="0,00" />
              <span className="text-right text-sm tabular-nums">{formatCents(Math.round(p.quantity * p.unitCents), v.currency)}</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Supprimer la ligne" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setLines([...lines, { description: "", quantity: "1", unit: "" }])}>
          <Plus /> Ajouter une ligne
        </Button>
        {e?.lines && <p className="text-xs text-destructive">{e.lines[0]}</p>}
      </fieldset>

      <div className="grid justify-items-end gap-1 text-sm">
        {vatRateBps > 0 && (
          <>
            <span className="text-muted-foreground">Total HT : {formatCents(totals.subtotalCents, v.currency)}</span>
            <span className="text-muted-foreground">
              TVA {vatRateBps / 100} % : {formatCents(totals.vatCents, v.currency)}
            </span>
          </>
        )}
        <span className="text-base font-semibold">Total : {formatCents(totals.totalCents, v.currency)}</span>
        {vatRateBps === 0 && <span className="text-xs text-muted-foreground">TVA non applicable, art. 293 B du CGI</span>}
      </div>

      <FormField label="Mention sur la facture (facultatif)" htmlFor="inv-notes">
        <Textarea id="inv-notes" name="notes" rows={2} value={v.notes} onChange={set("notes")} placeholder="Ex. : paiement en 3 fois, 1er versement ce jour." />
      </FormField>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
