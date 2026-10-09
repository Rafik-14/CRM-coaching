import type { Metadata } from "next";
import { Suspense } from "react";
import { Globe, ShieldCheck, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { getSettingsOverview } from "@/server/queries/settings";
import { initials } from "@/lib/format";
import { BusinessForm, NoteTemplateForm, PackagesEditor, StagesEditor } from "./settings-forms";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Paramètres" description="Votre compte, votre activité et la configuration du CRM" />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Settings />
      </Suspense>
    </>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-0.5 mb-4 text-sm text-muted-foreground">{description}</p>}
      {children}
    </section>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

async function Settings() {
  const { user, business, stages, packages, templates } = await getSettingsOverview();
  const template = templates[0];
  const origins = (process.env.SITE_FORM_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const endpoint = `${process.env.BETTER_AUTH_URL ?? "https://crm.example.com"}/api/formulaire-site`;
  const snippet = `<form action="${endpoint}" method="post">
  <input name="firstName" placeholder="Prénom" required>
  <input name="lastName" placeholder="Nom">
  <input name="email" type="email" placeholder="E-mail" required>
  <input name="phone" placeholder="Téléphone">
  <textarea name="message" placeholder="Votre message"></textarea>
  <!-- anti-spam : doit rester vide et caché -->
  <input name="website" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">Envoyer</button>
</form>`;

  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">Général</TabsTrigger>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="forfaits">Forfaits</TabsTrigger>
        <TabsTrigger value="notes">Modèle de note</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Mon compte">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ring-2 ring-primary/40">
              {initials(user.name)}
            </span>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Row label={<span className="inline-flex items-center gap-2"><UserRound className="size-4" />Rôle</span>} value="Coach" />
          <Row
            label={<span className="inline-flex items-center gap-2"><ShieldCheck className="size-4" />Sécurité</span>}
            value={<span className="text-xs text-muted-foreground">Double authentification : bientôt</span>}
          />
        </Panel>
        <Panel title="Mon activité" description="Nom affiché et devise des forfaits">
          <BusinessForm name={business.name} currency={business.currency} />
        </Panel>
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Globe className="size-4" /> Formulaire du site
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Chaque message envoyé depuis votre site crée un contact « Nouveau » et une tâche « Rappeler ».
              </p>
            </div>
            <span
              className={
                origins.length
                  ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
                  : "rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning"
              }
            >
              {origins.length ? `Actif pour ${origins.join(", ")}` : "À configurer (SITE_FORM_ORIGINS)"}
            </span>
          </div>
          <p className="mt-4 mb-2 text-sm">Code à coller sur le site :</p>
          <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-relaxed">
            <code>{snippet}</code>
          </pre>
        </section>
      </TabsContent>

      <TabsContent value="pipeline" className="mt-6">
        <Panel title="Étapes du pipeline" description="Du premier contact jusqu'au client. L'ordre définit les colonnes du pipeline.">
          <StagesEditor stages={stages} />
        </Panel>
      </TabsContent>

      <TabsContent value="forfaits" className="mt-6">
        <Panel title="Forfaits" description="Packs de séances proposés à vos clients. Archivez un forfait pour ne plus le proposer.">
          <PackagesEditor packages={packages} />
        </Panel>
      </TabsContent>

      <TabsContent value="notes" className="mt-6">
        <Panel title="Modèle de note" description="Rubriques remplies après chaque séance">
          <NoteTemplateForm fields={template?.fields ?? []} />
        </Panel>
      </TabsContent>
    </Tabs>
  );
}
