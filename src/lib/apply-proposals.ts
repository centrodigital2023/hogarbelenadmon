/**
 * Guarda en cada formulario las propuestas que el personal confirmó.
 * Cada grupo se guarda por separado: si el rol del usuario no puede escribir en un
 * formulario (por ejemplo HB-F22), los demás se guardan igual y se informa cuál falló.
 */
import type { supabase as SupabaseClient } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { errorMessage } from "@/lib/errors";
import { CHECKLIST_FIELDS, normalizeText, type ChecklistField, type EmergencyFolderField, type Proposal } from "@/lib/resident-documents";

type Client = typeof SupabaseClient;

export interface ApplyInput {
  residentId: string;
  userId: string;
  proposals: Proposal[];
  currentNotes: string | null;
  /** Ruta del archivo en el bucket "documents", para enlazarlo a HB-F1. */
  filePath?: string;
  fileName?: string;
  today?: Date;
}

export interface ApplyResult { id: string; ok: boolean; error?: string }

const FOLDER_DATES: Partial<Record<EmergencyFolderField, string>> = {
  has_cedula: "cedula_date",
  has_clinical_summary: "clinical_summary_date",
  has_medications_list: "medications_date",
};

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Agrega líneas a las observaciones sin repetir las que ya están. */
export function appendNotes(current: string | null, lines: string[]): string | null {
  let notes = (current ?? "").trim();
  for (const line of lines) {
    if (notes && normalizeText(notes).includes(normalizeText(line))) continue;
    notes = notes ? `${notes}\n${line}` : line;
  }
  return notes || null;
}

const NO_PERMISSION = "Su rol no tiene permiso para guardar en este formulario";

/** Mensaje entendible para errores de permisos (RLS) de la base de datos. */
export const friendlyError = (error: unknown) => {
  const message = errorMessage(error);
  return /row-level security|permission denied|42501/i.test(message) ? NO_PERMISSION : message;
};

/**
 * Con RLS, un UPDATE sin permiso no da error: simplemente no cambia filas.
 * Se pide la fila actualizada para confirmar que de verdad se guardó.
 */
const updated = ({ data, error }: { data: unknown[] | null; error: unknown }) =>
  error ?? (data && data.length > 0 ? null : { message: NO_PERMISSION });

export async function applyProposals(client: Client, input: ApplyInput): Promise<ApplyResult[]> {
  const { residentId, userId } = input;
  const today = isoDay(input.today ?? new Date());
  const selected = input.proposals.filter((p) => p.selected);
  const results: ApplyResult[] = [];
  const report = (items: Proposal[], error: unknown) =>
    items.forEach((p) => results.push(error ? { id: p.id, ok: false, error: friendlyError(error) } : { id: p.id, ok: true }));

  // 1. Ficha del residente (incluye alimentación, alergias, EPS, médico, notas de higiene/seguridad)
  const residentItems = selected.filter((p) => p.op.type === "resident");
  if (residentItems.length > 0) {
    const update: TablesUpdate<"residents"> = {};
    const noteLines: string[] = [];
    residentItems.forEach((p) => {
      if (p.op.type !== "resident") return;
      if (p.op.mode === "append") noteLines.push(p.proposed.trim());
      else (update as Record<string, string | null>)[p.op.field] = p.proposed.trim() || null;
    });
    if (noteLines.length > 0) update.notes = appendNotes(input.currentNotes, noteLines);
    report(residentItems, updated(await client.from("residents").update(update).eq("id", residentId).select("id")));
  }

  // 2. HB-F22 Historia de vida (un registro por residente)
  const lifeItems = selected.filter((p) => p.op.type === "life_history");
  if (lifeItems.length > 0) {
    const fields: TablesUpdate<"life_histories"> = Object.fromEntries(
      lifeItems.map((p) => [p.op.type === "life_history" ? p.op.field : "", p.proposed.trim()]),
    );
    const { data: existing, error: readError } = await client.from("life_histories").select("id").eq("resident_id", residentId)
      .order("updated_at", { ascending: false }).limit(1);
    let error: unknown = readError;
    if (!readError) {
      error = existing && existing.length > 0
        ? updated(await client.from("life_histories").update(fields).eq("id", existing[0].id).select("id"))
        : (await client.from("life_histories").insert({ resident_id: residentId, created_by: userId, ...fields })).error;
    }
    report(lifeItems, error);
  }

  // 3. HB-F1 Checklist de admisión (+ copia del archivo a la carpeta del checklist)
  const checkItems = selected.filter((p) => p.op.type === "checklist");
  if (checkItems.length > 0) {
    const keys = checkItems.map((p) => (p.op.type === "checklist" ? p.op.field : null)).filter((k): k is ChecklistField => !!k);
    const { data: rows, error: readError } = await client.from("admission_checklists").select("*").eq("resident_id", residentId)
      .order("updated_at", { ascending: false }).limit(1);
    let error: unknown = readError;
    if (!readError) {
      const existing = rows?.[0];
      const merged: Record<string, boolean> = Object.fromEntries((Object.keys(CHECKLIST_FIELDS) as ChecklistField[])
        .map((k) => [k, Boolean(existing?.[k]) || keys.includes(k)]));
      const folder_status = Object.values(merged).every(Boolean) ? "completa" : "pendiente";
      const changes = { ...Object.fromEntries(keys.map((k) => [k, true])), folder_status };
      error = existing
        ? updated(await client.from("admission_checklists").update(changes).eq("id", existing.id).select("id"))
        : (await client.from("admission_checklists").insert({ ...merged, folder_status, resident_id: residentId, created_by: userId })).error;
      if (!error && input.filePath && input.fileName) {
        const safeName = input.fileName.replace(/[^\w.-]+/g, "_");
        for (const key of keys.filter((k) => k !== "doc_contactos_emergencia")) {
          // Best effort: el checklist queda marcado aunque la copia del archivo falle
          await client.storage.from("documents").copy(input.filePath, `admission/${residentId}/${key}_${Date.now()}_${safeName}`);
        }
      }
    }
    report(checkItems, error);
  }

  // 4. Carpeta de emergencia
  const folderItems = selected.filter((p) => p.op.type === "emergency_folder");
  if (folderItems.length > 0) {
    const row: Record<string, string | boolean> = { resident_id: residentId, last_review_date: today, reviewed_by: userId };
    folderItems.forEach((p) => {
      if (p.op.type !== "emergency_folder") return;
      row[p.op.field] = true;
      const dateField = FOLDER_DATES[p.op.field];
      if (dateField) row[dateField] = today;
    });
    const { error } = await client.from("emergency_folders")
      .upsert(row as TablesInsert<"emergency_folders">, { onConflict: "resident_id" });
    report(folderItems, error);
  }

  // 5. Registros nuevos en cada formulario
  for (const p of selected) {
    const op = p.op;
    let error: unknown = null;
    switch (op.type) {
      case "medication_insert":
        ({ error } = await client.from("medications").insert({ ...op.data, resident_id: residentId, created_by: userId, is_active: true, notes: "Registrado desde documento con IA" }));
        break;
      case "medication_update":
        error = updated(await client.from("medications").update(op.data).eq("id", op.id).select("id"));
        break;
      case "appointment_insert":
        ({ error } = await client.from("medical_appointments").insert({ ...op.data, resident_id: residentId, created_by: userId, was_attended: false }));
        break;
      case "assessment_insert":
        ({ error } = await client.from("geriatric_assessments").insert({ ...op.data, answers: {}, resident_id: residentId, created_by: userId }));
        break;
      case "post_hospitalization_insert":
        ({ error } = await client.from("post_hospitalization").insert({ ...op.data, resident_id: residentId, created_by: userId }));
        break;
      case "psychosocial_insert":
        ({ error } = await client.from("psychosocial_records").insert({ ...op.data, record_type: "individual", resident_id: residentId, created_by: userId }));
        break;
      case "incident_insert":
        ({ error } = await client.from("incidents").insert({ ...op.data, resident_id: residentId, created_by: userId }));
        break;
      default:
        continue;
    }
    report([p], error);
  }

  const saved = results.filter((r) => r.ok).length;
  if (saved > 0) {
    await client.from("audit_log").insert({
      user_id: userId, action: "apply_document_ai", entity_type: "resident", entity_id: residentId,
      details: { file: input.fileName ?? null, saved, failed: results.length - saved, fields: selected.map((p) => p.label) },
    });
  }
  return results;
}
