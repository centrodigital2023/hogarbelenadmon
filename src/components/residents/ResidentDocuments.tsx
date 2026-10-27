import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, FileUp, ScanLine, Sparkles, Eye, Trash2, Loader2, FileText, Image as ImageIcon, File as FileIcon, Check,
  RefreshCw, CheckCircle2, AlertTriangle, CircleDashed, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/integrations/supabase/tables";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DocumentScanner from "./DocumentScanner";
import AIProposalReview from "./AIProposalReview";
import { ACCEPTED_FILES, documentFormat, readDocument, type ReadDocument } from "@/lib/document-reader";
import {
  buildProposals, DOCUMENT_KINDS, localExtract, mergeExtractions, parseExtraction, RESIDENT_FIELDS,
  type DocumentExtraction, type DocumentKind, type ProposalContext, type ProposalSet,
} from "@/lib/resident-documents";
import { analysisPath, documentFolder, fileHash, type AnalysisRecord, type FolderStatus } from "@/lib/document-folder";
import { applyProposals } from "@/lib/apply-proposals";
import { openPrivateDocument } from "@/lib/private-documents";
import { errorMessage } from "@/lib/errors";
import type { ResidentRecord } from "./types";

type Attachment = Row<"document_attachments">;

interface Props {
  resident: ResidentRecord;
  canDelete: boolean;
  /** Se llama cuando se guardan datos en la ficha o los formularios. */
  onChanged: () => void;
}

type Step = "subiendo" | "leyendo" | "analizando" | "preparando";
const STEPS: { key: Step; label: string }[] = [
  { key: "subiendo", label: "Guardando el archivo de forma segura" },
  { key: "leyendo", label: "Leyendo el documento" },
  { key: "analizando", label: "La IA está extrayendo la información" },
  { key: "preparando", label: "Comparando con los formularios del residente" },
];

interface Review {
  extraction: DocumentExtraction;
  proposalSet: ProposalSet;
  fileName: string;
  filePath?: string;
  aiError: string | null;
  currentNotes: string | null;
}

const ICONS = { imagen: ImageIcon, pdf: FileText, word: FileText, texto: FileText };
const FOLDER_STYLE: Record<FolderStatus, { cls: string; Icon: typeof CheckCircle2; label: string }> = {
  recibido: { cls: "border-cat-nutritional/30 bg-cat-nutritional/10 text-cat-nutritional", Icon: CheckCircle2, label: "Recibido" },
  vencido: { cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400", Icon: AlertTriangle, label: "Vencido" },
  falta: { cls: "border-dashed border-border bg-muted/40 text-muted-foreground", Icon: CircleDashed, label: "Falta" },
};

const safeName = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Todo lo que ya está registrado del residente, para proponer solo lo nuevo. */
async function loadContext(resident: ResidentRecord, fileName: string): Promise<ProposalContext> {
  const today = localIso(new Date());
  const [fresh, life, checklist, folder, meds, appts, assessments, incidents, vitals] = await Promise.all([
    supabase.from("residents").select("*").eq("id", resident.id).single(),
    supabase.from("life_histories").select("*").eq("resident_id", resident.id).order("updated_at", { ascending: false }).limit(1),
    supabase.from("admission_checklists").select("*").eq("resident_id", resident.id).order("updated_at", { ascending: false }).limit(1),
    supabase.from("emergency_folders").select("*").eq("resident_id", resident.id).maybeSingle(),
    supabase.from("medications").select("id, medication_name, dose, concentration, schedule, route").eq("resident_id", resident.id).eq("is_active", true),
    supabase.from("medical_appointments").select("appointment_date, specialty").eq("resident_id", resident.id).gte("appointment_date", today),
    supabase.from("geriatric_assessments").select("test_key, assessment_date").eq("resident_id", resident.id),
    supabase.from("incidents").select("incident_datetime").eq("resident_id", resident.id),
    supabase.from("vital_signs").select("record_date").eq("resident_id", resident.id),
  ]);
  return {
    resident: fresh.data ?? resident,
    lifeHistory: life.data?.[0] ?? null,
    checklist: checklist.data?.[0] ?? null,
    emergencyFolder: folder.data ?? null,
    medications: meds.data ?? [],
    appointments: appts.data ?? [],
    assessments: assessments.data ?? [],
    incidents: incidents.data ?? [],
    vitalDates: (vitals.data ?? []).map((v) => v.record_date.slice(0, 10)),
    fileName,
  };
}

/** Análisis guardados junto a cada archivo (sin volver a llamar a la IA). */
async function loadAnalyses(docs: Attachment[]): Promise<Record<string, AnalysisRecord>> {
  const entries = await Promise.all(docs.map(async (d) => {
    const { data } = await supabase.storage.from("documents").download(analysisPath(d.file_url));
    if (!data) return null;
    try {
      const record = JSON.parse(await data.text()) as AnalysisRecord;
      return record?.extraction ? [d.file_url, record] as const : null;
    } catch {
      return null;
    }
  }));
  return Object.fromEntries(entries.filter((e): e is readonly [string, AnalysisRecord] => !!e));
}

async function saveAnalysis(filePath: string, record: AnalysisRecord) {
  const body = new Blob([JSON.stringify(record)], { type: "application/json" });
  // Best effort: si no se puede guardar, el documento sigue funcionando (solo se re-analiza al abrirlo)
  await supabase.storage.from("documents").upload(analysisPath(filePath), body, { upsert: true, contentType: "application/json" });
}

const ResidentDocuments = ({ resident, canDelete, onChanged }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Attachment[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisRecord>>({});
  // Para detectar repetidos también dentro de un mismo lote
  const analysesRef = useRef(analyses);
  analysesRef.current = analyses;
  const [checklist, setChecklist] = useState<ProposalContext["checklist"]>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hint, setHint] = useState<DocumentKind | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);

  const loadDocs = useCallback(async () => {
    const [{ data }, { data: check }] = await Promise.all([
      supabase.from("document_attachments").select("*")
        .eq("entity_type", "resident").eq("entity_id", resident.id).order("created_at", { ascending: false }),
      supabase.from("admission_checklists").select("*").eq("resident_id", resident.id).order("updated_at", { ascending: false }).limit(1),
    ]);
    const list = data ?? [];
    setDocs(list);
    setChecklist(check?.[0] ?? null);
    setAnalyses(await loadAnalyses(list));
  }, [resident.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const folder = useMemo(() => documentFolder(Object.values(analyses), checklist), [analyses, checklist]);
  const folderDone = folder.filter((f) => f.status === "recibido").length;

  const enqueueReview = async (extraction: DocumentExtraction, fileName: string, filePath: string | undefined, aiError: string | null) => {
    setStep("preparando");
    const ctx = await loadContext(resident, fileName);
    const review: Review = {
      extraction, proposalSet: buildProposals(extraction, ctx), fileName, filePath, aiError,
      currentNotes: ctx.resident.notes ?? null,
    };
    setReviews((prev) => [...prev, review]);
    setReviewTotal((n) => n + 1);
  };

  /** Lee, analiza con IA (con respaldo local), guarda el análisis y prepara las propuestas. */
  const analyze = async (file: File, filePath: string | undefined, hash: string | null, kindHint: DocumentKind | null, preRead?: ReadDocument) => {
    setStep("leyendo");
    const read = preRead ?? await readDocument(file);
    const local = localExtract(read.text);

    setStep("analizando");
    let ai: DocumentExtraction | null = null;
    let aiError: string | null = null;
    try {
      const context = Object.fromEntries(Object.keys(RESIDENT_FIELDS).map((k) => [k, resident[k as keyof ResidentRecord] ?? null]));
      const { data, error } = await supabase.functions.invoke("ai-resident-document", {
        body: {
          residentName: resident.full_name, residentContext: context, fileName: file.name, text: read.text, images: read.images,
          documentHint: kindHint ? DOCUMENT_KINDS[kindHint] : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      ai = parseExtraction(data?.data);
    } catch (e) {
      aiError = errorMessage(e, "sin respuesta");
    }

    const extraction = mergeExtractions(ai, local);
    if (filePath) {
      const record: AnalysisRecord = { version: 1, hash, fileName: file.name, analyzedAt: new Date().toISOString(), aiError, extraction };
      if (!aiError) await saveAnalysis(filePath, record);
      analysesRef.current = { ...analysesRef.current, [filePath]: record };
      setAnalyses(analysesRef.current);
    }
    await enqueueReview(extraction, file.name, filePath, aiError);
  };

  const uploadAndAnalyze = async (file: File, kindHint: DocumentKind | null, preRead?: ReadDocument) => {
    if (!user) return;
    const format = documentFormat(file);
    if (!format || format === "doc") {
      toast({ title: `No se pudo leer «${file.name}»`, description: format === "doc" ? "Guarde el .doc como .docx o PDF, o tómele una foto." : "Use PDF, Word (.docx) o imágenes.", variant: "destructive" });
      return;
    }
    const hash = await fileHash(file);
    const duplicate = hash ? Object.entries(analysesRef.current).find(([, a]) => a.hash === hash) : undefined;
    if (duplicate) {
      const [path, record] = duplicate;
      const when = new Date(record.analyzedAt).toLocaleDateString("es-CO");
      if (confirm(`«${file.name}» ya se subió el ${when} como «${record.fileName}».\n\n¿Abrir el análisis guardado en lugar de subirlo otra vez?`)) {
        await enqueueReview(record.extraction, record.fileName, path, record.aiError);
      }
      return;
    }
    setStep("subiendo");
    const path = `residents/${resident.id}/${Date.now()}_${safeName(file.name)}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || undefined });
    if (upErr) throw upErr;
    const { error: dbErr } = await supabase.from("document_attachments").insert({
      entity_type: "resident", entity_id: resident.id, file_name: file.name, file_type: format, file_url: path, uploaded_by: user.id,
    });
    if (dbErr) throw dbErr;
    setDocs((prev) => [{ id: path, entity_type: "resident", entity_id: resident.id, file_name: file.name, file_type: format, file_url: path, uploaded_by: user.id, created_at: new Date().toISOString() }, ...prev]);
    await analyze(file, path, hash, kindHint, preRead);
  };

  /** Procesa uno o varios archivos en orden; cada uno queda en la fila de revisión. */
  const handleFiles = async (files: File[], preRead?: ReadDocument) => {
    const kindHint = hint;
    setHint(null);
    for (let i = 0; i < files.length; i++) {
      setProgress(files.length > 1 ? { current: i + 1, total: files.length, name: files[i].name } : null);
      try {
        await uploadAndAnalyze(files[i], kindHint, i === 0 ? preRead : undefined);
      } catch (e) {
        toast({ title: `No se pudo procesar «${files[i].name}»`, description: errorMessage(e), variant: "destructive" });
      }
    }
    setStep(null);
    setProgress(null);
    loadDocs();
    onChanged();
  };

  const openSaved = async (doc: Attachment) => {
    const saved = analyses[doc.file_url];
    try {
      if (saved && !saved.aiError) {
        await enqueueReview(saved.extraction, doc.file_name, doc.file_url, null);
      } else {
        await reanalyze(doc);
        return;
      }
    } catch (e) {
      toast({ title: "No se pudo abrir el análisis", description: errorMessage(e), variant: "destructive" });
    }
    setStep(null);
  };

  const reanalyze = async (doc: Attachment) => {
    try {
      setStep("leyendo");
      const { data, error } = await supabase.storage.from("documents").download(doc.file_url);
      if (error || !data) throw error ?? new Error("No se encontró el archivo");
      await analyze(new File([data], doc.file_name, { type: data.type }), doc.file_url, analyses[doc.file_url]?.hash ?? null, null);
    } catch (e) {
      toast({ title: "No se pudo analizar", description: errorMessage(e), variant: "destructive" });
    }
    setStep(null);
  };

  const open = async (doc: Attachment) => {
    try {
      await openPrivateDocument(doc.file_url);
    } catch (e) {
      toast({ title: "No se pudo abrir", description: errorMessage(e), variant: "destructive" });
    }
  };

  const remove = async (doc: Attachment) => {
    if (!confirm(`¿Eliminar «${doc.file_name}»? Los datos ya aplicados a los formularios se conservan.`)) return;
    const { error: stErr } = await supabase.storage.from("documents").remove([doc.file_url, analysisPath(doc.file_url)]);
    const { error } = await supabase.from("document_attachments").delete().eq("id", doc.id);
    if (error || stErr) return toast({ title: "No se pudo eliminar", description: errorMessage(error ?? stErr), variant: "destructive" });
    toast({ title: "Documento eliminado" });
    loadDocs();
    onChanged();
  };

  const closeReview = () => {
    setReviews((prev) => {
      const rest = prev.slice(1);
      if (rest.length === 0) setReviewTotal(0);
      return rest;
    });
  };

  const requestDocument = (kind: DocumentKind) => {
    setHint(kind);
    fileRef.current?.click();
  };

  const busy = step !== null;
  const review = reviews[0];
  const actionBtn = "flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 text-xs font-bold min-h-[96px] transition-colors disabled:opacity-40 border-primary/30 bg-primary/5 text-primary hover:border-primary";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
        <p className="text-sm font-black text-foreground flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Documentos inteligentes</p>
        <p className="text-xs text-muted-foreground mt-1">
          Suba la cédula, carné de EPS, historia clínica, epicrisis o fórmulas (puede elegir varios a la vez). La IA lee cada
          documento y le propone completar la ficha, HB-F1, HB-F22, valoración, signos vitales, alimentación, bienestar, salud,
          higiene y seguridad. Usted revisa y confirma.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} className={actionBtn}>
          <Camera size={22} /> Tomar foto
        </button>
        <button type="button" disabled={busy} onClick={() => setScannerOpen(true)} className={actionBtn}>
          <ScanLine size={22} /> Escanear
        </button>
        <button type="button" disabled={busy} onClick={() => { setHint(null); fileRef.current?.click(); }} className={actionBtn}>
          <FileUp size={22} /> PDF / Word / Imagen
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" data-testid="camera-input"
        onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) handleFiles(files); }} />
      <input ref={fileRef} type="file" accept={ACCEPTED_FILES} multiple className="hidden" data-testid="file-input"
        onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) handleFiles(files); else setHint(null); }} />

      {busy && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2" role="status">
          {progress && (
            <p className="text-xs font-black text-foreground truncate">Documento {progress.current} de {progress.total}: {progress.name}</p>
          )}
          {STEPS.map((s, i) => {
            const current = STEPS.findIndex((x) => x.key === step);
            return (
              <div key={s.key} className={`flex items-center gap-2 text-xs ${i <= current ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {i < current ? <Check size={14} className="text-cat-nutritional" /> : i === current ? <Loader2 size={14} className="animate-spin text-primary" /> : <span className="w-3.5 h-3.5 rounded-full border border-border" />}
                {s.label}
              </div>
            );
          })}
        </div>
      )}

      {/* Carpeta digital: qué hay, qué falta y qué está vencido */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-foreground flex items-center gap-1.5"><ClipboardList size={14} /> Carpeta del residente</h4>
          <span className="text-[11px] font-bold text-muted-foreground">{folderDone} de {folder.length} al día</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {folder.map((f) => {
            const style = FOLDER_STYLE[f.status];
            return (
              <button key={f.kind} type="button" disabled={busy} title={f.detail}
                onClick={() => (f.status === "recibido" ? undefined : requestDocument(f.kind))}
                className={`flex items-start gap-2 rounded-xl border p-2.5 text-left ${style.cls} ${f.status === "recibido" ? "cursor-default" : "hover:border-primary"}`}>
                <style.Icon size={15} className="shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-foreground truncate">{f.label}</span>
                  <span className="block text-[10px] font-semibold">{f.status === "recibido" ? (f.date ?? style.label) : f.status === "vencido" ? `Vencido · ${f.date}` : "Falta · subir"}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div>
        <h4 className="text-xs font-black text-foreground mb-2">Archivos del residente ({docs.length})</h4>
        {docs.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Aún no hay documentos digitalizados.</p>}
        <div className="space-y-2">
          {docs.map((doc) => {
            const Icon = ICONS[doc.file_type as keyof typeof ICONS] ?? FileIcon;
            const a = analyses[doc.file_url];
            return (
              <div key={doc.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon size={17} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground line-clamp-2">{a?.extraction.documentTitle ?? doc.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {a ? `${DOCUMENT_KINDS[a.extraction.documentKind]}${a.extraction.documentDate ? ` · ${a.extraction.documentDate}` : ""} · ` : ""}
                      Subido {new Date(doc.created_at).toLocaleDateString("es-CO", { dateStyle: "medium" })}
                    </p>
                  </div>
                </div>
                {a?.extraction.summary && <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{a.extraction.summary}</p>}
                {a?.applied && (
                  <p className="text-[10px] font-bold text-cat-nutritional mt-1">
                    ✓ {a.applied.saved} dato(s) aplicados el {new Date(a.applied.at).toLocaleDateString("es-CO")}
                  </p>
                )}
                <div className="flex flex-wrap justify-end gap-1.5 mt-2">
                  <button type="button" onClick={() => openSaved(doc)} disabled={busy} title={a ? "Ver lo que encontró la IA" : "Analizar con IA"}
                    className="h-8 px-2.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold flex items-center gap-1 disabled:opacity-40">
                    <Sparkles size={13} /> {a ? "Ver análisis" : "Analizar"}
                  </button>
                  {a && (
                    <button type="button" onClick={() => reanalyze(doc)} disabled={busy} title="Volver a analizar con IA" aria-label="Volver a analizar con IA"
                      className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center disabled:opacity-40"><RefreshCw size={13} /></button>
                  )}
                  <button type="button" onClick={() => open(doc)} title="Ver archivo" aria-label="Ver archivo"
                    className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center"><Eye size={14} /></button>
                  {canDelete && (
                    <button type="button" onClick={() => remove(doc)} title="Eliminar" aria-label="Eliminar"
                      className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DocumentScanner open={scannerOpen} onOpenChange={setScannerOpen} onComplete={(file, read) => handleFiles([file], read)} />

      <Dialog open={!!review} onOpenChange={(o) => { if (!o) closeReview(); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              Revisar lo que encontró la IA{reviewTotal > 1 ? ` · ${reviewTotal - reviews.length + 1} de ${reviewTotal}` : ""}
            </DialogTitle>
            <DialogDescription>Marque lo que desea guardar en cada formulario. Puede corregir los textos antes de aplicar.</DialogDescription>
          </DialogHeader>
          {review && user && (
            <AIProposalReview
              key={`${review.filePath}-${reviewTotal - reviews.length}`}
              extraction={review.extraction}
              proposalSet={review.proposalSet}
              fileName={review.fileName}
              aiError={review.aiError}
              onClose={closeReview}
              nextLabel={reviews.length > 1 ? "Siguiente documento" : undefined}
              onApply={async (proposals) => {
                const results = await applyProposals(supabase, {
                  residentId: resident.id, userId: user.id, proposals, currentNotes: review.currentNotes,
                  filePath: review.filePath, fileName: review.fileName,
                });
                const saved = results.filter((r) => r.ok).length;
                if (saved > 0) {
                  onChanged();
                  const path = review.filePath;
                  const record = path ? analyses[path] : undefined;
                  if (path && record) {
                    const updated: AnalysisRecord = { ...record, applied: { at: new Date().toISOString(), saved: (record.applied?.saved ?? 0) + saved, failed: results.length - saved } };
                    setAnalyses((prev) => ({ ...prev, [path]: updated }));
                    saveAnalysis(path, updated);
                  }
                  // El resto de documentos en fila se recalcula con lo recién guardado
                  if (reviews.length > 1) {
                    const refreshed = await Promise.all(reviews.slice(1).map(async (r) => {
                      const ctx = await loadContext(resident, r.fileName);
                      return { ...r, proposalSet: buildProposals(r.extraction, ctx), currentNotes: ctx.resident.notes ?? null };
                    }));
                    setReviews((prev) => [prev[0], ...refreshed]);
                  }
                  loadDocs();
                }
                return results;
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentDocuments;
