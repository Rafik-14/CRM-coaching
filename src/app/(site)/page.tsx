import { BookingButton, Container, Eyebrow, GoldLine, Section } from "@/components/site/ui";

export default function HomePage() {
  return (
    <Section>
      <Container>
        <Eyebrow>Méthode JG®</Eyebrow>
        <GoldLine className="mt-4" />
        <h1 className="jg-h1 mt-6">Pourquoi vous plutôt qu’un autre ?</h1>
        <BookingButton source="accueil-hero" className="mt-8" />
      </Container>
    </Section>
  );
}
