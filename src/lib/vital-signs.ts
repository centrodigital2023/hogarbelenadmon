/**
 * Rangos de alarma de signos vitales para adultos mayores, compartidos por la
 * bitácora (HB-F4), signos vitales (HB-F16) y el panel de alertas.
 */

type VitalValue = number | string | null | undefined;

const toNumber = (value: VitalValue) => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Parses "120/80" (also "120-80" or "120 / 80") into systolic and diastolic. */
export const parseBloodPressure = (value: VitalValue) => {
  const match = String(value ?? "").match(/(\d{2,3})\s*[/-]\s*(\d{2,3})/);
  return match ? { systolic: Number(match[1]), diastolic: Number(match[2]) } : null;
};

/** Returns a short Spanish description when the value is out of range, otherwise null. */
export const vitalIssue = (field: string, value: VitalValue): string | null => {
  if (field === "blood_pressure") {
    const bp = parseBloodPressure(value);
    if (!bp) return null;
    if (bp.systolic >= 160 || bp.systolic < 90 || bp.diastolic >= 100 || bp.diastolic < 50) {
      return `T.A.: ${bp.systolic}/${bp.diastolic}`;
    }
    return null;
  }
  const n = toNumber(value);
  if (n === null) return null;
  switch (field) {
    case "spo2":
      return n < 90 ? `SpO2: ${n}%` : null;
    case "temperature":
      return n < 35 || n >= 38 ? `Temp: ${n}°C` : null;
    case "heart_rate":
      return n < 50 || n > 100 ? `FC: ${n}` : null;
    case "glucose":
      return n < 70 || n > 180 ? `Glucemia: ${n}` : null;
    default:
      return null;
  }
};

export const isVitalAbnormal = (field: string, value: VitalValue) => vitalIssue(field, value) !== null;

const VITAL_FIELDS = ["blood_pressure", "spo2", "temperature", "heart_rate", "glucose"] as const;

/** All out-of-range findings in a record that has any of the vital sign columns. */
export const vitalIssues = (record: Partial<Record<(typeof VITAL_FIELDS)[number], VitalValue>>) =>
  VITAL_FIELDS.map((field) => vitalIssue(field, record[field])).filter((issue): issue is string => issue !== null);

/**
 * Values that cannot be real (a typo such as 365 for 36.5 °C or SpO2 of 150 %).
 * Returns a friendly hint so the person fixes it before saving, otherwise null.
 */
export const implausibleVital = (field: string, value: VitalValue): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (field === "blood_pressure") {
    const bp = parseBloodPressure(value);
    if (!bp) return "Escribe la T.A. como 120/80";
    return bp.systolic <= bp.diastolic || bp.systolic > 260 || bp.diastolic < 30 ? "Revisa la T.A." : null;
  }
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "Número no válido";
  switch (field) {
    case "temperature":
      if (n >= 300 && n <= 430) return `¿Quisiste decir ${(n / 10).toFixed(1)} °C?`;
      return n < 30 || n > 43 ? "Revisa la temperatura" : null;
    case "spo2":
      return n > 100 || n < 50 ? "La SpO2 va de 50 a 100 %" : null;
    case "heart_rate":
      return n < 25 || n > 220 ? "Revisa la frecuencia cardiaca" : null;
    case "glucose":
      return n < 20 || n > 700 ? "Revisa la glucemia" : null;
    case "weight":
      return n < 25 || n > 250 ? "Revisa el peso (kg)" : null;
    default:
      return null;
  }
};

/** Relative weight change against the previous weight, e.g. -0.06 for a 6 % loss. */
export const weightChange = (current: VitalValue, previous: VitalValue) => {
  const c = toNumber(current);
  const p = toNumber(previous);
  return c !== null && p !== null ? (c - p) / p : null;
};
