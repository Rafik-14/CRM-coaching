import { TriangleAlert } from "lucide-react";
import { Container, Eyebrow, GoldLine, Section } from "./ui";

/**
 * Legal pages (CGV, mentions légales, which also hold the privacy and cookie information). The texts are drafts:
 * every page shows a banner, and each missing piece is marked with <ToComplete>, until the client
 * (or their adviser) supplies the final wording.
 */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="max-w-[880px]">
        <Eyebrow>Informations</Eyebrow>
        <GoldLine className="mt-4" />
        <h1 className="jg-h2 mt-6">{title}</h1>
        <div
          role="note"
          className="mt-8 flex gap-3 rounded-[10px] border border-[#8a5a0b]/30 bg-[#8a5a0b]/8 p-5 text-[#5c3c07]"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
          <p className="jg-small">
            <strong className="text-[#5c3c07]">Texte provisoire, à compléter par le client.</strong> Les passages
            signalés « à compléter » doivent être fournis ou validés par Jérémy Galéa ou son conseil avant la mise en
            ligne.
          </p>
        </div>
        <div className="mt-10 grid gap-10">
          {children}
        </div>
      </Container>
    </Section>
  );
}

/** A piece of information the client still has to provide. */
export function ToComplete({ children = "à compléter" }: { children?: React.ReactNode }) {
  return (
    <span className="rounded-[4px] bg-[#8a5a0b]/12 px-1.5 py-0.5 font-semibold text-[#5c3c07]">[{children}]</span>
  );
}

export function LegalSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={id ? "scroll-mt-28" : undefined}>
      <h2 className="jg-h4">{title}</h2>
      <div className="mt-3 [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:grid [&_ul]:gap-1">{children}</div>
    </section>
  );
}
