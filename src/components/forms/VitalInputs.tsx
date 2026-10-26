import { implausibleVital, isVitalAbnormal } from "@/lib/vital-signs";
import { numberOrNull } from "@/lib/form-helpers";

export interface VitalValues {
  blood_pressure: string;
  spo2: string;
  temperature: string;
  glucose: string;
  heart_rate: string;
  weight: string;
}

export const emptyVitals = (): VitalValues => ({
  blood_pressure: "", spo2: "", temperature: "", glucose: "", heart_rate: "", weight: "",
});

export const VITAL_FIELDS: { key: keyof VitalValues; label: string; placeholder: string; unit: string; decimal?: boolean }[] = [
  { key: "blood_pressure", label: "T.A.", placeholder: "120/80", unit: "mmHg" },
  { key: "heart_rate", label: "FC", placeholder: "72", unit: "lpm" },
  { key: "spo2", label: "SpO2", placeholder: "95", unit: "%" },
  { key: "temperature", label: "Temp.", placeholder: "36.5", unit: "°C", decimal: true },
  { key: "glucose", label: "Glucemia", placeholder: "100", unit: "mg/dl" },
  { key: "weight", label: "Peso", placeholder: "60", unit: "kg", decimal: true },
];

export const hasVitals = (v: VitalValues) => Object.values(v).some(x => x.trim() !== "");

/** Typos that must be fixed before saving, per field. */
export const vitalTypos = (v: VitalValues) =>
  VITAL_FIELDS.flatMap(f => {
    const hint = implausibleVital(f.key, v[f.key]);
    return hint ? [{ key: f.key, label: f.label, hint }] : [];
  });

const roundOrNull = (value: string) => {
  const n = numberOrNull(value);
  return n === null ? null : Math.round(n);
};

/**
 * Columns for vital_signs / daily_logs: empty boxes are stored as NULL, never as 0.
 * SpO2, glucose and heart rate are whole numbers (integer columns in daily_logs).
 */
export const vitalColumns = (v: VitalValues) => ({
  blood_pressure: v.blood_pressure.trim() || null,
  spo2: roundOrNull(v.spo2),
  temperature: numberOrNull(v.temperature),
  glucose: roundOrNull(v.glucose),
  heart_rate: roundOrNull(v.heart_rate),
  weight: numberOrNull(v.weight),
});

/** Six big numeric boxes that turn red out of range and explain typos on the spot. */
const VitalInputs = ({ value, onChange, idPrefix }: {
  value: VitalValues; onChange: (key: keyof VitalValues, v: string) => void; idPrefix: string;
}) => (
  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
    {VITAL_FIELDS.map(f => {
      const v = value[f.key];
      const typo = implausibleVital(f.key, v);
      const abnormal = !typo && isVitalAbnormal(f.key, v);
      return (
        <label key={f.key} htmlFor={`${idPrefix}-${f.key}`} className="block">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">{f.label} <span className="font-medium normal-case">{f.unit}</span></span>
          <input id={`${idPrefix}-${f.key}`} value={v} placeholder={f.placeholder}
            inputMode={f.key === "blood_pressure" ? "text" : f.decimal ? "decimal" : "numeric"}
            onChange={e => onChange(f.key, e.target.value)}
            className={`mt-1 w-full min-h-[44px] rounded-lg border-2 px-1 text-center text-base font-bold transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              typo ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10" : abnormal ? "border-destructive bg-destructive/5 text-destructive" : "border-input bg-background"
            }`} />
          {typo && <span className="mt-0.5 block text-[10px] font-bold leading-tight text-amber-700">{typo}</span>}
        </label>
      );
    })}
  </div>
);

export default VitalInputs;
