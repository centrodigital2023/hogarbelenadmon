import { describe, it, expect } from "vitest";
import { isVitalAbnormal, parseBloodPressure, vitalIssues, implausibleVital, weightChange } from "./vital-signs";

describe("signos vitales", () => {
  it("ignora campos vacíos o en cero (no registrados)", () => {
    expect(isVitalAbnormal("spo2", 0)).toBe(false);
    expect(isVitalAbnormal("temperature", "")).toBe(false);
    expect(isVitalAbnormal("glucose", null)).toBe(false);
  });

  it.each([
    ["spo2", 89, true],
    ["spo2", 95, false],
    ["temperature", 38, true],
    ["temperature", "36,5", false],
    ["temperature", 34.5, true],
    ["heart_rate", 105, true],
    ["heart_rate", 72, false],
    ["glucose", 65, true],
    ["glucose", 190, true],
    ["glucose", 110, false],
    ["blood_pressure", "165/90", true],
    ["blood_pressure", "120/80", false],
    ["blood_pressure", "85/50", true],
  ] as const)("%s = %s → anormal: %s", (field, value, expected) => {
    expect(isVitalAbnormal(field, value)).toBe(expected);
  });

  it("interpreta la tensión arterial", () => {
    expect(parseBloodPressure("130 / 85")).toEqual({ systolic: 130, diastolic: 85 });
    expect(parseBloodPressure("sin dato")).toBeNull();
  });

  it("lista todos los hallazgos de un registro", () => {
    expect(vitalIssues({ spo2: 88, temperature: 38.4, heart_rate: 80, blood_pressure: "120/80" })).toEqual([
      "SpO2: 88%",
      "Temp: 38.4°C",
    ]);
  });
});

describe("implausibleVital", () => {
  it("catches typos before they reach the record", () => {
    expect(implausibleVital("temperature", "365")).toBe("¿Quisiste decir 36.5 °C?");
    expect(implausibleVital("temperature", "36.5")).toBeNull();
    expect(implausibleVital("spo2", 150)).not.toBeNull();
    expect(implausibleVital("blood_pressure", "120")).not.toBeNull();
    expect(implausibleVital("blood_pressure", "80/120")).not.toBeNull();
    expect(implausibleVital("blood_pressure", "120/80")).toBeNull();
    expect(implausibleVital("weight", "")).toBeNull();
  });

  it("measures weight change", () => {
    expect(weightChange(47, 50)).toBeCloseTo(-0.06);
    expect(weightChange("", 50)).toBeNull();
  });
});
