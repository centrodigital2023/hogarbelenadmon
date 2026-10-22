import { describe, it, expect } from "vitest";
import {
  buildClinicalInsights,
  buildResidentInsight,
  detectDeterioration,
  isFall,
  pendingAssessments,
  persistentVitalIssues,
  weightLossPercent,
  type AssessmentRecord,
} from "./clinical-intelligence";

const NOW = new Date("2026-10-22T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
const a = (test_key: string, score: number, days: number, resident_id = "r1"): AssessmentRecord => ({
  resident_id,
  test_key,
  score,
  assessment_date: daysAgo(days).slice(0, 10),
  created_at: daysAgo(days),
});
const empty = { assessments: [], vitals: [], incidents: [] };

describe("detección de deterioro", () => {
  it("detecta caída de Barthel de 10 puntos o más", () => {
    const d = detectDeterioration([a("barthel", 80, 100), a("barthel", 65, 5)]);
    expect(d).toEqual([expect.objectContaining({ testKey: "barthel", previous: 80, current: 65, change: -15 })]);
  });

  it("en escalas donde más es peor, detecta el aumento", () => {
    expect(detectDeterioration([a("yesavage", 3, 90), a("yesavage", 8, 1)])).toHaveLength(1);
  });

  it("ignora cambios pequeños y mejorías", () => {
    expect(detectDeterioration([a("barthel", 80, 100), a("barthel", 75, 5)])).toEqual([]);
    expect(detectDeterioration([a("barthel", 50, 100), a("barthel", 80, 5)])).toEqual([]);
  });
});

describe("reevaluaciones pendientes", () => {
  it("marca escalas nunca aplicadas y vencidas", () => {
    const pending = pendingAssessments([a("barthel", 90, 200), a("tinetti", 24, 10)], NOW);
    const keys = pending.map((p) => p.testKey);
    expect(keys).toContain("barthel");
    expect(keys).not.toContain("tinetti");
    expect(keys).toEqual(expect.arrayContaining(["mna", "braden", "pfeiffer", "yesavage"]));
  });
});

describe("tendencias", () => {
  it("calcula la pérdida de peso en 30 días", () => {
    const vitals = [
      { resident_id: "r1", date: daysAgo(25), weight: 60 },
      { resident_id: "r1", date: daysAgo(1), weight: 56.4 },
    ];
    expect(weightLossPercent(vitals, NOW)).toBe(6);
    expect(weightLossPercent([vitals[0]], NOW)).toBeNull();
  });

  it("detecta alteraciones repetidas de signos vitales", () => {
    const vitals = [
      { resident_id: "r1", date: daysAgo(1), spo2: 88 },
      { resident_id: "r1", date: daysAgo(3), spo2: 87 },
      { resident_id: "r1", date: daysAgo(4), temperature: 38.5 },
    ];
    expect(persistentVitalIssues(vitals, NOW)).toEqual(["SpO2 baja en 2 registros (7 días)"]);
  });

  it("reconoce caídas pero no casi-caídas", () => {
    expect(isFall("Caída desde su propia altura")).toBe(true);
    expect(isFall("caida desde mobiliario")).toBe(true);
    expect(isFall("Casi caída")).toBe(false);
    expect(isFall(null)).toBe(false);
  });
});

describe("semáforo de riesgo", () => {
  it("un residente estable queda en verde", () => {
    const insight = buildResidentInsight({ id: "r1", full_name: "Ana" }, empty, NOW);
    expect(insight.level).toBe("bajo");
    expect(insight.reasons).toEqual([]);
  });

  it("caída reciente + Tinetti alto riesgo + SpO2 baja = rojo", () => {
    const insight = buildResidentInsight(
      { id: "r1", full_name: "Ana" },
      {
        assessments: [a("tinetti", 15, 10)],
        vitals: [{ resident_id: "r1", date: daysAgo(0.5), spo2: 86 }],
        incidents: [{ resident_id: "r1", incident_type: "Caída desde su propia altura", incident_datetime: daysAgo(3) }],
      },
      NOW
    );
    expect(insight.level).toBe("alto");
    expect(insight.recentFalls).toBe(1);
    expect(insight.reasons.join(" ")).toContain("SpO2: 86%");
  });

  it("ordena a los residentes de mayor a menor riesgo", () => {
    const list = buildClinicalInsights(
      [
        { id: "r1", full_name: "Ana" },
        { id: "r2", full_name: "Beto" },
      ],
      {
        assessments: [a("braden", 10, 5, "r2")],
        vitals: [],
        incidents: [],
      },
      NOW
    );
    expect(list.map((i) => i.resident.id)).toEqual(["r2", "r1"]);
  });
});
