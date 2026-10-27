/**
 * Carpeta digital del residente: qué documentos ya están, cuáles faltan y cuáles
 * están vencidos, a partir del checklist HB-F1 y de los análisis guardados de cada archivo.
 */
import { CHECKLIST_FIELDS, DOCUMENT_KINDS, KIND_TO_CHECKLIST, type ChecklistField, type DocumentExtraction, type DocumentKind } from "@/lib/resident-documents";
import { parseDateOnly } from "@/lib/resident-age";

/** Lo que se guarda junto a cada archivo (`<archivo>.ia.json`) para no volver a gastar IA. */
export interface AnalysisRecord {
  version: 1;
  /** SHA-256 del archivo, para detectar documentos repetidos. */
  hash: string | null;
  fileName: string;
  analyzedAt: string;
  aiError: string | null;
  extraction: DocumentExtraction;
  applied?: { at: string; saved: number; failed: number };
}

export const analysisPath = (filePath: string) => `${filePath}.ia.json`;
export const isAnalysisPath = (path: string) => path.endsWith(".ia.json");

export type FolderStatus = "recibido" | "vencido" | "falta";

export interface FolderItem {
  kind: DocumentKind;
  label: string;
  status: FolderStatus;
  date: string | null;
  detail: string;
}

/**
 * Documentos que debe tener la carpeta y cuánto tiempo siguen vigentes (días).
 * HB-F1 pide historia clínica de máximo 6 meses y fórmulas vigentes.
 */
export const FOLDER_DOCS: { kind: DocumentKind; validDays?: number }[] = [
  { kind: "cedula" },
  { kind: "carne_eps" },
  { kind: "historia_clinica", validDays: 180 },
  { kind: "formula_medica", validDays: 90 },
  { kind: "laboratorios", validDays: 365 },
  { kind: "vacunacion" },
  { kind: "contrato" },
  { kind: "reglamento" },
  { kind: "valoracion_geriatrica", validDays: 180 },
];

const SHORT_LABELS: Partial<Record<DocumentKind, string>> = {
  cedula: "Cédula", carne_eps: "EPS", historia_clinica: "Historia clínica", formula_medica: "Fórmula médica",
  laboratorios: "Laboratorios", vacunacion: "Vacunas", contrato: "Contrato", reglamento: "Reglamento", valoracion_geriatrica: "Valoración",
};

const DAY_MS = 86_400_000;

export function documentFolder(
  analyses: Pick<AnalysisRecord, "extraction" | "analyzedAt">[],
  checklist: Partial<Record<ChecklistField, boolean | null>> | null,
  now = new Date(),
): FolderItem[] {
  return FOLDER_DOCS.map(({ kind, validDays }) => {
    // La epicrisis cuenta como resumen de historia clínica; resultados o vacunas dentro de otro documento también cuentan
    const matches = analyses
      .filter(({ extraction: e }) => e.documentKind === kind
        || (kind === "historia_clinica" && e.documentKind === "epicrisis")
        || (kind === "laboratorios" && e.labs.length > 0)
        || (kind === "vacunacion" && e.vaccines.length > 0))
      .map((a) => a.extraction.documentDate ?? a.analyzedAt.slice(0, 10))
      .sort();
    const latest = matches.pop() ?? null;
    const field = KIND_TO_CHECKLIST[kind];
    const label = SHORT_LABELS[kind] ?? DOCUMENT_KINDS[kind];

    if (!latest) {
      const checked = field ? !!checklist?.[field] : false;
      return checked
        ? { kind, label, status: "recibido", date: null, detail: `Marcado en HB-F1 (${CHECKLIST_FIELDS[field!]}), sin archivo digital` }
        : { kind, label, status: "falta", date: null, detail: "Tome una foto o súbalo para completarlo" };
    }
    const date = parseDateOnly(latest);
    const ageDays = date ? Math.floor((now.getTime() - date.getTime()) / DAY_MS) : 0;
    if (validDays && ageDays > validDays) {
      return { kind, label, status: "vencido", date: latest, detail: `Del ${latest}: tiene más de ${Math.round(validDays / 30)} meses, solicite uno actualizado` };
    }
    return { kind, label, status: "recibido", date: latest, detail: `Documento del ${latest}` };
  });
}

/** SHA-256 en hexadecimal de un archivo (para reconocer el mismo documento subido dos veces). */
export async function fileHash(file: Blob): Promise<string | null> {
  try {
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null; // sin crypto.subtle (http sin TLS): simplemente no se detectan repetidos
  }
}
