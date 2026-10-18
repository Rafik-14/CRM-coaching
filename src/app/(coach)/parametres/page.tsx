import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Globe, ShieldCheck, UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { getSettingsOverview } from "@/server/queries/settings";
import { initials } from "@/lib/format";
import { getEmailOverview } from "@/server/queries/email";
import { getCalendarFeed } from "@/server/queries/calendar-feed";
import { CalendarFeedPanel } from "./calendar-feed-panel";
import { AvailabilityExceptions } from "./availability-exceptions";
import { EmailTemplates } from "./email-templates";
import { QuestionnaireEditor } from "./questionnaire-editor";
import { InvoicingSettingsForm } from "./invoicing-settings";
import { getInvoicingSettings } from "@/server/billing";
import { getQuestionnaire } from "@/server/questionnaire";
import { listTemplates } from "@/server/email/templates";
import { formatDayTime } from "@/lib/format";
import {
  BookingSettingsForm,
  BusinessForm,
  EmailNotifyForm,
  NoteTemplatesEditor,
  PackagesEditor,
  StagesEditor,
  TestEmailForm,
} from "./settings-forms";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsPage({ searchParams }: PageProps<"/parametres">) {
  return (
    <>
      <PageHeader title="Paramètres" description="Votre compte, votre activité et la configuration du CRM" />
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Settings searchParams={searchParams} />
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

const TABS = ["general", "pipeline", "forfaits", "notes", "reservation", "emails", "questionnaire", "agenda", "facturation"];

async function Settings({ searchParams }: { searchParams: PageProps<"/parametres">["searchParams"] }) {
  const onglet = (await searchParams).onglet;
  const initialTab = TABS.find((t) => t === onglet) ?? "general";
  const [{ user, business, stages, packages, templates, booking, exceptions, today }, email, feed] = await Promise.all([
    getSettingsOverview(),
    getEmailOverview(),
    getCalendarFeed(),
  ]);
  const [emailTemplates, questionnaire, invoicing] = await Promise.all([listTemplates(), getQuestionnaire(), getInvoicingSettings()]);
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
    <Tabs defaultValue={initialTab}>
      <TabsList className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto *:flex-none">
        <TabsTrigger value="general">Général</TabsTrigger>
        <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        <TabsTrigger value="forfaits">Accompagnements</TabsTrigger>
        <TabsTrigger value="notes">Modèles de note</TabsTrigger>
        <TabsTrigger value="reservation">Réservation en ligne</TabsTrigger>
        <TabsTrigger value="emails">E-mails</TabsTrigger>
        <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
        <TabsTrigger value="agenda">Agenda</TabsTrigger>
        <TabsTrigger value="facturation">Facturation</TabsTrigger>
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
        <Panel title="Mon activité" description="Nom affiché et devise par défaut">
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
                  ? "rounded-md bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
                  : "rounded-md bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning"
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
        <Panel
          title="Étapes du pipeline"
          description="Du premier contact jusqu'au client. L'ordre définit les colonnes. Planifier un échange stratégique fait passer un prospect de la 1re à la 2e étape ; le marquer effectué, de la 2e à la 3e."
        >
          <StagesEditor stages={stages} />
        </Panel>
      </TabsContent>

      <TabsContent value="forfaits" className="mt-6">
        <Panel
          title="Accompagnements"
          description="Vos offres, avec leur prix en euros et en francs suisses. Archivez une offre pour ne plus la proposer."
        >
          <PackagesEditor packages={packages} templates={templates.map((t) => ({ id: t.id, name: t.name }))} />
        </Panel>
      </TabsContent>

      <TabsContent value="reservation" className="mt-6 grid gap-6">
        <Panel
          title="Réservation en ligne"
          description="Vos disponibilités pour la page « Réserver un échange stratégique » du site et pour les liens personnels de vos clients (fiche client › Réservation en ligne). Les créneaux déjà pris par une séance prévue ne sont jamais proposés. Une réservation d'échange crée le contact (ou le retrouve par e-mail), la séance, une tâche, et fait passer le prospect à « Échange stratégique planifié »."
        >
          <BookingSettingsForm settings={booking} />
        </Panel>
        <Panel
          title="Absences et horaires exceptionnels"
          description="Vos disponibilités changent selon les situations : bloquez une journée, quelques jours ou quelques heures, ou ouvrez des horaires en plus. Modifiable à tout moment, le site se met à jour aussitôt. Les séances déjà prévues ne sont jamais annulées automatiquement."
        >
          <AvailabilityExceptions exceptions={exceptions} today={today} />
        </Panel>
      </TabsContent>

      <TabsContent value="emails" className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Envoi des e-mails" description="Configuré sur le serveur (fichier .env), jamais dans la base de données.">
          <Row
            label="État"
            value={
              email.config.configured ? (
                <span className="rounded-md bg-success/15 px-2.5 py-1 text-xs font-medium text-success">Envoi réel actif</span>
              ) : (
                <span className="rounded-md bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                  Mode test : e-mails enregistrés, pas envoyés
                </span>
              )
            }
          />
          <Row label="30 derniers jours" value={`${email.sent30} envoyé${email.sent30 > 1 ? "s" : ""} · ${email.failed30} échec${email.failed30 > 1 ? "s" : ""}`} />
          <Row
            label="Tâches automatiques"
            value={
              <span className={email.cronLate ? "text-warning" : undefined}>
                {email.lastRunAt ? `Dernière exécution : ${formatDayTime(email.lastRunAt)}` : "Jamais exécutées"}
                {email.cronLate && " · vérifier la tâche planifiée du serveur"}
              </span>
            }
          />
          <Row label="Serveur SMTP" value={email.config.host ? `${email.config.host}:${email.config.port}` : "—"} />
          <Row label="Expéditeur" value={email.config.from} />
          {email.config.redirectTo && (
            <Row
              label="Redirection de test"
              value={<span className="text-warning">Tous les e-mails vont à {email.config.redirectTo}</span>}
            />
          )}
          {email.config.missing.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">À compléter dans .env : {email.config.missing.join(", ")}</p>
          )}
        </Panel>
        <Panel title="Notifications et test">
          <div className="grid gap-6">
            <EmailNotifyForm notifyTo={email.notifyTo} fallback={email.coachEmail} />
            <TestEmailForm defaultTo={email.config.redirectTo ?? email.notifyTo ?? email.coachEmail} />
          </div>
        </Panel>
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-semibold">E-mails automatiques</h2>
          <p className="mt-0.5 mb-2 text-sm text-muted-foreground">
            Envoyés tout seuls au bon moment. Activez ou désactivez chacun, et modifiez son texte avec un aperçu. Les e-mails
            « facultatifs » ne partent pas aux contacts qui ont choisi de ne plus les recevoir.
          </p>
          <EmailTemplates templates={emailTemplates} />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="font-semibold">Derniers e-mails</h2>
          {email.recent.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucun e-mail pour l’instant.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {email.recent.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                  <span className="w-32 shrink-0 text-muted-foreground tabular-nums">{formatDayTime(m.createdAt)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{m.subject}</span>
                  <span className="text-muted-foreground">
                    {m.contact ? (
                      <Link href={`/contacts/${m.contact.id}`} className="hover:underline">
                        {m.to}
                      </Link>
                    ) : (
                      m.to
                    )}
                  </span>
                  <span
                    title={m.error ?? undefined}
                    className={
                      m.status === "failed"
                        ? "rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                        : m.providerId === "mode-test"
                          ? "rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                          : m.status === "sent"
                            ? "rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
                            : "rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {m.status === "failed" ? "Échec" : m.providerId === "mode-test" ? "Mode test" : m.status === "sent" ? "Envoyé" : "En cours"}
                  </span>
                  {m.status === "failed" && m.error && <p className="w-full text-xs text-destructive">{m.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </TabsContent>

      <TabsContent value="facturation" className="mt-6">
        <Panel
          title="Facturation"
          description="Les informations imprimées sur vos factures, conformes aux règles françaises. Elles sont copiées dans chaque facture au moment de son émission."
        >
          <InvoicingSettingsForm settings={invoicing} />
        </Panel>
      </TabsContent>

      <TabsContent value="questionnaire" className="mt-6">
        <Panel
          title="Questionnaire de départ"
          description="Envoyé au nouveau client dans l’e-mail de bienvenue, ou depuis sa fiche. Ses réponses arrivent dans sa fiche, onglet « Questionnaire », et vous êtes prévenu."
        >
          <QuestionnaireEditor questionnaire={questionnaire} />
        </Panel>
      </TabsContent>

      <TabsContent value="agenda" className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Vos séances dans votre agenda"
          description="Un lien privé, en lecture seule, pour voir les séances du CRM dans Google Agenda, sur iPhone ou dans Outlook. Les séances sont ajoutées, déplacées ou retirées automatiquement."
        >
          <CalendarFeedPanel
            feed={
              feed && {
                url: feed.url,
                webcalUrl: feed.webcalUrl,
                createdLabel: formatDayTime(feed.createdAt),
                lastUsedLabel: feed.lastUsedAt ? formatDayTime(feed.lastUsedAt) : null,
              }
            }
          />
        </Panel>
        <Panel title="Ajouter le lien à votre agenda" description="Une seule fois, sur l’appareil de votre choix : il se synchronise ensuite partout.">
          <ol className="grid gap-4 text-sm">
            <li>
              <p className="font-medium">Google Agenda (ordinateur)</p>
              <p className="text-muted-foreground">
                Autres agendas, bouton « + » › « À partir de l’URL » › collez le lien › « Ajouter un agenda ». Il apparaît aussi
                sur votre téléphone Android.
              </p>
            </li>
            <li>
              <p className="font-medium">iPhone</p>
              <p className="text-muted-foreground">
                Réglages › Calendrier › Comptes › Ajouter un compte › Autre › « Ajouter un calendrier avec abonnement » › collez le
                lien.
              </p>
            </li>
            <li>
              <p className="font-medium">Outlook</p>
              <p className="text-muted-foreground">
                Calendrier › « Ajouter un calendrier » › « S’abonner à partir du web » › collez le lien.
              </p>
            </li>
          </ol>
          <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            Les agendas relisent le lien à leur rythme : quelques minutes sur iPhone, jusqu’à plusieurs heures pour Google
            Agenda. Le CRM reste la référence. Gardez ce lien pour vous : il montre vos rendez-vous (prénom et initiale,
            horaire, lieu), jamais vos notes. En cas de doute, « Régénérer » le désactive aussitôt.
          </p>
        </Panel>
      </TabsContent>

      <TabsContent value="notes" className="mt-6">
        <Panel
          title="Modèles de note"
          description="Un modèle par accompagnement ou par type de séance, construit sur la Méthode JG®."
        >
          <NoteTemplatesEditor templates={templates} />
        </Panel>
      </TabsContent>
    </Tabs>
  );
}
