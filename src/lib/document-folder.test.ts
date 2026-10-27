import { describe, expect, it } from "vitest";
import { analysisPath, documentFolder, fileHash, isAnalysisPath } from "./document-folder";
import { parseExtraction } from "./resident-documents";

const NOW = new Date(2026, 9, 27);
const record = (kind: string, date: string | null, analyzedAt = "2026-10-27T10:00:00Z") =>
  ({ extraction: parseExtraction({ document_kind: kind, document_date: date }), analyzedAt });

describe("carpeta digital del residente", () => {
  it("marca recibidos, vencidos y faltantes", () => {
    const folder = documentFolder([
      record("cedula", null),
      record("epicrisis", "2026-01-10"),
      record("formula_medica", "2026-09-01"),
      record("formula_medica", "2026-03-01"),
    ], { doc_eps: true }, NOW);
    const by = Object.fromEntries(folder.map((f) => [f.kind, f]));
    expect(by.cedula).toMatchObject({ status: "recibido", date: "2026-10-27" });
    expect(by.carne_eps).toMatchObject({ status: "recibido", date: null });
    expect(by.carne_eps.detail).toContain("sin archivo digital");
    expect(by.historia_clinica).toMatchObject({ status: "vencido", date: "2026-01-10" });
    expect(by.historia_clinica.detail).toContain("más de 6 meses");
    // Se usa la fórmula más reciente
    expect(by.formula_medica).toMatchObject({ status: "recibido", date: "2026-09-01" });
    expect(by.vacunacion.status).toBe("falta");
    expect(folder).toHaveLength(9);
  });

  it("los laboratorios dentro de otro documento también cuentan", () => {
    const formula = { extraction: parseExtraction({ document_kind: "formula_medica", document_date: "2026-10-01", labs: [{ name: "Hemoglobina", value: "12" }] }), analyzedAt: "2026-10-27T10:00:00Z" };
    const by = Object.fromEntries(documentFolder([formula], null, NOW).map((f) => [f.kind, f]));
    expect(by.laboratorios).toMatchObject({ status: "recibido", date: "2026-10-01" });
  });

  it("nombra el análisis junto al archivo", () => {
    expect(analysisPath("residents/r1/1_cc.jpg")).toBe("residents/r1/1_cc.jpg.ia.json");
    expect(isAnalysisPath("residents/r1/1_cc.jpg.ia.json")).toBe(true);
    expect(isAnalysisPath("residents/r1/1_cc.jpg")).toBe(false);
  });

  it("reconoce el mismo archivo por su huella", async () => {
    const a = await fileHash(new Blob(["cédula 41234567"]));
    const b = await fileHash(new Blob(["cédula 41234567"]));
    const c = await fileHash(new Blob(["otra"]));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
