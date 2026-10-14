import { ImageResponse } from "next/og";

/** Share image (LinkedIn, WhatsApp…): navy card with the brand line, gold accent. */
export const alt = "Jérémy Galéa — Méthode JG® · Révéler votre potentiel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#172536",
          color: "#FFFFFF",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, color: "#F8F6F2" }}>JÉRÉMY GALÉA · MÉTHODE JG®</div>
        <div style={{ width: 96, height: 4, background: "#D4A866", marginTop: 32 }} />
        <div style={{ fontSize: 72, fontWeight: 700, marginTop: 40, lineHeight: 1.1 }}>
          Pourquoi vous plutôt qu’un autre ?
        </div>
        <div style={{ fontSize: 34, marginTop: 32, color: "#F8F6F2" }}>
          Rendre votre valeur claire, crédible et évidente.
        </div>
        <div style={{ fontSize: 26, marginTop: 48, color: "#D4A866", letterSpacing: 4 }}>
          RÉVÉLER VOTRE POTENTIEL · FRANCE • SUISSE
        </div>
      </div>
    ),
    size,
  );
}
