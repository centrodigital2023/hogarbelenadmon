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
