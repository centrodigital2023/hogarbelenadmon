/**
 * HB-F22 Historia de Vida dictada de una sola vez: el personal conversa con el
 * residente (o su familia), dicta todo seguido y la IA reparte cada parte en su
 * campo. Aquí está la guía de preguntas, la lectura segura de la respuesta de la
 * IA y un respaldo local por palabras clave para cuando la IA no responde.
 */
import { LIFE_HISTORY_FIELDS, normalizeText, type LifeHistoryField } from "@/lib/resident-documents";

export type LifeHistoryForm = Record<LifeHistoryField, string>;

export const MORNING_OPTIONS = ["Madrugador", "Noctámbulo", "Flexible"] as const;

interface Topic {
  field: LifeHistoryField;
  short: string;
  icon: string;
  /** Pregunta sugerida para la conversación. */
  question: string;
  /** Palabras (sin tildes) que indican que se habló del tema. */
  keywords: RegExp;
}

export const LIFE_TOPICS: Topic[] = [
  { field: "preferred_name", short: "Cómo lo llaman", icon: "👤", question: "¿Cómo le gusta que lo llamen?",
    keywords: /\b(llam(en|an|arl[oa]|e)|apodo|sobrenombre|le dicen|me dicen|don|dona)\b/ },
  { field: "occupation", short: "Oficio", icon: "💼", question: "¿A qué se dedicó en su vida?",
    keywords: /\b(trabaj\w*|oficio|profesion\w*|empleo|empresa|pension\w*|maestr[oa]|profesor\w*|agricult\w*|campesin\w*|comerciante|costurer\w*|modist\w*|ama de casa|ingenier\w*|contador\w*|enfermer\w*|conductor\w*|carpinter\w*|negocio)\b/ },
  { field: "marital_status", short: "Estado civil", icon: "💍", question: "¿Es casado, viudo, soltero?",
    keywords: /\b(casad[oa]|viud[oa]|solter[oa]|separad[oa]|divorciad[oa]|union libre|espos[oa]|marido|mujer|novi[oa]|matrimonio|enviud\w*)\b/ },
  { field: "children_info", short: "Hijos", icon: "👨‍👩‍👧‍👦", question: "¿Tiene hijos o nietos? ¿Cómo se llaman?",
    keywords: /\b(hij[oa]s?|niet[oa]s?|bisniet\w*|sin hijos|no tuvo hijos)\b/ },
  { field: "favorite_food", short: "Comida", icon: "🍲", question: "¿Qué comida le encanta?",
    keywords: /\b(comida|comer|plato|ajiaco|sancocho|bandeja|tamal\w*|arepa\w*|sopa\w*|caldo|postre\w*|dulce\w*|cafe|chocolate|almuerzo|desayuno|cena|fruta\w*|frijol\w*|carne|pollo|pescado|changua|empanada\w*|tinto|pan)\b/ },
  { field: "favorite_music", short: "Música", icon: "🎵", question: "¿Qué música o canciones le traen recuerdos?",
    keywords: /\b(music\w*|cancion\w*|bolero\w*|tango\w*|vallenato\w*|bambuco\w*|pasillo\w*|ranchera\w*|cumbia\w*|salsa|baila\w*|cantar|canta|radio|guitarra|cantante)\b/ },
  { field: "hobbies", short: "Pasatiempos", icon: "🎨", question: "¿Qué le gusta hacer en su tiempo libre?",
    keywords: /\b(pasatiempo\w*|tejer|teje|tejido|leer|lee|lectura|jardin\w*|plantas|cartas|parques|domino|ajedrez|caminar|camina|television|novela\w*|futbol|pintar|crucigrama\w*|sopa de letras|manualidad\w*|costura|cocinar|le gusta (ver|jugar|hacer))\b/ },
  { field: "morning_or_night", short: "Madruga o trasnocha", icon: "🌅", question: "¿Es madrugador o le gusta trasnochar?",
    keywords: /\b(madrug\w*|trasnoch\w*|noctambul\w*|se levanta|se acuesta|temprano|tarde en la noche|duerme)\b/ },
  { field: "spiritual_beliefs", short: "Creencias", icon: "🙏", question: "¿Tiene alguna religión o práctica espiritual?",
    keywords: /\b(catolic\w*|cristian\w*|evangelic\w*|religio\w*|creyente|dios|virgen|misa|rosario|rezar|reza|oracion\w*|iglesia|biblia|fe|espiritual\w*|testigo de jehova|ateo)\b/ },
  { field: "most_important_person", short: "Persona importante", icon: "❤️", question: "¿Quién es la persona más importante para usted hoy?",
    keywords: /\b(mas importante|persona importante|lo mas querido|su adoración|su adoracion|quien mas quiere|mas quiere|mas cercan[oa]|lo visita)\b/ },
  { field: "dislikes", short: "Le molesta", icon: "😤", question: "¿Qué le molesta o le pone de mal humor?",
    keywords: /\b(molest\w*|mal humor|disgust\w*|no le gusta|no soporta|odia|le incomoda|incomod\w*|enoj\w*|ruido|bravo|brava|se pone mal)\b/ },
  { field: "dreams", short: "Sueños", icon: "⭐", question: "¿Qué sueños o deseos tiene aquí en el Hogar?",
    keywords: /\b(sueno\w*|suena con|deseo\w*|quisiera|le gustaria|anhel\w*|ilusion\w*|esperanza|volver a|conocer|antes de morir)\b/ },
];

export const EMPTY_LIFE_FORM: LifeHistoryForm = Object.fromEntries(
  (Object.keys(LIFE_HISTORY_FIELDS) as LifeHistoryField[]).map(k => [k, ""]),
) as LifeHistoryForm;

const topicFor = (field: LifeHistoryField) => LIFE_TOPICS.find(t => t.field === field)!;

/** Temas de los que ya se habló en el dictado (para marcar la guía en verde mientras se dicta). */
export function coveredTopics(transcript: string): Set<LifeHistoryField> {
  const text = ` ${normalizeText(transcript)} `;
  return new Set(LIFE_TOPICS.filter(t => t.keywords.test(text)).map(t => t.field));
}

/** La siguiente pregunta sugerida: la primera de la guía de la que aún no se ha hablado. */
export function nextQuestion(transcript: string, form: Partial<LifeHistoryForm> = {}): Topic | null {
  const covered = coveredTopics(transcript);
  return LIFE_TOPICS.find(t => !covered.has(t.field) && !form[t.field]?.trim()) ?? null;
}

/** Convierte cualquier texto en una de las tres opciones del formulario. */
export function normalizeMorning(value: string): (typeof MORNING_OPTIONS)[number] | "" {
  const t = normalizeText(value);
  if (!t) return "";
  if (/flexib|depende|ambos|las dos|ni lo uno/.test(t)) return "Flexible";
  if (/noctamb|trasnoch|tarde en la noche|se acuesta tarde|nocturn/.test(t)) return "Noctámbulo";
  if (/madrug|temprano|primera hora|5 de la manana|4 de la manana/.test(t)) return "Madrugador";
  return "";
}

export interface OrganizedField { value: string; evidence?: string }
export interface OrganizedDictation {
  fields: Partial<Record<LifeHistoryField, OrganizedField>>;
  /** Lo que se dijo y no encajó en ningún campo, para que el personal decida. */
  unassigned: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** Lee con cuidado la respuesta de la IA: solo campos conocidos, textos con límite y opciones válidas. */
export function parseOrganized(raw: unknown): OrganizedDictation {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const src = o.fields && typeof o.fields === "object" ? (o.fields as Record<string, unknown>) : o;
  const fields: OrganizedDictation["fields"] = {};
  (Object.keys(LIFE_HISTORY_FIELDS) as LifeHistoryField[]).forEach(key => {
    const item = src[key];
    const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    let value = obj ? str(obj.value) : str(item);
    if (key === "morning_or_night") value = normalizeMorning(value);
    if (!value || /^(no (se )?(menciona|dijo|indica)|sin informaci|n\/a|ninguno)/i.test(value)) return;
    fields[key] = { value: value.slice(0, 1500), evidence: obj ? str(obj.evidence).slice(0, 300) || undefined : undefined };
  });
  return { fields, unassigned: str(o.unassigned).slice(0, 1500) };
}

/** Respaldo sin IA: cada frase va a los temas que menciona (una frase puede hablar de varios). */
export function organizeLocally(transcript: string): OrganizedDictation {
  const sentences = transcript.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const buckets: Partial<Record<LifeHistoryField, string[]>> = {};
  const leftover: string[] = [];
  for (const sentence of sentences) {
    const text = ` ${normalizeText(sentence)} `;
    const matches = LIFE_TOPICS.filter(t => t.keywords.test(text));
    if (matches.length === 0) leftover.push(sentence);
    for (const t of matches) (buckets[t.field] ??= []).push(sentence);
  }
  const fields: OrganizedDictation["fields"] = {};
  (Object.entries(buckets) as [LifeHistoryField, string[]][]).forEach(([field, parts]) => {
    const value = field === "morning_or_night" ? normalizeMorning(parts.join(" ")) : parts.join(" ");
    if (value) fields[field] = { value, evidence: parts[0] };
    else leftover.push(...parts);
  });
  return { fields, unassigned: leftover.join(" ") };
}

export type MergeMode = "reemplazar" | "agregar" | "omitir";

/** Une lo propuesto con lo que ya estaba escrito en el campo. */
export function mergeField(field: LifeHistoryField, current: string, proposed: string, mode: MergeMode): string {
  if (mode === "omitir" || !proposed.trim()) return current;
  if (mode === "reemplazar" || field === "morning_or_night" || !current.trim()) return proposed.trim();
  if (normalizeText(current).includes(normalizeText(proposed))) return current;
  const base = current.trimEnd();
  return `${base}${/[.!?]$/.test(base) ? " " : ". "}${proposed.trim()}`;
}

/** Modo inicial: si el campo está vacío se usa; si ya tiene texto, se agrega sin borrar nada. */
export function defaultMode(current: string, proposed: string): MergeMode {
  if (!current.trim()) return "reemplazar";
  if (normalizeText(current) === normalizeText(proposed)) return "omitir";
  return "agregar";
}

export { topicFor };
