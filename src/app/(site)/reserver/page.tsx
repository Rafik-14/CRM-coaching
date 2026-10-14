import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CalendarDays, Clock, MessageCircle } from "lucide-react";
import { BookingWidget } from "@/components/site/booking-widget";
import { Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";
import { SEGMENT_VALUES } from "@/lib/jg";
import { getAvailability } from "@/server/booking";

export const metadata: Metadata = {
  title: "Réserver un échange stratégique",
  description:
    "Réservez en ligne un échange stratégique de 20 minutes avec Jérémy Galéa, sans engagement : parlons de votre situation.",
  alternates: { canonical: "/reserver" },
};

export default function ReserverPage({ searchParams }: PageProps<"/reserver">) {
  return (
    <Section className="pt-10 md:pt-16 lg:pt-20">
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <Eyebrow>Échange stratégique</Eyebrow>
          <GoldLine className="mt-4" />
          <h1 className="jg-h1 mt-6">Réserver un échange stratégique</h1>
          <p className="mt-6 font-heading text-[1.25rem] leading-snug font-medium text-navy">
            20 minutes pour parler de votre situation. Sans engagement.
          </p>
          <div className="jg-prose mt-8">
            <p>
              Il permet de comprendre votre situation, ce que vous cherchez à faire évoluer et ce qui vous amène
              aujourd’hui.
            </p>
            <p>
              Nous regardons ensuite ensemble si un accompagnement JG® est pertinent et, si c’est le cas, quel point de
              départ est le plus adapté à votre situation.
            </p>
          </div>
          <ul className="mt-8 grid gap-3">
            {[
              { icon: Clock, text: "20 minutes" },
              { icon: MessageCircle, text: "Gratuit et sans engagement" },
              { icon: CalendarDays, text: "Au créneau de votre choix" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 font-heading text-[15px] font-medium text-navy">
                <Icon aria-hidden className="size-5 text-gold" strokeWidth={1.75} />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[12px] border border-[var(--jg-light-gray)] bg-ivory p-6 md:p-10">
          <Suspense fallback={<WidgetSkeleton />}>
            <Booking searchParams={searchParams} />
          </Suspense>
        </div>
      </Container>
    </Section>
  );
}

async function Booking({ searchParams }: { searchParams: PageProps<"/reserver">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const profil = one(params.profil);
  const source = one(params.source).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const { config, days } = await getAvailability();
  return (
    <BookingWidget
      days={days}
      slotMinutes={config.slotMinutes}
      location={config.location}
      profil={(SEGMENT_VALUES as readonly string[]).includes(profil) ? profil : ""}
      source={source}
    />
  );
}

function WidgetSkeleton() {
  return (
    <div className="grid gap-4" aria-busy>
      <div className="h-6 w-48 animate-pulse rounded bg-white" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-[7px] bg-white" />
        ))}
      </div>
      <div className="h-6 w-56 animate-pulse rounded bg-white" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-[7px] bg-white" />
        ))}
      </div>
    </div>
  );
}
