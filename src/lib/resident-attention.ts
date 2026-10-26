/**
 * Pendientes por residente: qué falta o requiere atención en la ficha, los formularios
 * y las fechas importantes. Reglas deterministas, sin IA, para que las notificaciones
 * sean confiables y explicables.
 */
import { pendingAssessments, CORE_SCALES, type AssessmentRecord } from "@/lib/clinical-intelligence";
import { nextBirthday, parseDateOnly } from "@/lib/resident-age";

export type AttentionSeverity = "alta" | "media" | "baja";
export type AttentionCategory = "ficha" | "ingreso" | "valoracion" | "salud" | "higiene" | "documentos" | "estado" | "cumpleanos";

export interface AttentionResident {
  id: string;
  full_name: string;
  status: string;
  birth_date: string | null;
  admission_date: string | null;
  trial_end_date: string | null;
  document_id: string | null;
  eps: string | null;
  blood_type: string | null;
  allergies: string | null;
  emergency_contact_1_name: string | null;
  emergency_contact_1_phone: string | null;
  responsible_family_name: string | null;
  responsible_family_phone: string | null;
  treating_doctor_name: string | null;
}

export interface AttentionData {
  residents: AttentionResident[];
  checklists: { resident_id: string; folder_status: string | null }[];
  lifeHistories: { resident_id: string }[];
  assessments: AssessmentRecord[];
  activeMedications: { resident_id: string }[];
  hygieneKits: { resident_id: string; kit_date: string }[];
  documents: { entity_id: string }[];
}

export interface AttentionTarget { modulo: string; form?: string; residente?: string }

export interface AttentionItem {
  id: string;
  residentId: string;
  residentName: string;
  severity: AttentionSeverity;
  category: AttentionCategory;
  title: string;
  detail: string;
  target: AttentionTarget;
}

const DAY_MS = 86_400_000;
const SEVERITY_ORDER: Record<AttentionSeverity, number> = { alta: 0, media: 1, baja: 2 };
export const ACTIVE_STATUSES = ["prueba", "permanente"];

/** Campos de la ficha que el hogar necesita tener completos, con su importancia. */
const REQUIRED_FIELDS: { key: keyof AttentionResident; label: string; severity: AttentionSeverity }[] = [
  { key: "allergies", label: "alergias", severity: "alta" },
  { key: "emergency_contact_1_phone", label: "teléfono de emergencia", severity: "alta" },
  { key: "birth_date", label: "fecha de nacimiento", severity: "media" },
  { key: "document_id", label: "documento", severity: "media" },
  { key: "eps", label: "EPS", severity: "media" },
  { key: "responsible_family_name", label: "familiar responsable", severity: "media" },
  { key: "blood_type", label: "tipo de sangre", severity: "baja" },
  { key: "treating_doctor_name", label: "médico tratante", severity: "baja" },
];

const empty = (v: string | null | undefined) => !v || !v.trim();
const worst = (list: AttentionSeverity[]) => list.reduce<AttentionSeverity>((a, b) => (SEVERITY_ORDER[b] < SEVERITY_ORDER[a] ? b : a), "baja");
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Qué tan completa está la ficha (0–100). */
export function profileCompleteness(r: AttentionResident): number {
  const done = REQUIRED_FIELDS.filter((f) => !empty(r[f.key] as string | null)).length;
  return Math.round((done / REQUIRED_FIELDS.length) * 100);
}

export function residentAttention(r: AttentionResident, data: AttentionData, now = new Date()): AttentionItem[] {
  const items: AttentionItem[] = [];
  const add = (item: Omit<AttentionItem, "id" | "residentId" | "residentName">) =>
    items.push({ ...item, id: `${r.id}:${item.category}:${item.title}`, residentId: r.id, residentName: r.full_name });
  const ficha: AttentionTarget = { modulo: "residentes", residente: r.id };
  const today = startOfDay(now);
  const admitted = parseDateOnly(r.admission_date);
  const daysSinceAdmission = admitted ? daysBetween(admitted, today) : 999;

  // Ficha incompleta
  const missing = REQUIRED_FIELDS.filter((f) => empty(r[f.key] as string | null));
  if (missing.length > 0) {
    add({
      category: "ficha", severity: worst(missing.map((m) => m.severity)), target: ficha,
      title: "Ficha incompleta",
      detail: `Falta: ${missing.map((m) => m.label).join(", ")}. Puede subir un documento y la IA lo completa.`,
    });
  }

  // Periodo de prueba
  const trialEnd = parseDateOnly(r.trial_end_date);
  if (r.status === "prueba" && trialEnd) {
    const days = daysBetween(today, trialEnd);
    if (days < 0) add({ category: "estado", severity: "alta", target: ficha, title: "Periodo de prueba vencido", detail: `Venció hace ${-days} día(s). Defina si pasa a permanente.` });
    else if (days <= 3) add({ category: "estado", severity: "media", target: ficha, title: "Periodo de prueba por terminar", detail: days === 0 ? "Termina hoy." : `Termina en ${days} día(s).` });
  }

  // HB-F1 carpeta de ingreso
  const checklist = data.checklists.find((c) => c.resident_id === r.id);
  if (!checklist) {
    add({ category: "ingreso", severity: daysSinceAdmission > 7 ? "media" : "baja", target: { modulo: "1", form: "HB-F1" }, title: "Checklist de admisión (HB-F1) sin iniciar", detail: "Suba cédula, EPS, historia clínica y fórmulas: la IA marca el checklist." });
  } else if (checklist.folder_status !== "completa") {
    add({ category: "ingreso", severity: "baja", target: { modulo: "1", form: "HB-F1" }, title: "Carpeta de ingreso incompleta", detail: "Faltan documentos del checklist HB-F1." });
  }

  // HB-F22 historia de vida
  if (!data.lifeHistories.some((l) => l.resident_id === r.id)) {
    add({ category: "ingreso", severity: "baja", target: { modulo: "1", form: "HB-F22" }, title: "Sin historia de vida (HB-F22)", detail: "Registre gustos, rutinas y personas importantes." });
  }

  // Valoración geriátrica
  const own = data.assessments.filter((a) => a.resident_id === r.id);
  const pending = pendingAssessments(own, now);
  if (pending.length === CORE_SCALES.length) {
    add({ category: "valoracion", severity: daysSinceAdmission > 7 ? "alta" : "media", target: { modulo: "2", residente: r.id }, title: "Sin valoración geriátrica", detail: `Aplique ${pending.map((p) => p.testName).join(", ")}.` });
  } else if (pending.length > 0) {
    add({ category: "valoracion", severity: "media", target: { modulo: "2", residente: r.id }, title: "Valoraciones pendientes o vencidas", detail: pending.map((p) => (p.lastDate ? `${p.testName} (última ${p.lastDate})` : p.testName)).join(", ") });
  }

  // Salud: medicamentos
  if (!data.activeMedications.some((m) => m.resident_id === r.id)) {
    add({ category: "salud", severity: "baja", target: { modulo: "5", form: "HB-F14" }, title: "Sin medicamentos registrados (HB-F14)", detail: "Si toma medicamentos, suba la fórmula médica." });
  }

  // Higiene: kit en los últimos 35 días
  const lastKit = data.hygieneKits.filter((k) => k.resident_id === r.id).map((k) => k.kit_date).sort().pop();
  const kitDate = parseDateOnly(lastKit);
  if (!kitDate || daysBetween(kitDate, today) > 35) {
    add({ category: "higiene", severity: "baja", target: { modulo: "1", form: "HYGIENE-KIT" }, title: "Kit de higiene pendiente", detail: kitDate ? `Último kit: ${lastKit}.` : "No hay entregas de kit registradas." });
  }

  // Documentos digitalizados
  if (!data.documents.some((d) => d.entity_id === r.id)) {
    add({ category: "documentos", severity: "baja", target: ficha, title: "Sin documentos digitalizados", detail: "Tome fotos o escanee cédula, EPS e historia clínica." });
  }

  // Cumpleaños (la edad se actualiza sola)
  const bday = nextBirthday(r.birth_date, now);
  if (bday && bday.days <= 7) {
    add({
      category: "cumpleanos", severity: "baja", target: ficha,
      title: bday.days === 0 ? `¡Hoy cumple ${bday.turning} años!` : `Cumple ${bday.turning} años en ${bday.days} día(s)`,
      detail: "Prepare la celebración con el equipo de bienestar.",
    });
  }

  return items;
}

/** Pendientes de todos los residentes activos, ordenados por importancia. */
export function buildAttention(data: AttentionData, now = new Date()): AttentionItem[] {
  return data.residents
    .filter((r) => ACTIVE_STATUSES.includes(r.status))
    .flatMap((r) => residentAttention(r, data, now))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.residentName.localeCompare(b.residentName));
}

export const countBySeverity = (items: AttentionItem[]) =>
  items.reduce((acc, i) => ({ ...acc, [i.severity]: acc[i.severity] + 1 }), { alta: 0, media: 0, baja: 0 } as Record<AttentionSeverity, number>);
