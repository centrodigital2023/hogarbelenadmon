import { describe, it, expect } from "vitest";
import { TESTS_GERIATRICOS } from "@/data/tests-geriatricos";
import { interpretScore, maxPossibleScore, sumAnswers } from "./geriatric-scoring";

describe("escalas geriátricas", () => {
  it.each(Object.keys(TESTS_GERIATRICOS))("%s: el máximo declarado coincide con las preguntas", (key) => {
    expect(maxPossibleScore(key)).toBe(TESTS_GERIATRICOS[key].max);
  });

  it.each(Object.keys(TESTS_GERIATRICOS))("%s: los ids de pregunta son únicos", (key) => {
    const ids = TESTS_GERIATRICOS[key].questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(Object.keys(TESTS_GERIATRICOS))("%s: tiene interpretación clínica", (key) => {
    expect(interpretScore(key, 0)).not.toBe("Pendiente de interpretación clínica");
  });

  it("suma las respuestas", () => {
    expect(sumAnswers({ q1: 10, q2: 5, q3: 0.5 })).toBe(15.5);
    expect(sumAnswers({})).toBe(0);
  });

  it.each([
    ["barthel", 100, "Independiente"],
    ["barthel", 60, "Dependencia Leve"],
    ["barthel", 15, "Dependencia Total"],
    ["pfeiffer", 2, "Normal"],
    ["pfeiffer", 7, "Deterioro cognitivo moderado"],
    ["pfeiffer", 8, "Deterioro cognitivo severo"],
    ["tinetti", 18, "Alto riesgo de caídas"],
    ["tinetti", 19, "Riesgo moderado de caídas"],
    ["tinetti", 25, "Bajo riesgo de caídas"],
    ["mna", 23.5, "Riesgo de malnutrición"],
    ["braden", 12, "Alto riesgo de UPP"],
    ["zarit", 61, "Sobrecarga severa"],
  ] as const)("%s con %d puntos → %s", (key, score, expected) => {
    expect(interpretScore(key, score)).toBe(expected);
  });
});
