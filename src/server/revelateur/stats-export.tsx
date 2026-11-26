import ExcelJS from "exceljs";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Stats } from "./stats";

/** XLSX export of the aggregated statistics: one sheet per block, no personal data. */
export async function statsToXlsx(s: Stats): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Méthode JG® — Le Révélateur";
  wb.created = s.generatedAt;
  const sheet = (name: string, header: string[], rows: (string | number | null)[][]) => {
    const ws = wb.addWorksheet(name);
    ws.addRow([`Le Révélateur · ${s.periodLabel} · exporté le ${s.generatedAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`]).font = { italic: true };
    ws.addRow([]);
    ws.addRow(header).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    ws.columns.forEach((c, i) => (c.width = i === 0 ? 46 : 18));
  };
  sheet("Indicateurs", ["Indicateur", "Valeur"], [
    ["Tests réalisés (sessions terminées)", s.counters.tests],
    ["Rappels à effectuer", s.counters.callbacks],
    ["Appels découverte réservés (à venir)", s.counters.calls],
  ]);
  sheet("Configurations", ["Configuration", "Sessions"], s.configurations.map((c) => [c.label, c.n]));
  sheet(
    "Dimensions",
    ["Dimension", "Score moyen", ...s.dimensions[0].levels.map((l) => l.label)],
    s.dimensions.map((d) => [`${d.dimension} · ${d.name}`, d.average, ...d.levels.map((l) => l.n)]),
  );
  sheet("Ressources", ["Ressource retenue", "Rapports"], s.resources.map((r) => [r.label, r.n]));
  sheet("Axes", ["Axe retenu", "Rapports"], s.axes.map((r) => [r.label, r.n]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const st = StyleSheet.create({
  page: { padding: 42, fontSize: 9.5, fontFamily: "Helvetica", color: "#343a3f" },
  h1: { fontSize: 18, color: "#172536", marginBottom: 4 },
  sub: { fontSize: 8.5, color: "#6b7177", marginBottom: 16 },
  h2: { fontSize: 11, color: "#172536", marginTop: 14, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e4ded0", paddingVertical: 3.5 },
  cell: { flex: 1 },
  num: { width: 70, textAlign: "right" },
  foot: { position: "absolute", bottom: 24, left: 42, right: 42, fontSize: 7, color: "#6b7177" },
});

function Table({ head, rows }: { head: string[]; rows: (string | number | null)[][] }) {
  return (
    <View>
      <View style={[st.row, { borderBottomColor: "#172536" }]}>
        {head.map((h, i) => (
          <Text key={i} style={[i === 0 ? st.cell : st.num, { fontFamily: "Helvetica-Bold" }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={st.row} wrap={false}>
          {r.map((c, j) => (
            <Text key={j} style={j === 0 ? st.cell : st.num}>
              {c === null ? "—" : typeof c === "number" ? String(c).replace(".", ",") : c}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** PDF export of the same statistics (internal document, standard fonts). */
export async function statsToPdf(s: Stats): Promise<Buffer> {
  const levels = s.dimensions[0].levels.map((l) => l.label.replace("Ressource ", ""));
  return renderToBuffer(
    <Document title="Le Révélateur — statistiques" author="Méthode JG®">
      <Page size="A4" style={st.page}>
        <Text style={st.h1}>Le Révélateur — statistiques</Text>
        <Text style={st.sub}>
          {s.periodLabel} · exporté le {s.generatedAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · données agrégées, sans information personnelle
        </Text>
        <Text style={st.h2}>Indicateurs</Text>
        <Table
          head={["Indicateur", "Valeur"]}
          rows={[
            ["Tests réalisés (sessions terminées)", s.counters.tests],
            ["Rappels à effectuer", s.counters.callbacks],
            ["Appels découverte réservés (à venir)", s.counters.calls],
          ]}
        />
        <Text style={st.h2}>Configurations</Text>
        <Table head={["Configuration", "Sessions"]} rows={s.configurations.map((c) => [c.label, c.n])} />
        <Text style={st.h2}>Dimensions</Text>
        <Table head={["Dimension", "Moyenne", ...levels]} rows={s.dimensions.map((d) => [`${d.dimension} · ${d.name}`, d.average, ...d.levels.map((l) => l.n)])} />
        <Text style={st.h2}>Ressources retenues</Text>
        <Table head={["Ressource", "Rapports"]} rows={s.resources.length ? s.resources.map((r) => [r.label, r.n]) : [["Aucune", null]]} />
        <Text style={st.h2}>Axes retenus</Text>
        <Table head={["Axe", "Rapports"]} rows={s.axes.length ? s.axes.map((r) => [r.label, r.n]) : [["Aucun", null]]} />
        <Text style={st.foot} fixed>
          © Jérémy Galéa – Méthode JG® · Document interne
        </Text>
      </Page>
    </Document>,
  );
}
