/**
 * Lectura inteligente de documentos del residente.
 *
 * La IA (función ai-resident-document) y un lector local de respaldo extraen datos de
 * cédulas, carnés de EPS, historias clínicas, epicrisis, fórmulas médicas, etc. Aquí se
 * normaliza lo extraído y se convierte en PROPUESTAS por formulario (Ficha, HB-F1, HB-F22,
 * Valoración, Alimentación, Bienestar, Sistema de salud, Higiene, Seguridad). Nada se guarda
 * sin que el personal revise y confirme cada propuesta.
 */
import { TESTS_GERIATRICOS } from "@/data/tests-geriatricos";
import { interpretScore } from "@/lib/geriatric-scoring";
import { parseDateOnly } from "@/lib/resident-age";

// ───────────────────────────── Tipos ─────────────────────────────

export const DOCUMENT_KINDS = {
  cedula: "Cédula de ciudadanía",
  carne_eps: "Carné o certificado de EPS",
  historia_clinica: "Historia clínica",
  epicrisis: "Epicrisis / egreso hospitalario",
  formula_medica: "Fórmula médica",
  laboratorios: "Laboratorios / exámenes",
  vacunacion: "Carné de vacunación",
  contrato: "Contrato de servicios",
  reglamento: "Acta de reglamento interno",
  valoracion_geriatrica: "Valoración geriátrica",
  psicologia: "Informe psicológico / social",
  nutricion: "Concepto de nutrición",
  otro: "Otro documento",
} as const;
export type DocumentKind = keyof typeof DOCUMENT_KINDS;

export const RESIDENT_FIELDS = {
  full_name: "Nombre completo",
  document_id: "Documento de identidad",
  birth_date: "Fecha de nacimiento",
  birth_place: "Lugar de nacimiento",
  gender: "Género",
  eps: "EPS",
  blood_type: "Tipo de sangre",
  allergies: "Alergias",
  special_diet: "Dieta especial",
  spiritual_preference: "Preferencia espiritual",
  treating_doctor_name: "Médico tratante",
  treating_doctor_phone: "Teléfono del médico",
  emergency_contact_1_name: "Contacto de emergencia 1",
  emergency_contact_1_phone: "Teléfono contacto 1",
  emergency_contact_1_relation: "Parentesco contacto 1",
  emergency_contact_2_name: "Contacto de emergencia 2",
  emergency_contact_2_phone: "Teléfono contacto 2",
  emergency_contact_2_relation: "Parentesco contacto 2",
  responsible_family_name: "Familiar responsable",
  responsible_family_document: "Documento del familiar",
  responsible_family_phone: "Teléfono del familiar",
} as const;
export type ResidentField = keyof typeof RESIDENT_FIELDS;

export const LIFE_HISTORY_FIELDS = {
  preferred_name: "Cómo le gusta que lo llamen",
  occupation: "Oficio o profesión",
  marital_status: "Estado civil",
  children_info: "Hijos",
  favorite_food: "Comida favorita",
  favorite_music: "Música favorita",
  hobbies: "Pasatiempos",
  morning_or_night: "Madrugador / noctámbulo",
  spiritual_beliefs: "Creencias espirituales",
  most_important_person: "Persona más importante",
  dislikes: "Cosas que le molestan",
  dreams: "Sueños y deseos",
} as const;
export type LifeHistoryField = keyof typeof LIFE_HISTORY_FIELDS;

export const CHECKLIST_FIELDS = {
  doc_cedula: "Fotocopia de cédula",
  doc_eps: "Carné de EPS",
  doc_contrato: "Contrato de servicios",
  doc_reglamento: "Acta de reglamento interno",
  doc_contactos_emergencia: "Datos de 2 familiares (emergencias)",
  doc_inventario_f3: "HB-F3 Inventario",
  doc_historia_clinica: "Resumen de historia clínica",
  doc_formulas_medicas: "Fórmulas médicas vigentes",
  doc_laboratorios: "Laboratorios recientes",
  doc_valoracion_f2: "Valoración inicial",
  doc_vacunacion: "Carné de vacunación",
} as const;
export type ChecklistField = keyof typeof CHECKLIST_FIELDS;

/** Qué casilla de HB-F1 cumple cada tipo de documento. */
export const KIND_TO_CHECKLIST: Partial<Record<DocumentKind, ChecklistField>> = {
  cedula: "doc_cedula",
  carne_eps: "doc_eps",
  contrato: "doc_contrato",
  reglamento: "doc_reglamento",
  historia_clinica: "doc_historia_clinica",
  epicrisis: "doc_historia_clinica",
  formula_medica: "doc_formulas_medicas",
  laboratorios: "doc_laboratorios",
  vacunacion: "doc_vacunacion",
  valoracion_geriatrica: "doc_valoracion_f2",
};

export type EmergencyFolderField =
  | "has_cedula" | "has_clinical_summary" | "has_medications_list" | "has_doctor_contact" | "has_family_contacts";

export interface ExtractedField { value: string; confidence: number; evidence?: string }
export interface ExtractedMedication {
  medication_name: string; concentration?: string; dose?: string; route?: string; schedule?: string;
  prescription_date?: string; confidence: number; evidence?: string;
}
export interface ExtractedAppointment {
  appointment_date: string; appointment_time?: string; specialty?: string; location?: string; notes?: string;
  confidence: number; evidence?: string;
}
export interface ExtractedScale { test_key: string; score: number; assessment_date?: string; confidence: number; evidence?: string }
export interface ExtractedHospitalization {
  hospital_admission_date?: string; hospital_discharge_date?: string; diagnosis?: string; new_instructions?: string;
  followup_date?: string; confidence: number; evidence?: string;
}
export interface ExtractedWellbeing { reason?: string; evolution?: string; recommendations?: string; confidence: number; evidence?: string }
export interface ExtractedFall { date?: string; description: string; evidence?: string }

export interface DocumentExtraction {
  documentKind: DocumentKind;
  documentTitle: string;
  documentDate: string | null;
  summary: string;
  nameOnDocument: string | null;
  alerts: { severity: "alta" | "media" | "baja"; message: string }[];
  resident: Partial<Record<ResidentField, ExtractedField>>;
  lifeHistory: Partial<Record<LifeHistoryField, ExtractedField>>;
  diagnoses: string[];
  medications: ExtractedMedication[];
  appointments: ExtractedAppointment[];
  scales: ExtractedScale[];
  hospitalization: ExtractedHospitalization | null;
  wellbeing: ExtractedWellbeing | null;
  hygieneNeeds: string[];
  safety: { fallRisk: boolean; notes: string[]; falls: ExtractedFall[] };
  source: "ia" | "local" | "ia+local";
}

// ───────────────────────── Normalizadores ─────────────────────────

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12,
};

const iso = (y: number, m: number, d: number) => {
  const value = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return parseDateOnly(value) ? value : null;
};

/** Acepta 1940-05-10, 10/05/1940, 10-05-1940, 10.05.1940 y "10 de mayo de 1940" (formato colombiano día/mes). */
export function normalizeDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toLowerCase();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = /^(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)\.?\s*(?:de\s+|del\s+)?(\d{4})$/.exec(s);
  if (m && MONTHS[m[2]]) return iso(+m[3], MONTHS[m[2]], +m[1]);
  return null;
}

/** "o positivo", "O+", "ORH+" → "O+". */
export function normalizeBloodType(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.toUpperCase().replace(/\s+/g, "").replace("RH", "");
  const m = /^(AB|A|B|O|0)(\+|-|POSITIVO|NEGATIVO|POS|NEG)$/.exec(s);
  if (!m) return null;
  const group = m[1] === "0" ? "O" : m[1];
  return `${group}${m[2].startsWith("+") || m[2].startsWith("POS") ? "+" : "-"}`;
}

export function normalizeGender(input: unknown): "M" | "F" | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toLowerCase();
  if (/^(m|masculino|hombre|male)$/.test(s)) return "M";
  if (/^(f|femenino|mujer|female)$/.test(s)) return "F";
  return null;
}

export const normalizeText = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9+\- ]/g, " ").replace(/\s+/g, " ").trim();

const digitsOnly = (s: string) => s.replace(/\D/g, "");

const clampConfidence = (c: unknown) => {
  let n = typeof c === "number" ? c : typeof c === "string" ? parseFloat(c) : NaN;
  if (!Number.isFinite(n)) return 0.7;
  if (n > 1) n = n / 100;
  return Math.min(1, Math.max(0, n));
};

const str = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s && !/^(null|n\/?a|no aplica|no registra|desconocido|-)$/i.test(s) ? s : undefined;
};

/** Limpia un campo de la ficha según su tipo; devuelve null si el valor no es válido. */
export function cleanResidentValue(field: ResidentField, raw: string): string | null {
  switch (field) {
    case "birth_date": {
      const d = normalizeDate(raw);
      if (!d) return null;
      const year = +d.slice(0, 4);
      return year >= 1900 && parseDateOnly(d)! <= new Date() ? d : null;
    }
    case "blood_type": return normalizeBloodType(raw);
    case "gender": return normalizeGender(raw);
    case "document_id":
    case "responsible_family_document": {
      const digits = digitsOnly(raw);
      return digits.length >= 5 && digits.length <= 12 ? digits : null;
    }
    case "treating_doctor_phone":
    case "emergency_contact_1_phone":
    case "emergency_contact_2_phone":
    case "responsible_family_phone": {
      const digits = digitsOnly(raw);
      return digits.length >= 7 && digits.length <= 13 ? digits : null;
    }
    default:
      return raw.trim().slice(0, 500) || null;
  }
}

// ──────────────────── Normalización de la respuesta IA ────────────────────

const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function readField(v: unknown): ExtractedField | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number") {
    const value = str(v);
    return value ? { value, confidence: 0.7 } : null;
  }
  const o = asObject(v);
  const value = str(o.value);
  if (!value) return null;
  return { value, confidence: clampConfidence(o.confidence), evidence: str(o.evidence) };
}

const SCALE_ALIASES: Record<string, string> = {
  barthel: "barthel", lawton: "lawton", "lawton brody": "lawton", pfeiffer: "pfeiffer", spmsq: "pfeiffer",
  yesavage: "yesavage", "gds 15": "yesavage", gds: "yesavage", tinetti: "tinetti", mna: "mna",
  fried: "fried", gijon: "gijon", braden: "braden", mmse: "mmse", minimental: "mmse", "mini mental": "mmse",
  folstein: "mmse", charlson: "charlson", zarit: "zarit",
};
export const scaleKey = (name: unknown): string | null => {
  const n = normalizeText(String(name ?? ""));
  if (TESTS_GERIATRICOS[n]) return n;
  for (const [alias, key] of Object.entries(SCALE_ALIASES)) if (n.includes(alias)) return key;
  return null;
};

/** Convierte la respuesta de la IA (posiblemente incompleta o con formatos libres) en una extracción segura. */
export function parseExtraction(raw: unknown): DocumentExtraction {
  const o = asObject(raw);
  const kind = String(o.document_kind ?? "otro") as DocumentKind;

  const resident: DocumentExtraction["resident"] = {};
  const r = asObject(o.resident);
  (Object.keys(RESIDENT_FIELDS) as ResidentField[]).forEach((key) => {
    const field = readField(r[key]);
    if (!field) return;
    const value = cleanResidentValue(key, field.value);
    if (value) resident[key] = { ...field, value };
  });

  const lifeHistory: DocumentExtraction["lifeHistory"] = {};
  const lh = asObject(o.life_history);
  (Object.keys(LIFE_HISTORY_FIELDS) as LifeHistoryField[]).forEach((key) => {
    const field = readField(lh[key]);
    if (field) lifeHistory[key] = { ...field, value: field.value.slice(0, 800) };
  });

  const medications = asArray(o.medications).map(asObject).flatMap((m): ExtractedMedication[] => {
    const name = str(m.medication_name ?? m.name);
    if (!name) return [];
    return [{
      medication_name: name.slice(0, 120), concentration: str(m.concentration), dose: str(m.dose), route: str(m.route),
      schedule: str(m.schedule ?? m.frequency), prescription_date: normalizeDate(m.prescription_date) ?? undefined,
      confidence: clampConfidence(m.confidence), evidence: str(m.evidence),
    }];
  });

  const appointments = asArray(o.appointments).map(asObject).flatMap((a): ExtractedAppointment[] => {
    const date = normalizeDate(a.appointment_date ?? a.date);
    if (!date) return [];
    const time = str(a.appointment_time ?? a.time);
    return [{
      appointment_date: date, appointment_time: time && /^\d{1,2}:\d{2}/.test(time) ? time.slice(0, 5).padStart(5, "0") : undefined,
      specialty: str(a.specialty), location: str(a.location), notes: str(a.notes),
      confidence: clampConfidence(a.confidence), evidence: str(a.evidence),
    }];
  });

  const scales = asArray(o.scales).map(asObject).flatMap((s): ExtractedScale[] => {
    const key = scaleKey(s.test_key ?? s.name);
    const score = typeof s.score === "number" ? s.score : parseFloat(String(s.score ?? ""));
    if (!key || !Number.isFinite(score) || score < 0 || score > TESTS_GERIATRICOS[key].max) return [];
    return [{ test_key: key, score, assessment_date: normalizeDate(s.assessment_date) ?? undefined, confidence: clampConfidence(s.confidence), evidence: str(s.evidence) }];
  });

  const h = asObject(o.hospitalization);
  const hospitalization: ExtractedHospitalization | null = str(h.diagnosis) || normalizeDate(h.hospital_admission_date) || normalizeDate(h.hospital_discharge_date)
    ? {
      hospital_admission_date: normalizeDate(h.hospital_admission_date) ?? undefined,
      hospital_discharge_date: normalizeDate(h.hospital_discharge_date) ?? undefined,
      diagnosis: str(h.diagnosis), new_instructions: str(h.new_instructions),
      followup_date: normalizeDate(h.followup_date) ?? undefined,
      confidence: clampConfidence(h.confidence), evidence: str(h.evidence),
    }
    : null;

  const w = asObject(o.wellbeing);
  const wellbeing: ExtractedWellbeing | null = str(w.reason) || str(w.evolution) || str(w.recommendations)
    ? { reason: str(w.reason), evolution: str(w.evolution), recommendations: str(w.recommendations), confidence: clampConfidence(w.confidence), evidence: str(w.evidence) }
    : null;

  const safety = asObject(o.safety);
  const alerts = asArray(o.alerts).map(asObject).flatMap((a) => {
    const message = str(a.message);
    if (!message) return [];
    const severity = (["alta", "media", "baja"].includes(String(a.severity)) ? a.severity : "media") as "alta" | "media" | "baja";
    return [{ severity, message }];
  });

  return {
    documentKind: kind in DOCUMENT_KINDS ? kind : "otro",
    documentTitle: str(o.document_title) ?? DOCUMENT_KINDS[kind in DOCUMENT_KINDS ? kind : "otro"],
    documentDate: normalizeDate(o.document_date),
    summary: str(o.summary) ?? "",
    nameOnDocument: str(o.name_on_document) ?? null,
    alerts,
    resident,
    lifeHistory,
    diagnoses: asArray(o.diagnoses).map((d) => str(typeof d === "object" ? asObject(d).name : d)).filter((d): d is string => !!d),
    medications,
    appointments,
    scales,
    hospitalization,
    wellbeing,
    hygieneNeeds: asArray(o.hygiene_needs).map((x) => str(x)).filter((x): x is string => !!x),
    safety: {
      fallRisk: safety.fall_risk === true,
      notes: asArray(safety.notes).map((x) => str(x)).filter((x): x is string => !!x),
      falls: asArray(safety.falls).map(asObject).flatMap((f) => {
        const description = str(f.description);
        return description ? [{ date: normalizeDate(f.date) ?? undefined, description, evidence: str(f.evidence) }] : [];
      }),
    },
    source: "ia",
  };
}

// ───────────────────────── Lector local ─────────────────────────

export const COLOMBIAN_EPS = [
  "Nueva EPS", "Sanitas", "Sura", "Salud Total", "Coosalud", "Famisanar", "Compensar", "Mutual Ser", "Emssanar",
  "Asmet Salud", "Savia Salud", "Capresoca", "Aliansalud", "Comfenalco", "Cajacopi", "SOS", "Capital Salud",
  "Pijaos Salud", "Dusakawi", "Anas Wayuu", "Mallamas", "Comfaoriente", "Comfachocó", "Comfaguajira", "Comfahuila",
  "Comfasucre", "Comfacundi", "Ecoopsos", "Medimás", "Fomag", "Sanidad Militar", "Sanidad Policía",
];

const KIND_KEYWORDS: [DocumentKind, RegExp][] = [
  ["epicrisis", /epicrisis|egreso hospitalario|resumen de egreso|fecha de egreso/],
  ["formula_medica", /formula medica|prescripcion|posologia|via de administracion|cada \d+ horas/],
  ["cedula", /registraduria|identificacion personal|lugar de expedicion|fecha de expedicion/],
  ["carne_eps", /certificado de afiliacion|carne.*eps|afiliado|regimen (contributivo|subsidiado)/],
  ["laboratorios", /hemograma|creatinina|glicemia|valores de referencia|laboratorio clinico|uroanalisis/],
  ["vacunacion", /vacuna|vacunacion|dosis de refuerzo|influenza/],
  ["valoracion_geriatrica", /barthel|lawton|tinetti|minimental|yesavage|pfeiffer|valoracion geriatrica/],
  ["contrato", /contrato de prestacion|clausula|el contratante/],
  ["reglamento", /reglamento interno/],
  ["psicologia", /psicolog|trabajo social|valoracion psicosocial/],
  ["nutricion", /nutricion|nutricionista|dieta hiposodica|dieta blanda/],
  ["historia_clinica", /historia clinica|antecedentes|motivo de consulta|enfermedad actual|examen fisico/],
];

/** Tipo de documento con más señales en el texto (en empate gana el primero de la lista). */
export function classifyDocument(text: string): DocumentKind {
  const t = normalizeText(text);
  let best: DocumentKind = "otro";
  let bestHits = 0;
  for (const [kind, re] of KIND_KEYWORDS) {
    const hits = t.match(new RegExp(re.source, "g"))?.length ?? 0;
    if (hits > bestHits) { best = kind; bestHits = hits; }
  }
  return best;
}

/**
 * Respaldo sin conexión a la IA: encuentra con reglas los datos más estructurados
 * (cédula, nacimiento, sangre, EPS, alergias, sexo) para que la función siga siendo útil.
 */
export function localExtract(text: string): DocumentExtraction {
  const plain = text.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const resident: DocumentExtraction["resident"] = {};
  const put = (field: ResidentField, raw: string | undefined, evidence: string) => {
    if (!raw) return;
    const value = cleanResidentValue(field, raw);
    if (value) resident[field] = { value, confidence: 0.6, evidence: evidence.trim().slice(0, 160) };
  };

  let m = /(?:cedula(?: de ciudadania)?|\bC\.?\s?C\.?|documento(?: de identidad)?|identificacion)\s*(?:No\.?|N[°º]|numero|#)?\s*:?\s*(\d[\d.\s]{4,14}\d)/i.exec(plain);
  if (m) put("document_id", m[1], m[0]);

  const DATE = String.raw`(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+de\s+[a-z]+\s+de\s+\d{4})`;
  m = new RegExp(String.raw`(?:fecha de nacimiento|nacimiento|f\.?\s?nac\.?)\s*:?\s*` + DATE, "i").exec(plain);
  if (m) put("birth_date", m[1], m[0]);

  m = /(?:grupo sanguineo|tipo de sangre|\bG\.?S\.?|\bRH)\s*(?:y\s*RH)?\s*:?\s*(AB|A|B|O|0)\s*(?:RH)?\s*(\+|-|positivo|negativo|pos\b|neg\b)/i.exec(plain);
  if (m) put("blood_type", `${m[1]}${m[2]}`, m[0]);

  m = /\bsexo\s*:?\s*(masculino|femenino|M|F)\b/i.exec(plain);
  if (m) put("gender", m[1], m[0]);

  const lowerPlain = normalizeText(plain);
  const eps = COLOMBIAN_EPS.find((e) => new RegExp(`\\b${normalizeText(e)}\\b`).test(lowerPlain));
  if (eps && /eps|afiliad|salud/.test(lowerPlain)) put("eps", eps, eps);

  m = /alergi(?:as?|co a)\s*:?\s*([^\n.]{2,120})/i.exec(plain);
  if (m) {
    const value = /^(\s*)(niega|no refiere|ninguna|no conocidas?|negativo)/i.test(m[1]) ? "Niega alergias conocidas" : m[1].trim();
    put("allergies", value, m[0]);
  }

  const kind = classifyDocument(text);
  return {
    documentKind: kind, documentTitle: DOCUMENT_KINDS[kind], documentDate: null,
    summary: "", nameOnDocument: null, alerts: [], resident, lifeHistory: {}, diagnoses: [],
    medications: [], appointments: [], scales: [], hospitalization: null, wellbeing: null,
    hygieneNeeds: [], safety: { fallRisk: false, notes: [], falls: [] }, source: "local",
  };
}

/** Une la extracción de la IA con la local: la IA manda; lo local completa vacíos y, si coincide, sube la confianza. */
export function mergeExtractions(ai: DocumentExtraction | null, local: DocumentExtraction): DocumentExtraction {
  if (!ai) return local;
  const resident = { ...ai.resident };
  let usedLocal = false;
  (Object.keys(local.resident) as ResidentField[]).forEach((key) => {
    const l = local.resident[key]!;
    const a = resident[key];
    if (!a) { resident[key] = l; usedLocal = true; }
    else if (normalizeText(a.value) === normalizeText(l.value)) resident[key] = { ...a, confidence: Math.max(a.confidence, 0.95) };
  });
  return {
    ...ai,
    documentKind: ai.documentKind === "otro" ? local.documentKind : ai.documentKind,
    resident,
    source: usedLocal ? "ia+local" : "ia",
  };
}

// ───────────────────────── Propuestas ─────────────────────────

export const SECTIONS = {
  ficha: { label: "Ficha del residente", form: null },
  hb_f1: { label: "HB-F1 · Checklist de admisión", form: "HB-F1" },
  hb_f22: { label: "HB-F22 · Historia de vida", form: "HB-F22" },
  valoracion: { label: "Valoración geriátrica", form: null },
  alimentacion: { label: "Alimentación", form: null },
  bienestar: { label: "Bienestar", form: "HB-F10" },
  sistema_salud: { label: "Sistema de salud", form: "HB-F14" },
  higiene: { label: "Higiene", form: null },
  seguridad: { label: "Seguridad", form: "HB-F20" },
} as const;
export type SectionKey = keyof typeof SECTIONS;

export type ProposalOp =
  | { type: "resident"; field: ResidentField | "notes"; mode: "set" | "append" }
  | { type: "life_history"; field: LifeHistoryField }
  | { type: "checklist"; field: ChecklistField }
  | { type: "emergency_folder"; field: EmergencyFolderField }
  | { type: "medication_insert"; data: { medication_name: string; concentration?: string; dose?: string; route?: string; schedule?: string; prescription_date?: string } }
  | { type: "medication_update"; id: string; data: { concentration?: string; dose?: string; route?: string; schedule?: string } }
  | { type: "appointment_insert"; data: { appointment_date: string; appointment_time?: string; specialty?: string; location?: string; notes?: string } }
  | { type: "assessment_insert"; data: { test_key: string; test_name: string; score: number; max_score: number; assessment_date: string; interpretation: string } }
  | { type: "post_hospitalization_insert"; data: { hospital_admission_date?: string; hospital_discharge_date?: string; diagnosis?: string; new_instructions?: string; followup_date?: string } }
  | { type: "psychosocial_insert"; data: { record_date: string; reason?: string; evolution?: string; recommendations?: string } }
  | { type: "incident_insert"; data: { incident_datetime: string; incident_type: string; description: string } };

export interface Proposal {
  id: string;
  section: SectionKey;
  label: string;
  current: string | null;
  /** Valor que se guardará (editable cuando `editable`). */
  proposed: string;
  op: ProposalOp;
  confidence: number;
  evidence?: string;
  status: "nuevo" | "complemento" | "conflicto";
  selected: boolean;
  editable: boolean;
}

export interface ProposalContext {
  resident: Partial<Record<ResidentField | "notes", string | null>> & { full_name: string };
  lifeHistory: Partial<Record<LifeHistoryField, string | null>> | null;
  checklist: Partial<Record<ChecklistField, boolean | null>> | null;
  emergencyFolder: Partial<Record<EmergencyFolderField, boolean | null>> | null;
  medications: { id: string; medication_name: string; dose?: string | null; concentration?: string | null; schedule?: string | null; route?: string | null }[];
  appointments: { appointment_date: string; specialty?: string | null }[];
  assessments: { test_key: string; assessment_date: string }[];
  incidents: { incident_datetime: string }[];
  fileName: string;
  today?: Date;
}

export interface ProposalSet {
  proposals: Proposal[];
  /** Advertencia cuando el documento parece ser de otra persona. */
  identityWarning: string | null;
}

const MIN_AUTO_CONFIDENCE = 0.6;
const todayIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** ¿Dos nombres son de la misma persona? Compara palabras significativas sin tildes. */
export function namesMatch(a: string, b: string): boolean {
  const tokens = (s: string) => normalizeText(s).split(" ").filter((t) => t.length > 2 && !["del", "las", "los"].includes(t));
  const ta = tokens(a);
  const tb = new Set(tokens(b));
  if (ta.length === 0 || tb.size === 0) return true;
  const shared = ta.filter((t) => tb.has(t)).length;
  return shared >= Math.min(2, Math.min(ta.length, tb.size));
}

/** Divide "penicilina, AINES y mariscos" en elementos. */
export const splitList = (s: string) =>
  s.split(/[,;\n]|\s+y\s+|\s+e\s+/i).map((x) => x.trim()).filter(Boolean);

const NO_ALLERGY = /^(niega|no refiere|ninguna|sin alergias|no conocidas?|negativo|nkda)/i;

/** Une la lista de alergias actual con la nueva sin duplicar. */
export function mergeAllergies(current: string | null | undefined, incoming: string): string | null {
  const cur = (current ?? "").trim();
  if (NO_ALLERGY.test(incoming)) return cur ? null : incoming;
  const items = cur && !NO_ALLERGY.test(cur) ? splitList(cur) : [];
  const known = new Set(items.map(normalizeText));
  const added = splitList(incoming).filter((x) => !NO_ALLERGY.test(x) && !known.has(normalizeText(x)));
  if (added.length === 0) return null;
  return [...items, ...added].join(", ");
}

const appendLine = (current: string | null | undefined, line: string) => {
  const cur = (current ?? "").trim();
  if (cur && normalizeText(cur).includes(normalizeText(line))) return null;
  return cur ? `${cur}\n${line}` : line;
};

const sameMedication = (a: string, b: string) => {
  const first = (s: string) => normalizeText(s).split(" ")[0];
  return first(a) === first(b);
};

const FIELD_SECTION: Partial<Record<ResidentField, SectionKey>> = {
  special_diet: "alimentacion",
  allergies: "seguridad",
  spiritual_preference: "bienestar",
  eps: "sistema_salud",
  treating_doctor_name: "sistema_salud",
  treating_doctor_phone: "sistema_salud",
};

/**
 * Convierte la extracción en propuestas revisables. Reglas:
 * - Lo que ya está igual en el registro no se propone.
 * - Campo vacío → "nuevo" (marcado si la confianza es suficiente).
 * - Campo con otro valor → "conflicto" (nunca marcado por defecto).
 * - Si el documento parece de otra persona, nada queda marcado.
 */
export function buildProposals(ex: DocumentExtraction, ctx: ProposalContext): ProposalSet {
  const today = ctx.today ?? new Date();
  const docLabel = `«${ctx.fileName}»`;
  const out: Proposal[] = [];
  let n = 0;
  const add = (p: Omit<Proposal, "id" | "selected"> & { selected?: boolean }) => {
    out.push({ ...p, id: `p${++n}`, selected: p.selected ?? (p.status !== "conflicto" && p.confidence >= MIN_AUTO_CONFIDENCE) });
  };

  // Identidad
  let identityWarning: string | null = null;
  const docId = ex.resident.document_id?.value;
  const currentDocId = ctx.resident.document_id ? digitsOnly(ctx.resident.document_id) : "";
  if (docId && currentDocId && docId !== currentDocId) {
    identityWarning = `El documento trae la cédula ${docId}, pero el residente tiene registrada la ${currentDocId}. Verifique que el archivo sea de ${ctx.resident.full_name}.`;
  } else if (ex.nameOnDocument && !namesMatch(ex.nameOnDocument, ctx.resident.full_name)) {
    identityWarning = `El documento parece ser de «${ex.nameOnDocument}», no de ${ctx.resident.full_name}. Revise antes de aplicar.`;
  }

  // Ficha / alimentación / seguridad / sistema de salud (campos del residente)
  (Object.keys(ex.resident) as ResidentField[]).forEach((field) => {
    const f = ex.resident[field]!;
    if (field === "full_name") return; // el nombre solo se usa para validar identidad
    const current = ctx.resident[field] ?? null;
    const section = FIELD_SECTION[field] ?? "ficha";
    if (field === "allergies") {
      const merged = mergeAllergies(current, f.value);
      if (!merged) return;
      const replacingNone = !!current && NO_ALLERGY.test(current.trim());
      add({
        section, label: RESIDENT_FIELDS[field], current, proposed: merged, confidence: f.confidence, evidence: f.evidence,
        op: { type: "resident", field, mode: "set" }, editable: true,
        status: !current ? "nuevo" : replacingNone ? "conflicto" : "complemento",
        // Una alergia nueva es información de seguridad: se propone marcada aunque contradiga "niega alergias"
        selected: f.confidence >= MIN_AUTO_CONFIDENCE,
      });
      return;
    }
    if (current && normalizeText(current) === normalizeText(f.value)) return;
    if (field === "document_id" && current && identityWarning) return;
    add({
      section, label: RESIDENT_FIELDS[field], current, proposed: f.value, confidence: f.confidence, evidence: f.evidence,
      op: { type: "resident", field, mode: "set" }, editable: true, status: current ? "conflicto" : "nuevo",
    });
  });

  // HB-F1: el documento cumple un requisito de la carpeta de ingreso
  const checklistField = KIND_TO_CHECKLIST[ex.documentKind];
  if (checklistField && !ctx.checklist?.[checklistField]) {
    add({
      section: "hb_f1", label: CHECKLIST_FIELDS[checklistField], current: "Pendiente", proposed: `Recibido (${docLabel})`,
      op: { type: "checklist", field: checklistField }, confidence: 0.9, status: "nuevo", editable: false,
    });
  }
  const contact = (k: 1 | 2) => ex.resident[`emergency_contact_${k}_name`]?.value ?? ctx.resident[`emergency_contact_${k}_name`];
  if (contact(1) && contact(2) && !ctx.checklist?.doc_contactos_emergencia && (ex.resident.emergency_contact_1_name || ex.resident.emergency_contact_2_name)) {
    add({
      section: "hb_f1", label: CHECKLIST_FIELDS.doc_contactos_emergencia, current: "Pendiente", proposed: "Completo: 2 contactos registrados",
      op: { type: "checklist", field: "doc_contactos_emergencia" }, confidence: 0.85, status: "nuevo", editable: false,
    });
  }

  // HB-F22: historia de vida
  (Object.keys(ex.lifeHistory) as LifeHistoryField[]).forEach((field) => {
    const f = ex.lifeHistory[field]!;
    const current = ctx.lifeHistory?.[field] ?? null;
    if (current && normalizeText(current) === normalizeText(f.value)) return;
    add({
      section: "hb_f22", label: LIFE_HISTORY_FIELDS[field], current, proposed: f.value, confidence: f.confidence, evidence: f.evidence,
      op: { type: "life_history", field }, editable: true, status: current ? "conflicto" : "nuevo",
    });
  });

  // Valoración geriátrica: escalas reportadas en el documento y diagnósticos
  ex.scales.forEach((s) => {
    const date = s.assessment_date ?? ex.documentDate ?? todayIso(today);
    if (ctx.assessments.some((a) => a.test_key === s.test_key && a.assessment_date.slice(0, 10) === date)) return;
    const test = TESTS_GERIATRICOS[s.test_key];
    const interpretation = `${interpretScore(s.test_key, s.score)} · Tomado del documento ${docLabel}`;
    add({
      section: "valoracion", label: `Escala ${test.name}`, current: null,
      proposed: `${s.score}/${test.max} (${interpretScore(s.test_key, s.score)}) · ${date}`,
      op: { type: "assessment_insert", data: { test_key: s.test_key, test_name: test.name, score: s.score, max_score: test.max, assessment_date: date, interpretation } },
      confidence: s.confidence, evidence: s.evidence, status: "nuevo", editable: false,
    });
  });
  if (ex.diagnoses.length > 0) {
    const line = `Diagnósticos (${ex.documentDate ?? todayIso(today)}): ${ex.diagnoses.join("; ")}`;
    const next = appendLine(ctx.resident.notes, line);
    if (next) add({
      section: "valoracion", label: "Diagnósticos y antecedentes", current: ctx.resident.notes ?? null, proposed: line,
      op: { type: "resident", field: "notes", mode: "append" }, confidence: 0.8, status: "complemento", editable: true,
    });
  }

  // Sistema de salud: medicamentos (HB-F14), citas (HB-F17), hospitalización, carpeta de emergencia
  const seenMeds = new Set<string>();
  ex.medications.forEach((m) => {
    const key = normalizeText(m.medication_name);
    if (seenMeds.has(key)) return;
    seenMeds.add(key);
    const summary = [m.medication_name, m.concentration, m.dose, m.route, m.schedule].filter(Boolean).join(" · ");
    const existing = ctx.medications.find((e) => sameMedication(e.medication_name, m.medication_name));
    if (existing) {
      const changes: Record<string, string> = {};
      (["concentration", "dose", "route", "schedule"] as const).forEach((k) => {
        const v = m[k];
        if (v && normalizeText(v) !== normalizeText(existing[k] ?? "")) changes[k] = v;
      });
      if (Object.keys(changes).length === 0) return;
      add({
        section: "sistema_salud", label: `HB-F14 · Actualizar ${existing.medication_name}`,
        current: [existing.medication_name, existing.concentration, existing.dose, existing.route, existing.schedule].filter(Boolean).join(" · "),
        proposed: summary, op: { type: "medication_update", id: existing.id, data: changes },
        confidence: m.confidence, evidence: m.evidence, status: "conflicto", editable: false,
      });
      return;
    }
    add({
      section: "sistema_salud", label: `HB-F14 · Medicamento: ${m.medication_name}`, current: null, proposed: summary,
      op: { type: "medication_insert", data: { medication_name: m.medication_name, concentration: m.concentration, dose: m.dose, route: m.route, schedule: m.schedule, prescription_date: m.prescription_date ?? ex.documentDate ?? undefined } },
      confidence: m.confidence, evidence: m.evidence, status: "nuevo", editable: false,
    });
  });

  const todayStr = todayIso(today);
  ex.appointments.forEach((a) => {
    if (a.appointment_date < todayStr) return; // solo controles por venir
    const dup = ctx.appointments.some((c) => c.appointment_date === a.appointment_date && normalizeText(c.specialty) === normalizeText(a.specialty));
    if (dup) return;
    add({
      section: "sistema_salud", label: `HB-F17 · Cita ${a.specialty ?? "médica"}`, current: null,
      proposed: [a.appointment_date, a.appointment_time, a.specialty, a.location].filter(Boolean).join(" · "),
      op: { type: "appointment_insert", data: { ...a, notes: [a.notes, `Agendada desde ${docLabel}`].filter(Boolean).join(" · ") } },
      confidence: a.confidence, evidence: a.evidence, status: "nuevo", editable: false,
    });
  });

  if (ex.hospitalization) {
    const h = ex.hospitalization;
    add({
      section: "sistema_salud", label: "Seguimiento post-hospitalización", current: null,
      proposed: [h.diagnosis && `Dx: ${h.diagnosis}`, h.hospital_admission_date && `Ingreso ${h.hospital_admission_date}`, h.hospital_discharge_date && `Egreso ${h.hospital_discharge_date}`, h.new_instructions && `Indicaciones: ${h.new_instructions}`].filter(Boolean).join(" · "),
      op: { type: "post_hospitalization_insert", data: { hospital_admission_date: h.hospital_admission_date, hospital_discharge_date: h.hospital_discharge_date, diagnosis: h.diagnosis, new_instructions: h.new_instructions, followup_date: h.followup_date } },
      confidence: h.confidence, evidence: h.evidence, status: "nuevo", editable: false,
    });
  }

  const folder: [EmergencyFolderField, boolean, string][] = [
    ["has_cedula", ex.documentKind === "cedula", "Copia de cédula"],
    ["has_clinical_summary", ex.documentKind === "historia_clinica" || ex.documentKind === "epicrisis", "Resumen clínico"],
    ["has_medications_list", ex.documentKind === "formula_medica" || ex.medications.length > 0, "Lista de medicamentos"],
    ["has_doctor_contact", !!(ex.resident.treating_doctor_name || ex.resident.treating_doctor_phone), "Contacto del médico"],
    ["has_family_contacts", !!(contact(1) && (ex.resident.emergency_contact_1_name || ex.resident.emergency_contact_2_name)), "Contactos familiares"],
  ];
  folder.forEach(([field, applies, label]) => {
    if (!applies || ctx.emergencyFolder?.[field]) return;
    add({
      section: "sistema_salud", label: `Carpeta de emergencia · ${label}`, current: "Pendiente", proposed: "Disponible",
      op: { type: "emergency_folder", field }, confidence: 0.85, status: "nuevo", editable: false,
    });
  });

  // Bienestar: atención psicosocial
  if (ex.wellbeing) {
    const w = ex.wellbeing;
    add({
      section: "bienestar", label: "HB-F10 · Registro psicosocial", current: null,
      proposed: [w.reason && `Motivo: ${w.reason}`, w.evolution && `Evolución: ${w.evolution}`, w.recommendations && `Recomendaciones: ${w.recommendations}`].filter(Boolean).join(" · "),
      op: { type: "psychosocial_insert", data: { record_date: ex.documentDate ?? todayStr, reason: w.reason, evolution: w.evolution, recommendations: w.recommendations } },
      confidence: w.confidence, evidence: w.evidence, status: "nuevo", editable: false,
    });
  }

  // Higiene y seguridad: quedan en las observaciones de la ficha, que todo el equipo ve
  if (ex.hygieneNeeds.length > 0) {
    const line = `Higiene: ${ex.hygieneNeeds.join("; ")}`;
    if (appendLine(ctx.resident.notes, line)) add({
      section: "higiene", label: "Necesidades de higiene y cuidado", current: null, proposed: line,
      op: { type: "resident", field: "notes", mode: "append" }, confidence: 0.75, status: "complemento", editable: true,
    });
  }
  const safetyNotes = [...(ex.safety.fallRisk ? ["Riesgo de caída identificado"] : []), ...ex.safety.notes];
  if (safetyNotes.length > 0) {
    const line = `Seguridad: ${safetyNotes.join("; ")}`;
    if (appendLine(ctx.resident.notes, line)) add({
      section: "seguridad", label: "Riesgos y precauciones", current: null, proposed: line,
      op: { type: "resident", field: "notes", mode: "append" }, confidence: 0.75, status: "complemento", editable: true,
    });
  }
  ex.safety.falls.forEach((f) => {
    if (!f.date) return;
    if (ctx.incidents.some((i) => i.incident_datetime.slice(0, 10) === f.date)) return;
    add({
      section: "seguridad", label: `HB-F20 · Caída del ${f.date}`, current: null, proposed: f.description,
      op: { type: "incident_insert", data: { incident_datetime: `${f.date}T12:00:00`, incident_type: "Caída desde su propia altura", description: `Antecedente registrado en ${docLabel}: ${f.description}` } },
      confidence: 0.7, evidence: f.evidence, status: "nuevo", editable: false,
    });
  });

  if (identityWarning) out.forEach((p) => { p.selected = false; });
  return { proposals: out, identityWarning };
}

/** Resumen de propuestas por sección, en el orden de SECTIONS. */
export function groupProposals(proposals: Proposal[]) {
  return (Object.keys(SECTIONS) as SectionKey[])
    .map((key) => ({ key, ...SECTIONS[key], items: proposals.filter((p) => p.section === key) }))
    .filter((g) => g.items.length > 0);
}
