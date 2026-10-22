import { describe, it, expect } from "vitest";
import {
  NOT_ASSESSED,
  assessCognitiveStatus,
  buildHBF22Report,
  calculateDependencyProfile,
  determineFragilityStatus,
  generateCareplan,
  generateRiskAlerts,
  type AssessmentResults,
} from "./hb-f22-report";

const resident = { id: "r1", fullName: "Ana Pérez", documentId: "123", age: 82, gender: "F" };
const professional = { name: "Dra. López", role: "Médica" };

const scores = (values: Record<string, number>): AssessmentResults =>
  Object.fromEntries(Object.entries(values).map(([k, score]) => [k, { score }]));

describe("perfil de dependencia y fragilidad", () => {
  it("usa los mismos cortes que la escala de Barthel", () => {
    expect(calculateDependencyProfile(100, 8)).toBe("INDEPENDIENTE");
    expect(calculateDependencyProfile(100, 5)).toBe("INDEPENDIENTE ABVD (DEPENDENCIA EN AIVD)");
    expect(calculateDependencyProfile(60)).toBe("DEPENDENCIA LEVE");
    expect(calculateDependencyProfile(40)).toBe("DEPENDENCIA MODERADA");
    expect(calculateDependencyProfile(20)).toBe("DEPENDENCIA SEVERA");
    expect(calculateDependencyProfile(15)).toBe("DEPENDENCIA TOTAL");
  });

  it("no inventa resultados para escalas no aplicadas", () => {
    expect(calculateDependencyProfile(undefined)).toBe(NOT_ASSESSED);
    expect(determineFragilityStatus(undefined)).toBe(NOT_ASSESSED);
  });

  it("clasifica la fragilidad de Fried", () => {
    expect(determineFragilityStatus(0)).toBe("ROBUSTO");
    expect(determineFragilityStatus(2)).toBe("PRE-FRÁGIL");
    expect(determineFragilityStatus(3)).toBe("FRÁGIL");
  });

  it("Pfeiffer 5-7 es moderado y 8+ severo", () => {
    expect(assessCognitiveStatus(7).status).toBe("MODERADO");
    expect(assessCognitiveStatus(8).status).toBe("SEVERO");
  });
});

describe("alertas de riesgo", () => {
  it("no genera alertas para un residente sin riesgos", () => {
    const alerts = generateRiskAlerts(
      scores({ barthel: 100, tinetti: 28, braden: 20, mna: 27, yesavage: 2, pfeiffer: 0, gijon: 6 }),
      true
    );
    expect(alerts).toEqual([]);
  });

  it("detecta caídas, fragilidad, UPP y malnutrición", () => {
    const alerts = generateRiskAlerts(scores({ tinetti: 15, fried: 4, braden: 11, mna: 14 }), true);
    const scales = alerts.map((a) => a.scale);
    expect(scales).toEqual(expect.arrayContaining(["Tinetti", "Fried", "Braden", "MNA"]));
    expect(alerts.find((a) => a.scale === "Tinetti")?.level).toBe("HIGH");
  });

  it("detecta deterioro cognitivo cuando solo se aplicó MMSE", () => {
    const alerts = generateRiskAlerts(scores({ mmse: 18 }), true);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ category: "COGNITIVO", level: "MODERATE" });
    expect(generateRiskAlerts(scores({ mmse: 10 }), true)[0].level).toBe("HIGH");
  });

  it("no duplica la alerta cognitiva si Pfeiffer ya la generó", () => {
    const alerts = generateRiskAlerts(scores({ pfeiffer: 6, mmse: 18 }), true);
    expect(alerts.filter((a) => a.category === "COGNITIVO")).toHaveLength(1);
  });
});

describe("plan de cuidado", () => {
  it("incluye estimulación cognitiva por MMSE bajo", () => {
    const plan = generateCareplan(scores({ mmse: 20 }), []);
    expect(plan.map((p) => p.title)).toContain("PLAN DE ESTIMULACIÓN COGNITIVA");
  });

  it("no propone planes sin escalas aplicadas", () => {
    expect(generateCareplan({}, [])).toEqual([]);
  });
});

describe("informe HB-F22 completo", () => {
  it("compila escalas, correlaciones y resumen", () => {
    const report = buildHBF22Report(
      resident,
      scores({ barthel: 35, lawton: 2, tinetti: 14, fried: 3, mna: 15, pfeiffer: 6 }),
      professional,
      "2026-10-22T00:00:00.000Z"
    );
    expect(report.scales).toHaveLength(6);
    expect(report.correlations.dependencyProfile).toBe("DEPENDENCIA SEVERA");
    expect(report.correlations.fragilityStatus).toBe("FRÁGIL");
    expect(report.correlations.riskFactors).toEqual(
      expect.arrayContaining(["Riesgo alto de caídas", "Malnutrición", "Deterioro cognitivo"])
    );
    expect(report.summary).toContain("Paciente femenina de 82 años");
    expect(report.summary).toContain("fragilidad severa");
    expect(report.summary).toContain("alto riesgo de caídas");
    expect(report.carePlan.length).toBeGreaterThan(0);
  });

  it("no afirma dependencia cuando Barthel no se aplicó", () => {
    const report = buildHBF22Report(resident, scores({ yesavage: 3 }), professional);
    expect(report.correlations.dependencyProfile).toBe(NOT_ASSESSED);
    expect(report.correlations.fragilityStatus).toBe(NOT_ASSESSED);
    expect(report.summary).not.toContain("null");
    expect(report.summary).toContain("aún no ha sido evaluada");
  });
});
