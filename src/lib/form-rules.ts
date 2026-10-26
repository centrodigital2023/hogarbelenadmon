/**
 * Business rules behind the forms, kept apart from the screens so they are
 * tested and the values match the database's CHECK constraints exactly.
 */
import { addDays, daysBetween } from "./form-helpers";

// ── Cadena de frío (HB-F7 dentro del Control Diario de Cocina) ──────────────

export interface ColdRange { min: number; max: number; label: string }

/** Safe range per appliance: congelador ≤ -18 °C, medicamentos 2–8 °C, neveras 0–4 °C. */
export const coldRangeFor = (appliance: string): ColdRange => {
  const name = appliance.toLowerCase();
  if (name.includes("congelador")) return { min: -30, max: -18, label: "-18 °C o menos" };
  if (name.includes("medicamento")) return { min: 2, max: 8, label: "2 °C a 8 °C" };
  return { min: 0, max: 4, label: "0 °C a 4 °C" };
};

export const isColdSafe = (appliance: string, temperature: number) => {
  const { min, max } = coldRangeFor(appliance);
  return temperature >= min && temperature <= max;
};

/** fridge_temps.shift only accepts 'manana' or 'tarde' (no ñ, no night). */
export const fridgeShiftFor = (hour: number): "manana" | "tarde" => (hour < 12 ? "manana" : "tarde");

// ── PQRSF (HB-F23) ──────────────────────────────────────────────────────────

/** Values stored in pqrsf.pqrsf_type (lowercase, no accents) and their labels. */
export const PQRSF_TYPES = [
  { value: "peticion", label: "Petición", emoji: "📨" },
  { value: "queja", label: "Queja", emoji: "😟" },
  { value: "reclamo", label: "Reclamo", emoji: "⚠️" },
  { value: "sugerencia", label: "Sugerencia", emoji: "💡" },
  { value: "felicitacion", label: "Felicitación", emoji: "💐" },
] as const;

export type PqrsfType = (typeof PQRSF_TYPES)[number]["value"];

export const pqrsfLabel = (value: string) =>
  PQRSF_TYPES.find(t => t.value === value)?.label ?? value;

/** Adds business days (Monday–Friday) to a date; national holidays are not counted out. */
export const addBusinessDays = (day: string, businessDays: number) => {
  let current = day;
  let added = 0;
  while (added < businessDays) {
    current = addDays(current, 1);
    const weekday = new Date(`${current}T12:00:00`).getDay();
    if (weekday !== 0 && weekday !== 6) added++;
  }
  return current;
};

/** Legal answer deadline (Ley 1755 de 2015: 15 días hábiles); null for sugerencias y felicitaciones. */
export const pqrsfDeadline = (type: string, receivedOn: string) =>
  type === "sugerencia" || type === "felicitacion" ? null : addBusinessDays(receivedOn, 15);

export type DeadlineState = "vencido" | "por_vencer" | "a_tiempo" | "sin_plazo";

export const deadlineState = (deadline: string | null, today: string): DeadlineState => {
  if (!deadline) return "sin_plazo";
  const left = daysBetween(today, deadline);
  if (left < 0) return "vencido";
  return left <= 3 ? "por_vencer" : "a_tiempo";
};

// ── Evaluación de desempeño (HB-F25) ────────────────────────────────────────

export type PerformanceConcept = "sobresaliente" | "satisfactorio" | "necesita_mejorar";

export const CONCEPT_LABELS: Record<PerformanceConcept, string> = {
  sobresaliente: "Sobresaliente",
  satisfactorio: "Satisfactorio",
  necesita_mejorar: "Necesita mejorar",
};

/** Concept for a 6-criteria score out of 30, stored exactly as the database expects. */
export const performanceConcept = (total: number): PerformanceConcept =>
  total >= 25 ? "sobresaliente" : total >= 18 ? "satisfactorio" : "necesita_mejorar";

/** Default period label: the semester the date falls in. */
export const semesterLabel = (d: Date = new Date()) =>
  `${d.getMonth() < 6 ? "Enero-Junio" : "Julio-Diciembre"} ${d.getFullYear()}`;

// ── Comprobantes de pago ────────────────────────────────────────────────────

/** Next voucher number P-YYYY-NNNN after the latest one of the year. */
export const nextVoucherNumber = (year: number, latest: string | null | undefined) => {
  const match = latest?.match(new RegExp(`^P-${year}-(\\d+)$`));
  const next = match ? Number(match[1]) + 1 : 1;
  return `P-${year}-${String(next).padStart(4, "0")}`;
};

// ── Capacitaciones (HB-F24) ─────────────────────────────────────────────────

/** Minutes between two HH:MM times; null when one is missing or the end is earlier. */
export const minutesBetween = (start: string, end: string) => {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
};

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
};

// ── Incidentes y caídas (HB-F20) ────────────────────────────────────────────

export interface IncidentGuidance { level: "info" | "warning" | "danger"; text: string }

/** Protocol reminders that follow from what was recorded, most urgent first. */
export const incidentGuidance = (input: {
  incident_type: string; consequences: string;
  first_aid: boolean; family_notified: boolean; transferred_to_er: boolean;
}): IncidentGuidance[] => {
  const tips: IncidentGuidance[] = [];
  const severe = /fractura|conciencia/i.test(input.consequences);
  const injured = input.consequences !== "" && input.consequences !== "Ninguna";
  if (severe && !input.transferred_to_er)
    tips.push({ level: "danger", text: "Posible fractura o pérdida de conciencia: no movilice al residente y active traslado a urgencias." });
  if (injured && !input.first_aid)
    tips.push({ level: "warning", text: "Hay lesión visible: registre los primeros auxilios brindados." });
  if ((injured || input.incident_type.startsWith("Caída")) && !input.family_notified)
    tips.push({ level: "warning", text: "Informe a la familia y anote con quién habló." });
  if (input.incident_type.startsWith("Caída"))
    tips.push({ level: "info", text: "Tras una caída: controle signos vitales y vigile al residente las próximas 24 horas." });
  if (input.incident_type === "Error de medicación")
    tips.push({ level: "info", text: "Error de medicación: informe al médico tratante y revise el registro HB-F15." });
  return tips;
};

// ── Administración de medicamentos (HB-F15) ─────────────────────────────────

export const FIVE_RIGHTS = [
  { key: "check_patient", label: "Paciente" },
  { key: "check_medication", label: "Medicamento" },
  { key: "check_dose", label: "Dosis" },
  { key: "check_route", label: "Vía" },
  { key: "check_time", label: "Hora" },
] as const;

export type FiveRightsKey = (typeof FIVE_RIGHTS)[number]["key"];

export const fiveRightsDone = (record: Partial<Record<FiveRightsKey, boolean>>) =>
  FIVE_RIGHTS.every(r => record[r.key]);

/** Clock times (HH:MM) written in a free-text schedule such as "8:00 - 20:00" or "8am y 8pm". */
export const scheduleTimes = (schedule: string | null | undefined) => {
  if (!schedule) return [] as string[];
  const times = new Set<string>();
  const re = /(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/gi;
  for (const m of schedule.matchAll(re)) {
    let h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    const suffix = m[3]?.toLowerCase().replace(/[\s.]/g, "");
    if (!m[2] && !suffix) continue; // a bare number ("cada 8 horas") is not a clock time
    if (suffix === "pm" && h < 12) h += 12;
    if (suffix === "am" && h === 12) h = 0;
    if (h > 23 || min > 59) continue;
    times.add(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return [...times].sort();
};

/** The scheduled dose closest to `now` (HH:MM), so the nurse sees which one is due. */
export const nearestDose = (times: string[], now: string) => {
  if (times.length === 0) return null;
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const n = toMin(now);
  return times.reduce((best, t) => (Math.abs(toMin(t) - n) < Math.abs(toMin(best) - n) ? t : best));
};

/** Days until a medication's expiry date; negative when already expired. */
export const daysToExpiry = (expiry: string | null | undefined, today: string) =>
  expiry ? daysBetween(today, expiry) : null;
