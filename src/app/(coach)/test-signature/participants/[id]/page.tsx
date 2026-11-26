import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/server/db";
import { activityLog } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { participantFile } from "@/server/revelateur/crm";
import { CallbackActions } from "../../crm-actions";
import { CALLBACK_LABEL, configText, DELIVERY_LABEL, EVENT_LABEL, fmtDate } from "../../labels";

export const metadata: Metadata = { title: "Participant · Le Révélateur" };

/** Participant record (annexe 07 §4.2): a file to consult, not a permission to contact. */
export default function ParticipantPage({ params }: PageProps<"/test-signature/participants/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[30rem] rounded-2xl" />}>
      <Participant params={params} />
    </Suspense>
  );
}

const box = "rounded-xl border border-border bg-card p-5";
const h2 = "text-sm font-semibold";

async function Participant({ params }: { params: PageProps<"/test-signature/participants/[id]">["params"] }) {
  await requireCoach();
  const { id } = await params;
  const f = await participantFile(db, id);
  if (!f) notFound();
  await db.insert(activityLog).values({ entity: "revelateur_participant", entityId: id, action: "viewed" });
  const { participant: p } = f;
  const callbackOpen = f.consents.some((c) => c.type === "callback" && c.choice && !c.withdrawnAt);

  return (
    <>
      <PageHeader title={p.firstName || p.email} description="Participant au Test Signature JG® · fiche consultable, pas une autorisation de contact">
        <Link href="/test-signature" className="text-sm text-primary hover:underline">
          ← Le Révélateur
        </Link>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className={box}>
          <h2 className={h2}>Identité</h2>
          <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Prénom</dt>
            <dd>{p.firstName || "—"}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{p.email}</dd>
            <dt className="text-muted-foreground">Téléphone</dt>
            <dd>{f.callbacks[0]?.phone ?? "Seulement en cas de demande de rappel"}</dd>
            <dt className="text-muted-foreground">Premier test</dt>
            <dd>{fmtDate(p.createdAt)}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{callbackOpen ? "A demandé à être rappelé(e)." : "Aucune demande de contact : ne pas solliciter cette personne."}</p>
        </section>

        <section className={box}>
          <h2 className={h2}>Demandes de rappel</h2>
          {f.callbacks.length ? (
            <ul className="mt-3 grid gap-3 text-sm">
              {f.callbacks.map((c) => (
                <li key={c.id} className="grid gap-1.5">
                  <span>
                    {fmtDate(c.requestedAt)} · <strong>{CALLBACK_LABEL[c.status]}</strong> · {c.phone}
                    {c.outcome ? <span className="text-muted-foreground"> · {c.outcome}</span> : null}
                  </span>
                  {(c.status === "pending" || c.status === "in_progress") && <CallbackActions id={c.id} status={c.status} />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aucune.</p>
          )}
        </section>

        <section className={`${box} lg:col-span-2`}>
          <h2 className={h2}>Passations</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                <th className="py-2">Date</th>
                <th>Statut</th>
                <th>Configuration</th>
                <th>Rapport</th>
                <th>Versions</th>
              </tr>
            </thead>
            <tbody>
              {f.sessions.map((s) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="py-2">
                    <Link href={`/test-signature/sessions/${s.id}`} className="hover:underline">
                      {fmtDate(s.confirmedAt ?? s.startedAt)}
                    </Link>
                  </td>
                  <td>{s.status === "complete" ? "Terminée" : s.status === "in_progress" ? "En cours" : "Invalide"}</td>
                  <td>{configText(s.configuration, s.profile)}</td>
                  <td>{s.delivery ? DELIVERY_LABEL[s.delivery] : "—"}</td>
                  <td className="text-xs text-muted-foreground">
                    Q {s.questionnaireVersion} · calcul {s.scoringVersion ?? "—"} · interprétation {s.interpretationVersion ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={box}>
          <h2 className={h2}>Appels découverte</h2>
          {f.calls.length ? (
            <ul className="mt-3 grid gap-1.5 text-sm">
              {f.calls.map((c) => (
                <li key={c.id}>
                  {fmtDate(c.startsAt)} ·{" "}
                  {c.status === "planned" ? (c.startsAt > new Date() ? "Confirmé, à venir" : "Passé") : c.status === "cancelled" ? "Annulé" : c.status === "done" ? "Réalisé" : "Absent"} ·{" "}
                  <Link href={`/contacts/${c.contactId}`} className="text-primary hover:underline">
                    fiche client
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aucun.</p>
          )}
        </section>

        <section className={box}>
          <h2 className={h2}>Consentements</h2>
          {f.consents.length ? (
            <ul className="mt-3 grid gap-1.5 text-sm">
              {f.consents.map((c) => (
                <li key={c.id}>
                  {c.type === "callback" ? "Demande de rappel" : c.type} · {c.choice ? "accepté" : "refusé"} le {fmtDate(c.capturedAt)} · texte {c.textVersion} · {c.source}
                  {c.withdrawnAt ? <span className="text-muted-foreground"> · retiré le {fmtDate(c.withdrawnAt)}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aucun consentement facultatif donné.</p>
          )}
        </section>

        <section className={`${box} lg:col-span-2`}>
          <h2 className={h2}>Historique</h2>
          <ul className="mt-3 grid gap-1 text-sm">
            {f.events.map((e) => (
              <li key={e.id}>
                <span className="text-muted-foreground">{fmtDate(e.occurredAt)}</span> · {EVENT_LABEL[e.type] ?? e.type}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
