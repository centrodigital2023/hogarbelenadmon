/**
 * Lógica de la nota de enfermería (pantalla NURSING-AI): turno automático,
 * frases rápidas, nota rápida sin IA y conversión a registro de bitácora (HB-F4).
 */
import { vitalIssues } from "./vital-signs";

export type Shift = "mañana" | "tarde" | "noche";

export const SHIFTS: { value: Shift; label: string; hours: string; icon: string }[] = [
  { value: "mañana", label: "Mañana", hours: "7–12", icon: "🌅" },
  { value: "tarde", label: "Tarde", hours: "12–18", icon: "☀️" },
  { value: "noche", label: "Noche", hours: "18–7", icon: "🌙" },
];

/** Same hours as the Bitácora Diaria: mañana 7-12, tarde 12-18, noche 18-7. */
export const shiftForHour = (hour: number): Shift => {
  if (hour >= 7 && hour < 12) return "mañana";
  if (hour >= 12 && hour < 18) return "tarde";
  return "noche";
};

/** YYYY-MM-DD in the device's time zone (toISOString would give tomorrow after 7 p.m. in Colombia). */
export const localDateISO = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const MOODS = [
  { value: "😊 Alegre", emoji: "😊", label: "Alegre" },
  { value: "😌 Tranquilo", emoji: "😌", label: "Tranquilo" },
  { value: "😰 Ansioso", emoji: "😰", label: "Ansioso" },
  { value: "😢 Triste", emoji: "😢", label: "Triste" },
  { value: "😤 Agitado", emoji: "😤", label: "Agitado" },
  { value: "😶 Apático", emoji: "😶", label: "Apático" },
];

export const ELIMINATIONS = ["Normal", "Continente", "Incontinente", "Estreñimiento", "Diarrea"];
export const NUTRITION_STEPS = [0, 25, 50, 75, 100];

export interface QuickPhrase {
  label: string;
  text: string;
  /** Events that usually need a follow-up record elsewhere. */
  warning?: string;
}

export const QUICK_PHRASES: { group: string; phrases: QuickPhrase[] }[] = [
  {
    group: "Estado general",
    phrases: [
      { label: "Sin novedades", text: "Turno sin novedades, residente estable." },
      { label: "Durmió bien", text: "Descansó y durmió tranquilo durante la noche." },
      { label: "Orientado", text: "Se encuentra alerta y orientado en tiempo, lugar y persona." },
      { label: "Desorientado", text: "Presenta episodios de desorientación; se reorienta con apoyo." },
      { label: "Refiere dolor", text: "Refiere dolor; se valora intensidad y se informa al profesional a cargo." },
    ],
  },
  {
    group: "Cuidados",
    phrases: [
      { label: "Baño asistido", text: "Se realiza baño asistido e higiene personal completa." },
      { label: "Cambios de posición", text: "Se realizan cambios de posición cada 2 horas para prevenir lesiones de piel." },
      { label: "Curación", text: "Se realiza curación según protocolo, herida limpia y sin signos de infección." },
      { label: "Medicación OK", text: "Recibe medicación formulada en el horario indicado, sin novedad." },
      { label: "Deambula con apoyo", text: "Deambula con apoyo y supervisión, marcha estable." },
    ],
  },
  {
    group: "Alimentación",
    phrases: [
      { label: "Comió completo", text: "Consume la totalidad de sus alimentos con buen apetito." },
      { label: "Rechazó alimentos", text: "Rechaza parcialmente los alimentos; se ofrecen alternativas y se motiva la ingesta." },
      { label: "Buena hidratación", text: "Se estimula la hidratación y la acepta sin dificultad." },
    ],
  },
  {
    group: "Social",
    phrases: [
      { label: "Visita familiar", text: "Recibe visita familiar, se muestra contento y participativo." },
      { label: "Actividad grupal", text: "Participa en las actividades recreativas del día." },
      { label: "Terapia", text: "Asiste a su sesión de terapia programada." },
    ],
  },
  {
    group: "Eventos",
    phrases: [
      { label: "Caída", text: "Presenta caída; se valora, se brinda atención inmediata y se informa a coordinación.", warning: "Registra la caída en Incidentes (HB-F20)." },
      { label: "Fiebre", text: "Presenta temperatura elevada; se aplican medidas físicas y se informa al médico.", warning: "Informa al médico tratante y vuelve a tomar la temperatura en 1 hora." },
      { label: "Cita médica", text: "Asiste a cita médica acompañado; se registran indicaciones." },
    ],
  },
];

/** Adds a phrase on its own line, skipping it if the text already contains it. */
export const appendPhrase = (text: string, phrase: string) => {
  const current = text.trimEnd();
  if (current.includes(phrase)) return text;
  return current ? `${current}\n${phrase}` : phrase;
};

/** What the nurse fills in on screen. Vital signs stay as typed text until saved. */
export interface NoteEntry {
  blood_pressure: string;
  spo2: string;
  temperature: string;
  heart_rate: string;
  glucose: string;
  weight: string;
  nutrition_pct: number | null;
  hydration_glasses: number;
  elimination: string;
  mood: string;
  observations: string;
}

export const emptyNoteEntry = (): NoteEntry => ({
  blood_pressure: "", spo2: "", temperature: "", heart_rate: "", glucose: "", weight: "",
  nutrition_pct: null, hydration_glasses: 0, elimination: "", mood: "", observations: "",
});

/** "36,5" → 36.5; empty, zero or invalid → null. */
export const parseVital = (value: string) => {
  const n = Number(value.trim().replace(",", "."));
  return value.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

export const numericVitals = (e: NoteEntry) => ({
  blood_pressure: e.blood_pressure.trim() || null,
  spo2: parseVital(e.spo2),
  temperature: parseVital(e.temperature),
  heart_rate: parseVital(e.heart_rate),
  glucose: parseVital(e.glucose),
  weight: parseVital(e.weight),
});

export const entryAlerts = (e: NoteEntry) => vitalIssues(numericVitals(e));

export const hasVitals = (e: NoteEntry) => Object.values(numericVitals(e)).some((v) => v !== null);
export const hasWellbeing = (e: NoteEntry) =>
  e.nutrition_pct !== null || e.hydration_glasses > 0 || !!e.elimination || !!e.mood;

/** Sections filled, for the progress indicator. */
export const completedSections = (e: NoteEntry, note: string) => ({
  vitals: hasVitals(e),
  wellbeing: hasWellbeing(e),
  observations: e.observations.trim().length > 0,
  note: note.trim().length > 0,
});

/** Payload for the ai-nursing-notes function (`liveEntry`). */
export const toLiveEntry = (e: NoteEntry) => ({
  ...numericVitals(e),
  vital_notes: null,
  nutrition_pct: e.nutrition_pct ?? 0,
  hydration_glasses: e.hydration_glasses,
  elimination: e.elimination || null,
  mood: e.mood || null,
  observations: e.observations.trim() || null,
});

export const toDailyLog = (
  e: NoteEntry,
  ctx: { residentId: string; userId: string; shift: Shift; date: string; responsibleName: string; responsibleRole: string; note: string; signature: string | null },
) => ({
  resident_id: ctx.residentId,
  created_by: ctx.userId,
  shift: ctx.shift,
  log_date: ctx.date,
  ...numericVitals(e),
  nutrition_pct: e.nutrition_pct ?? 0,
  hydration_glasses: e.hydration_glasses,
  elimination: e.elimination || null,
  mood: e.mood || null,
  observations: e.observations.trim() || null,
  ai_nursing_note: ctx.note || null,
  responsible_name: ctx.responsibleName || null,
  responsible_role: ctx.responsibleRole || null,
  signature: ctx.signature,
});

/** Builds a clean, structured note from the quick picks, without AI (works offline). */
export const composeQuickNote = (
  e: NoteEntry,
  ctx: { residentName: string; shift: Shift; date: string; responsibleName?: string; responsibleRole?: string },
) => {
  const v = numericVitals(e);
  const lines = [`**Nota de enfermería — ${ctx.residentName}**`, `Fecha: ${ctx.date} · Turno: ${ctx.shift}`, ""];

  const vitals = [
    v.blood_pressure && `T.A. ${v.blood_pressure} mmHg`,
    v.heart_rate && `FC ${v.heart_rate} lpm`,
    v.temperature && `Temp ${v.temperature} °C`,
    v.spo2 && `SpO2 ${v.spo2}%`,
    v.glucose && `Glucemia ${v.glucose} mg/dl`,
    v.weight && `Peso ${v.weight} kg`,
  ].filter(Boolean);
  if (vitals.length) lines.push(`**Signos vitales:** ${vitals.join(", ")}.`);

  const alerts = entryAlerts(e);
  if (alerts.length) lines.push(`**⚠️ Valores fuera de rango:** ${alerts.join(", ")}. Se informa al profesional a cargo.`);

  const wellbeing = [
    e.mood && `ánimo ${e.mood.replace(/^\S+\s/, "").toLowerCase()}`,
    e.nutrition_pct !== null && `consume el ${e.nutrition_pct}% de sus alimentos`,
    e.hydration_glasses > 0 && `${e.hydration_glasses} ${e.hydration_glasses === 1 ? "vaso" : "vasos"} de líquido`,
    e.elimination && `eliminación ${e.elimination.toLowerCase()}`,
  ].filter(Boolean);
  if (wellbeing.length) lines.push(`**Bienestar:** ${wellbeing.join(", ")}.`);

  if (e.observations.trim()) lines.push("", `**Novedades:**`, e.observations.trim());

  const who = ctx.responsibleName ? `${ctx.responsibleName}${ctx.responsibleRole ? ` — ${ctx.responsibleRole}` : ""}` : "";
  if (who) lines.push("", `Registrado por: ${who}`);
  return lines.join("\n");
};

/** Human "hace 3 días" style label for the last record. */
export const relativeDay = (dateISO: string, today = localDateISO()) => {
  const days = Math.round((Date.parse(today) - Date.parse(dateISO.slice(0, 10))) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} días`;
};

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Small, safe Markdown → HTML for previewing notes: **bold**, *italic*, > quote, # titles, - lists. */
export const noteToHtml = (markdown: string) =>
  markdown
    .split("\n")
    .map((raw) => {
      let line = escapeHtml(raw)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>");
      if (/^&gt;\s?/.test(line)) return `<p class="note-quote">${line.replace(/^&gt;\s?/, "")}</p>`;
      if (/^#{1,6}\s/.test(line)) return `<p class="note-title">${line.replace(/^#{1,6}\s/, "")}</p>`;
      if (/^[-•]\s/.test(line)) line = `• ${line.slice(2)}`;
      return line.trim() ? `<p>${line}</p>` : `<p class="note-gap"></p>`;
    })
    .join("");
