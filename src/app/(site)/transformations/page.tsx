import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { FinalCta, SectionHeading, Statement } from "@/components/site/blocks";
import { CaseBlock, CaseHeader, CaseQuote, ChangeList, KeyPiece } from "@/components/site/case-study";
import { Container, GoldLine, Section } from "@/components/site/ui";
import { getPublicCaseStudies } from "@/server/queries/site";

export const metadata: Metadata = {
  title: "Transformations",
  description:
    "Quand on comprend mieux son parcours, on ne se présente plus de la même manière. Deux cas pratiques de la Méthode JG® : Yannick et Jean-Gabriel.",
  alternates: { canonical: "/transformations" },
};

export default function TransformationsPage() {
  return (
    <>
      <Section className="pt-10 md:pt-16 lg:pt-20">
        <Container>
          <SectionHeading
            as="h1"
            eyebrow="Transformations"
            title="Quand on comprend mieux son parcours, on ne se présente plus de la même manière."
          >
            <p>
              Ces deux parcours montrent comment révéler ce qui faisait déjà leur valeur a transformé leur manière de se
              positionner, de décider et d’agir.
            </p>
          </SectionHeading>
        </Container>
      </Section>

      {/* Yannick */}
      <Section tone="ivory" id="yannick" className="scroll-mt-20">
        <Container>
          <CaseHeader name="Yannick" domain="Comptabilité / gestion" />
          <div className="mt-12 grid gap-10">
            <CaseBlock label="Avant">
              <CaseQuote>Je sais ce que je fais, mais j’ai du mal à expliquer ce qui me correspond vraiment.</CaseQuote>
              <p>
                Yannick avait notamment du mal à se projeter professionnellement et à mettre des mots précis sur ce qui
                l’animait réellement.
              </p>
              <p>Son parcours, ses expériences et ses qualités existaient déjà.</p>
              <p>Mais les éléments étaient encore dispersés.</p>
            </CaseBlock>
            <CaseBlock label="Le déclic">
              <p>
                En travaillant sur son Architecture Identitaire, nous avons commencé à relier ses expériences, ses
                comportements, ses valeurs et ce qui le motive réellement.
              </p>
              <KeyPiece label="Le moment révélateur">
                <p>
                  Une anecdote personnelle a notamment permis de faire émerger un élément révélateur : derrière
                  certaines de ses décisions se trouvait une volonté forte de rechercher ce qui est le plus juste pour
                  l’intérêt collectif.
                </p>
                <p className="mt-4 font-sans text-[1.0625rem] font-normal text-white/85">
                  Ce qui semblait être une simple anecdote devenait alors un indice de son fonctionnement.
                </p>
              </KeyPiece>
              <p>
                Le travail n’était plus seulement de chercher « quel métier faire », mais de comprendre « qui je suis
                dans ce que je fais ».
              </p>
            </CaseBlock>
            <CaseBlock label="Après">
              <CaseQuote>
                Je comprends mieux ce qui me caractérise et pourquoi certaines situations me correspondent davantage que
                d’autres.
              </CaseQuote>
              <p>Yannick commence à mettre en cohérence son parcours, ses qualités, ses comportements et ses motivations.</p>
              <p>Il ne s’agit plus simplement de trouver les bons mots pour parler de lui.</p>
              <p>
                Il commence à comprendre le fil conducteur qui relie ses expériences et ce qu’il peut apporter
                professionnellement.
              </p>
            </CaseBlock>
            <CaseBlock label="Ce qui a changé">
              <ChangeList
                items={[
                  "De la recherche d’un métier → à la compréhension de son identité professionnelle.",
                  "De « qu’est-ce que je peux faire ? » → à « qu’est-ce que j’apporte naturellement ? »",
                  "De la description de son parcours → à la compréhension de ce qui le relie.",
                ]}
              />
            </CaseBlock>
          </div>
        </Container>
      </Section>

      {/* Jean-Gabriel */}
      <Section id="jean-gabriel" className="scroll-mt-20">
        <Container>
          <CaseHeader name="Jean-Gabriel" domain="Data, BI & transformation des organisations" />
          <div className="mt-12 grid gap-10">
            <CaseBlock label="Avant">
              <CaseQuote>
                Je sais parfaitement ce que je fais. Mais j’ai du mal à expliquer clairement ce que j’apporte réellement.
              </CaseQuote>
              <p>
                Après près de 30 ans de carrière dans l’industrie et la recherche, Jean-Gabriel disposait d’une expertise
                riche : données, modélisation, BI, analyse, processus et accompagnement des organisations.
              </p>
              <p>
                Pourtant, lorsqu’il s’agissait de parler de son positionnement, il revenait naturellement à la
                description de ses compétences et de ses fonctions.
              </p>
              <p>
                <strong>Il décrivait ce qu’il faisait davantage que ce qu’il provoquait.</strong>
              </p>
            </CaseBlock>
            <CaseBlock label="Le déclic">
              <p>Le travail autour du Territoire de valeurs a permis de déplacer progressivement son regard.</p>
              <p>Au lieu de chercher uniquement à répondre à :</p>
              <CaseQuote>Qu’est-ce que je sais faire ?</CaseQuote>
              <p>nous avons commencé à explorer :</p>
              <CaseQuote>
                Qu’est-ce que je permets aux organisations de comprendre, de transformer ou de révéler grâce à ce que je
                sais faire ?
              </CaseQuote>
              <p>Les différentes expériences, compétences et dimensions de son parcours ont commencé à se relier.</p>
              <ul className="flex flex-wrap gap-2">
                {["Les données.", "Les processus.", "Les équipes.", "L’analyse.", "L’accompagnement."].map((w) => (
                  <li
                    key={w}
                    className="rounded-[7px] border border-[var(--jg-light-gray)] bg-ivory px-3 py-1.5 font-heading text-[15px] font-medium text-navy"
                  >
                    {w}
                  </li>
                ))}
              </ul>
              <p>Ce qui semblait être plusieurs expertises distinctes commençait à révéler un même fil conducteur.</p>
            </CaseBlock>
            <CaseBlock label="Après">
              <p>Une formulation de positionnement a progressivement émergé :</p>
              <KeyPiece label="Sa formulation de positionnement">
                « Révéler le potentiel caché des organisations grâce à une meilleure compréhension de leurs données, de
                leurs processus et de leurs équipes. »
              </KeyPiece>
              <p>Le changement n’est pas simplement lexical.</p>
              <p>
                Jean-Gabriel commence à passer d’une présentation centrée sur ses outils et ses compétences à une
                formulation centrée sur la valeur qu’il crée pour l’organisation.
              </p>
              <p>Il ne s’agit plus seulement de dire ce qu’il maîtrise.</p>
              <p>Il commence à pouvoir expliquer ce que son expertise permet de révéler.</p>
            </CaseBlock>
            <CaseBlock label="Ce qui a changé">
              <ChangeList
                items={[
                  "De « ce que je fais » → à « ce que je provoque ».",
                  "De l’accumulation d’expertises → à un fil conducteur.",
                  "De la description d’un parcours → à la révélation d’une valeur.",
                  "De plusieurs compétences → à une identité professionnelle plus lisible.",
                ]}
              />
            </CaseBlock>
          </div>
        </Container>
      </Section>

      {/* Case studies written in the CRM, published with the client's consent */}
      <Suspense fallback={null}>
        <CrmCaseStudies />
      </Suspense>

      <Section tone="ivory">
        <Container>
          <GoldLine />
          <h2 className="jg-h2 mt-6 max-w-[860px]">Deux parcours. Deux points de départ. Une même logique.</h2>
          <p className="mt-6 font-heading text-[1.25rem] font-semibold tracking-[0.08em] text-navy uppercase">
            Observer. Relier. Révéler.
          </p>
          <Statement className="mt-10 max-w-[720px]">
            <p>La Méthode JG® ne cherche pas à créer une nouvelle identité.</p>
            <p className="mt-1">Elle permet de rendre visible ce qui était déjà là.</p>
          </Statement>
        </Container>
      </Section>

      <FinalCta
        title="Et si votre parcours racontait lui aussi quelque chose que vous n’avez jamais vu ?"
        source="transformations"
      />
    </>
  );
}

async function CrmCaseStudies() {
  await connection();
  const cases = await getPublicCaseStudies();
  if (cases.length === 0) return null;
  return (
    <Section id="autres-parcours" className="scroll-mt-20 border-t border-[var(--jg-light-gray)]">
      <Container>
        <SectionHeading eyebrow="Transformations" title="D’autres parcours" />
        <ul className="mt-12 grid gap-6 lg:grid-cols-2">
          {cases.map((c) => (
            <li key={c.id} className="rounded-[12px] border border-[var(--jg-light-gray)] bg-white p-7 md:p-9">
              <CaseHeader as="h3" name={c.firstName} domain={c.stake} />
              <dl className="mt-8 grid gap-6">
                {[
                  { label: "Avant", text: c.before },
                  { label: "Le déclic", text: c.trigger },
                  { label: "Après", text: c.after },
                ]
                  .filter((step) => step.text)
                  .map((step) => (
                    <div key={step.label}>
                      <dt className="flex items-center gap-3 font-heading text-[13px] font-semibold tracking-[0.16em] text-navy uppercase">
                        <span aria-hidden className="h-0.5 w-6 bg-gold" />
                        {step.label}
                      </dt>
                      <dd className="mt-2 whitespace-pre-line">{step.text}</dd>
                    </div>
                  ))}
              </dl>
              {c.positioningStatement && (
                <div className="mt-8">
                  <KeyPiece label="Formulation de positionnement">« {c.positioningStatement} »</KeyPiece>
                </div>
              )}
              {c.changes.length > 0 && (
                <div className="mt-8">
                  <p className="font-heading text-[13px] font-semibold tracking-[0.16em] text-navy uppercase">
                    Ce qui a changé
                  </p>
                  <div className="mt-3">
                    <ChangeList items={c.changes} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
