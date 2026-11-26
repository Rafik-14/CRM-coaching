import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DIMENSION_NAMES, formatScore, LEVELS } from "@/lib/revelateur/scoring";
import { db } from "@/server/db";
import { activityLog, revelateurDeliveries, revelateurResults, revelateurSessions } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { ResendReport } from "../../crm-actions";
import { configText, DELIVERY_LABEL, fmtDate } from "../../labels";

export const metadata: Metadata = { title: "Passation · Le Révélateur" };

/** One passation: scores, configuration, interpretation decisions with their evidence, delivery. Coach only. */
export default function SessionPage({ params }: PageProps<"/test-signature/sessions/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[30rem] rounded-2xl" />}>
      <Session params={params} />
    </Suspense>
  );
}

const box = "rounded-xl border border-border bg-card p-5";
const lvl = (p: string) => (p === "SUFFISANT" ? "suffisant" : "nuancé");

async function Session({ params }: { params: PageProps<"/test-signature/sessions/[id]">["params"] }) {
  await requireCoach();
  const { id } = await params;
  const [s, r, d] = await Promise.all([
    db.query.revelateurSessions.findFirst({ where: eq(revelateurSessions.id, id) }),
    db.query.revelateurResults.findFirst({ where: eq(revelateurResults.sessionId, id) }),
    db.query.revelateurDeliveries.findFirst({ where: eq(revelateurDeliveries.sessionId, id) }),
  ]);
  if (!s) notFound();
  await db.insert(activityLog).values({ entity: "revelateur_session", entityId: id, action: "viewed" });
  const it = r?.interpretation;

  return (
    <>
      <PageHeader
        title={`Passation du ${fmtDate(s.confirmedAt ?? s.startedAt)}`}
        description={r ? configText(r.snapshot.configuration.code, r.snapshot.configuration.profile) : "Passation non terminée"}
      >
        <Link href={s.participantId ? `/test-signature/participants/${s.participantId}` : "/test-signature"} className="text-sm text-primary hover:underline">
          ← {s.participantId ? "Fiche participant" : "Le Révélateur"}
        </Link>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        {r && (
          <section className={box}>
            <h2 className="text-sm font-semibold">Cartographie</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {r.snapshot.dimensions.map((x) => (
                  <tr key={x.dimension} className="border-t border-border/60">
                    <td className="py-1.5">
                      {x.dimension} · {DIMENSION_NAMES[x.dimension]}
                    </td>
                    <td className="text-right font-semibold tabular-nums">{formatScore(x.score)}</td>
                    <td className="pl-3 text-muted-foreground">
                      {LEVELS[x.level]}
                      {x.heterogeneous ? " · réponses hétérogènes" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Questionnaire {r.questionnaireVersion} · calcul {r.scoringEngineVersion} · interprétation {r.interpretationEngineVersion ?? "—"}
            </p>
          </section>
        )}

        <section className={box}>
          <h2 className="text-sm font-semibold">Rapport</h2>
          {d ? (
            <dl className="mt-3 grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Statut</dt>
              <dd>{DELIVERY_LABEL[d.status]}</dd>
              <dt className="text-muted-foreground">Adresse</dt>
              <dd>{d.email}</dd>
              <dt className="text-muted-foreground">Envoyé le</dt>
              <dd>{fmtDate(d.sentAt)}</dd>
              <dt className="text-muted-foreground">Tentatives</dt>
              <dd>
                {d.attempts}
                {d.lastError ? <span className="text-muted-foreground"> · {d.lastError}</span> : null}
              </dd>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Aucune adresse donnée pour l’instant.</p>
          )}
          {r && (
            <div className="mt-4 grid gap-3">
              <a href={`/test-signature/sessions/${id}/rapport`} target="_blank" rel="noopener" className="text-sm text-primary hover:underline">
                Ouvrir le rapport PDF
              </a>
              {d && d.status !== "awaiting_verification" && <ResendReport sessionId={id} />}
            </div>
          )}
        </section>

        {s.openAnswer && (
          <section className={`${box} lg:col-span-2`}>
            <h2 className="text-sm font-semibold">Question ouverte (contexte, jamais notée)</h2>
            <p className="mt-2 text-sm whitespace-pre-line">{s.openAnswer}</p>
          </section>
        )}

        {it && (
          <section className={`${box} lg:col-span-2`}>
            <h2 className="text-sm font-semibold">Décisions d’interprétation (interne, jamais dans le rapport)</h2>
            <p className="mt-1 text-xs text-muted-foreground">{it.meta.paramsStatus}</p>
            <ul className="mt-3 grid gap-1.5 text-sm">
              {it.resources.map((x) => (
                <li key={x.facet}>
                  Ressource {x.resourceCode.replace("RESOURCE_", "")} · {x.dimension} ({x.facet}) · {lvl(x.proofLevel)} · preuves {x.evidence.join(", ")}
                </li>
              ))}
              {it.axes.map((x) => (
                <li key={x.axisCode}>
                  Axe {x.priority === "primary" ? "prioritaire" : "complémentaire"} {x.axisCode} « {x.title} » · {lvl(x.proofLevel)} · preuves {x.evidence.join(", ")}
                </li>
              ))}
              {it.crossings.map((x) => (
                <li key={x.crossingCode}>
                  Croisement {x.crossingCode} · écart {formatScore(x.signedGap)} · {lvl(x.proofLevel)} · preuves {x.evidence.join(", ")}
                </li>
              ))}
              {!it.resources.length && !it.axes.length && !it.crossings.length && <li className="text-muted-foreground">Aucun élément retenu.</li>}
            </ul>
            {it.qualityControl.warnings.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Avertissements : {it.qualityControl.warnings.join(" · ")}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{it.qualityControl.excluded.length} candidat(s) écarté(s), conservés avec leur raison pour la traçabilité.</p>
          </section>
        )}
      </div>
    </>
  );
}
