import path from "node:path";
import { Document, Font, Link, Page, Path, Polygon, Line, StyleSheet, Svg, Text, View, Circle, G } from "@react-pdf/renderer";
import { MONOGRAM_LETTERS, MONOGRAM_MARK, MONOGRAM_VIEWBOX } from "@/components/revelateur/monogram";
import type { Block, ReportContent } from "./editorial";

/**
 * The PDF report (annexe 05): A4 portrait, JG® identity (navy #172536, champagne gold, ivory), the eight
 * sections in order, the ownership notice on every page. It only lays out ReportContent: it neither
 * calculates nor interprets anything.
 */

const FONTS = path.join(process.cwd(), "src", "server", "revelateur", "report-fonts");
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Montserrat",
    fonts: [
      { src: path.join(FONTS, "montserrat-latin-300-normal.woff"), fontWeight: 300 },
      { src: path.join(FONTS, "montserrat-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONTS, "montserrat-latin-600-normal.woff"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "Lato",
    fonts: [
      { src: path.join(FONTS, "lato-latin-300-normal.woff"), fontWeight: 300 },
      { src: path.join(FONTS, "lato-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(FONTS, "lato-latin-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
      { src: path.join(FONTS, "lato-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // never split French words
  fontsReady = true;
}

const NAVY = "#172536", GOLD = "#B8904F", GOLD_LIGHT = "#D4A866", INK = "#343a3f", SOFT = "#6b7177", RULE = "#E4DED0", IVORY = "#F8F6F2";

const s = StyleSheet.create({
  footerCover: { position: "absolute", bottom: 26, left: 54, right: 54 },
  page: { paddingTop: 54, paddingBottom: 64, paddingHorizontal: 54, fontFamily: "Lato", fontSize: 10.2, lineHeight: 1.55, color: INK, backgroundColor: "#ffffff" },
  footer: { position: "absolute", bottom: 26, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: SOFT, lineHeight: 1.3 },
  footerText: { width: "85%" },
  // cover
  cover: { flex: 1, justifyContent: "space-between" },
  coverPage: { padding: 0, paddingBottom: 64, fontFamily: "Lato", fontSize: 10.2, lineHeight: 1.55, color: INK },
  coverBand: { backgroundColor: NAVY, paddingHorizontal: 54, paddingTop: 70, paddingBottom: 46 },
  coverBody: { flex: 1, justifyContent: "space-between", paddingHorizontal: 54 },
  kicker: { fontFamily: "Montserrat", fontWeight: 600, fontSize: 8, letterSpacing: 2.2, textTransform: "uppercase", color: GOLD_LIGHT },
  coverTitle: { fontFamily: "Montserrat", fontWeight: 300, fontSize: 34, color: "#ffffff", marginTop: 14, lineHeight: 1.1 },
  coverSub: { fontFamily: "Montserrat", fontWeight: 400, fontSize: 12, color: "#ffffff", marginTop: 10, opacity: 0.85 },
  coverFor: { fontFamily: "Lato", fontSize: 11, color: GOLD_LIGHT, marginTop: 22 },
  lead: { fontFamily: "Montserrat", fontWeight: 300, fontSize: 13.5, lineHeight: 1.5, color: NAVY },
  note: { fontSize: 9, color: SOFT, lineHeight: 1.5 },
  // sections
  sectionHead: { marginBottom: 12, marginTop: 4 },
  sectionNum: { fontFamily: "Montserrat", fontWeight: 600, fontSize: 9, letterSpacing: 2, color: GOLD },
  sectionTitle: { fontFamily: "Montserrat", fontWeight: 300, fontSize: 20, color: NAVY, marginTop: 4, lineHeight: 1.2 },
  rule: { height: 1, backgroundColor: GOLD_LIGHT, width: 42, marginTop: 10 },
  p: { marginBottom: 8 },
  card: { borderLeftWidth: 2, borderLeftColor: GOLD_LIGHT, backgroundColor: IVORY, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10 },
  cardKicker: { fontFamily: "Montserrat", fontWeight: 600, fontSize: 7.5, letterSpacing: 1.6, textTransform: "uppercase", color: GOLD, marginBottom: 3 },
  cardTitle: { fontFamily: "Montserrat", fontWeight: 400, fontSize: 13, color: NAVY, marginBottom: 6, lineHeight: 1.25 },
  partLabel: { fontFamily: "Montserrat", fontWeight: 600, fontSize: 7.5, letterSpacing: 1.4, textTransform: "uppercase", color: NAVY, marginTop: 4, marginBottom: 1 },
  subTitle: { fontFamily: "Montserrat", fontWeight: 600, fontSize: 10, color: NAVY, marginTop: 8, marginBottom: 3 },
  quote: { fontFamily: "Montserrat", fontWeight: 300, fontSize: 13, lineHeight: 1.45, color: NAVY, borderLeftWidth: 2, borderLeftColor: GOLD, paddingLeft: 12, marginVertical: 10 },
  cta: { marginTop: 8, alignSelf: "flex-start", backgroundColor: NAVY, color: "#ffffff", fontFamily: "Montserrat", fontWeight: 600, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", paddingVertical: 9, paddingHorizontal: 16, textDecoration: "none" },
  // cartography
  carto: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 6 },
  table: { flex: 1, marginLeft: 18 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: RULE, paddingVertical: 6 },
  tdName: { width: "46%", fontFamily: "Montserrat", fontSize: 9, color: NAVY },
  tdScore: { width: "16%", fontFamily: "Montserrat", fontWeight: 600, fontSize: 9.5, color: NAVY, textAlign: "right", paddingRight: 8 },
  tdLevel: { width: "38%", fontSize: 8.5, color: SOFT },
});

/** Radar on a fixed 0–100 scale, canonical order D1 → D5 (annexe 05 §5.2), readable in greyscale. */
function Radar({ rows }: { rows: Extract<Block, { t: "scores" }>["rows"] }) {
  const size = 200, c = size / 2, R = 72;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)] as const;
  };
  const ring = (v: number) => rows.map((_, i) => pt(i, v).join(",")).join(" ");
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[20, 40, 60, 80, 100].map((v) => (
        <Polygon key={v} points={ring(v)} fill="none" stroke={v === 60 ? GOLD_LIGHT : RULE} strokeWidth={v === 60 ? 0.9 : 0.6} />
      ))}
      {rows.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <Line key={i} x1={c} y1={c} x2={x} y2={y} stroke={RULE} strokeWidth={0.6} />;
      })}
      <Polygon points={rows.map((r, i) => pt(i, r.score).join(",")).join(" ")} fill={GOLD_LIGHT} fillOpacity={0.28} stroke={NAVY} strokeWidth={1.2} />
      {rows.map((r, i) => {
        const [x, y] = pt(i, r.score);
        return <Circle key={r.dimension} cx={x} cy={y} r={2.2} fill={NAVY} />;
      })}
      {rows.map((r, i) => {
        const [x, y] = pt(i, 128);
        return (
          <Text key={`l${r.dimension}`} x={x} y={y + 3} style={{ fontSize: 7, fontFamily: "Montserrat" }} fill={NAVY} textAnchor="middle">
            {r.dimension}
          </Text>
        );
      })}
    </Svg>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "p":
      return <Text style={s.p}>{b.text}</Text>;
    case "lead":
      return <Text style={[s.lead, s.p]}>{b.text}</Text>;
    case "note":
      return <Text style={[s.note, s.p]}>{b.text}</Text>;
    case "quote":
      return <Text style={s.quote}>{b.text}</Text>;
    case "cta":
      return (
        <View wrap={false}>
          <Link src={b.url} style={s.cta}>
            {b.label}
          </Link>
          <Text style={[s.note, { marginTop: 6 }]}>{b.note}</Text>
        </View>
      );
    case "scores":
      return (
        <View style={s.carto} wrap={false}>
          <Radar rows={b.rows} />
          <View style={s.table}>
            {b.rows.map((r) => (
              <View key={r.dimension} style={s.tr}>
                <Text style={s.tdName}>{`${r.dimension} · ${r.name}`}</Text>
                <Text style={s.tdScore}>{r.score.toFixed(1).replace(".", ",")}</Text>
                <Text style={s.tdLevel}>{r.level}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    case "card":
      return (
        <View style={s.card} wrap={false}>
          {b.kicker ? <Text style={s.cardKicker}>{b.kicker}</Text> : null}
          <Text style={s.cardTitle}>{b.title}</Text>
          {b.parts.map((p, i) => (
            <View key={i}>
              {p.label ? <Text style={s.partLabel}>{p.label}</Text> : null}
              <Text style={{ marginBottom: 4 }}>{p.text}</Text>
            </View>
          ))}
        </View>
      );
    case "sub":
      return (
        <View wrap={false}>
          <Text style={s.subTitle}>{b.title}</Text>
          {b.parts.map((p, i) => (
            <Text key={i} style={s.p}>
              {p.text}
            </Text>
          ))}
        </View>
      );
  }
}

function Monogram({ size, light }: { size: number; light?: boolean }) {
  const [, , w, h] = MONOGRAM_VIEWBOX.split(" ").map(Number);
  return (
    <Svg width={size} height={(size * h) / w} viewBox={MONOGRAM_VIEWBOX}>
      <G>
        <Path d={MONOGRAM_LETTERS} fill={light ? "#ffffff" : NAVY} fillRule="evenodd" />
        <Path d={MONOGRAM_MARK} fill={GOLD_LIGHT} fillRule="evenodd" />
      </G>
    </Svg>
  );
}

export function ReportDocument({ content, ownership, date }: { content: ReportContent; ownership: string; date: string }) {
  registerFonts();
  const footer = (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{ownership}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
  return (
    <Document title="Rapport — Test Signature JG®" author="Jérémy Galéa — Méthode JG®" subject="Le Révélateur" creator="Méthode JG®" producer="Méthode JG®" language="fr">
      <Page size="A4" style={s.coverPage}>
        <View style={s.cover}>
          <View style={s.coverBand}>
            <Monogram size={46} light />
            <Text style={[s.kicker, { marginTop: 26 }]}>Test Signature JG® · Le Révélateur</Text>
            <Text style={s.coverTitle}>Votre rapport personnalisé</Text>
            <Text style={s.coverSub}>Une première cartographie de votre valeur</Text>
            {content.firstName ? <Text style={s.coverFor}>{content.firstName}</Text> : null}
          </View>
          <View style={s.coverBody}>
            <View style={{ marginTop: 36 }}>
              {content.opening.map((b, i) => (
                <BlockView key={i} b={b} />
              ))}
            </View>
            <View>
              <Text style={[s.kicker, { color: GOLD }]}>Révéler votre potentiel</Text>
              <Text style={[s.note, { marginTop: 4 }]}>{date}</Text>
            </View>
          </View>
        </View>
        {footer}
      </Page>
      <Page size="A4" style={s.page} wrap>
        {content.sections.map((sec) => (
          <View key={sec.code} style={{ marginBottom: 18 }} break={sec.code === "06"}>
            {/* The heading never stays alone at the bottom of a page: it travels with the first block. */}
            <View wrap={false}>
              <View style={s.sectionHead}>
                <Text style={s.sectionNum}>{sec.code}</Text>
                <Text style={s.sectionTitle}>{sec.title}</Text>
                <View style={s.rule} />
              </View>
              {sec.blocks[0] ? <BlockView b={sec.blocks[0]} /> : null}
            </View>
            {sec.blocks.slice(1).map((b, i) => (
              <BlockView key={i} b={b} />
            ))}
          </View>
        ))}
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }} wrap={false}>
          <Monogram size={22} />
          <Text style={[s.kicker, { color: NAVY, marginLeft: 10 }]}>Jérémy Galéa · Méthode JG®</Text>
        </View>
        {footer}
      </Page>
    </Document>
  );
}
