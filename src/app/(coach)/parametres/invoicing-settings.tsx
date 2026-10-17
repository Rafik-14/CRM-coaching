"use client";

import { useActionState, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/form-field";
import type { InvoicingSettings } from "@/lib/invoices";
import { saveInvoicingSettings } from "@/server/actions/invoices";
import type { ActionState } from "@/server/actions/coaching";

/** Paramètres › Facturation: the details printed on every invoice (France). */
export function InvoicingSettingsForm({ settings: s }: { settings: InvoicingSettings }) {
  const [vatMode, setVatMode] = useState(s.vatMode);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await saveInvoicingSettings(prev, fd);
    if (r.ok) toast.success("Coordonnées de facturation enregistrées");
    else if (r.error) toast.error(r.error);
    return r;
  }, {});
  const e = state.fieldErrors;
  const field = (name: keyof InvoicingSettings, label: string, opts: { hint?: string; type?: string; placeholder?: string } = {}) => (
    <FormField label={label} htmlFor={`inv-${name}`} hint={opts.hint} error={e?.[name]?.[0]}>
      <Input id={`inv-${name}`} name={name} type={opts.type} defaultValue={String(s[name] ?? "")} placeholder={opts.placeholder} />
    </FormField>
  );

  return (
    <form action={formAction} className="grid gap-6">
      {s.isSample && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          Ces coordonnées sont des données d’exemple. Remplacez-les par les vôtres : tant qu’elles ne sont pas enregistrées, les
          factures portent la mention « données d’exemple ».
        </p>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Votre activité</legend>
        {field("legalName", "Nom ou raison sociale *")}
        {field("tradeName", "Nom commercial")}
        {field("legalForm", "Statut *", { placeholder: "Micro-entrepreneur, EI, SASU…" })}
        {field("siret", "SIRET *", { hint: "14 chiffres." })}
        <FormField label="Adresse *" htmlFor="inv-address" error={e?.address?.[0]}>
          <Textarea id="inv-address" name="address" rows={3} defaultValue={s.address} />
        </FormField>
        <div className="grid gap-4">
          {field("email", "E-mail *", { type: "email" })}
          {field("phone", "Téléphone")}
        </div>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">TVA</legend>
        <input type="hidden" name="vatMode" value={vatMode} />
        <label className="flex items-center gap-3 text-sm">
          <input type="radio" checked={vatMode === "franchise"} onChange={() => setVatMode("franchise")} className="size-4 accent-primary" />
          Franchise en base de TVA (« TVA non applicable, art. 293 B du CGI »)
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="radio" checked={vatMode === "vat"} onChange={() => setVatMode("vat")} className="size-4 accent-primary" />
          Assujetti à la TVA
        </label>
        <div className={vatMode === "vat" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          {field("vatNumber", "N° de TVA intracommunautaire", { placeholder: "FR00 123456789" })}
          {field("vatRate", "Taux de TVA (%)", { type: "number" })}
        </div>
        {vatMode === "franchise" && <input type="hidden" name="vatRate" value={s.vatRate} />}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Règlement</legend>
        {field("iban", "IBAN *")}
        {field("bic", "BIC")}
        {field("paymentTermsDays", "Délai de paiement (jours)", { type: "number", hint: "Entre la date de la facture et l’échéance." })}
        <FormField label="Relances (jours après l’échéance)" htmlFor="inv-reminderDays" hint="Ex. : 3, 10" error={e?.reminderDays?.[0]}>
          <Input id="inv-reminderDays" name="reminderDays" defaultValue={s.reminderDays.join(", ")} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Mention de retard de paiement *" htmlFor="inv-latePenaltyText" error={e?.latePenaltyText?.[0]}>
            <Textarea id="inv-latePenaltyText" name="latePenaltyText" rows={2} defaultValue={s.latePenaltyText} />
          </FormField>
        </div>
        {field("firstNumber", "Premier numéro de l’année", {
          type: "number",
          hint: "Si vous facturiez déjà ailleurs : le numéro suivant votre dernière facture.",
        })}
      </fieldset>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending && <Loader2 className="animate-spin" />}
        Enregistrer
      </Button>
    </form>
  );
}
