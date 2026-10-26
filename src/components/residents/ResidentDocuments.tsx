import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, FileUp, ScanLine, Sparkles, Eye, Trash2, Loader2, FileText, Image as ImageIcon, File as FileIcon, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Row } from "@/integrations/supabase/tables";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DocumentScanner from "./DocumentScanner";
import AIProposalReview from "./AIProposalReview";
import { ACCEPTED_FILES, documentFormat, readDocument, type ReadDocument } from "@/lib/document-reader";
import {
  buildProposals, localExtract, mergeExtractions, parseExtraction, RESIDENT_FIELDS,
  type DocumentExtraction, type ProposalContext, type ProposalSet,
} from "@/lib/resident-documents";
import { applyProposals } from "@/lib/apply-proposals";
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
const safeName = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);

/** Todo lo que ya está registrado del residente, para proponer solo lo nuevo. */
async function loadContext(resident: ResidentRecord, fileName: string): Promise<ProposalContext> {
  const today = new Date().toISOString().slice(0, 10);
  const [fresh, life, checklist, folder, meds, appts, assessments, incidents] = await Promise.all([
    supabase.from("residents").select("*").eq("id", resident.id).single(),
    supabase.from("life_histories").select("*").eq("resident_id", resident.id).order("updated_at", { ascending: false }).limit(1),
    supabase.from("admission_checklists").select("*").eq("resident_id", resident.id).order("updated_at", { ascending: false }).limit(1),
    supabase.from("emergency_folders").select("*").eq("resident_id", resident.id).maybeSingle(),
    supabase.from("medications").select("id, medication_name, dose, concentration, schedule, route").eq("resident_id", resident.id).eq("is_active", true),
    supabase.from("medical_appointments").select("appointment_date, specialty").eq("resident_id", resident.id).gte("appointment_date", today),
    supabase.from("geriatric_assessments").select("test_key, assessment_date").eq("resident_id", resident.id),
    supabase.from("incidents").select("incident_datetime").eq("resident_id", resident.id),
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
    fileName,
  };
}

const ResidentDocuments = ({ resident, canDelete, onChanged }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Attachment[]>([]);
  const [step, setStep] = useState<Step | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [review, setReview] = useState<Review | null>(null);

  const loadDocs = useCallback(async () => {
    const { data } = await supabase.from("document_attachments").select("*")
      .eq("entity_type", "resident").eq("entity_id", resident.id).order("created_at", { ascending: false });
    setDocs(data ?? []);
  }, [resident.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  /** Lee, analiza con IA (con respaldo local) y prepara las propuestas para revisión. */
  const analyze = async (file: File, filePath: string | undefined, preRead?: ReadDocument) => {
    setStep("leyendo");
    const read = preRead ?? await readDocument(file);
    const local = localExtract(read.text);

    setStep("analizando");
    let ai: DocumentExtraction | null = null;
    let aiError: string | null = null;
    try {
      const context = Object.fromEntries(Object.keys(RESIDENT_FIELDS).map((k) => [k, resident[k as keyof ResidentRecord] ?? null]));
      const { data, error } = await supabase.functions.invoke("ai-resident-document", {
        body: { residentName: resident.full_name, residentContext: context, fileName: file.name, text: read.text, images: read.images },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      ai = parseExtraction(data?.data);
    } catch (e) {
      aiError = errorMessage(e, "sin respuesta");
    }

    setStep("preparando");
    const extraction = mergeExtractions(ai, local);
    const ctx = await loadContext(resident, file.name);
    setReview({
      extraction, proposalSet: buildProposals(extraction, ctx), fileName: file.name, filePath, aiError,
      currentNotes: ctx.resident.notes ?? null,
    });
  };

  const handleFile = async (file: File, preRead?: ReadDocument) => {
    if (!user) return;
    const format = documentFormat(file);
    if (!format || format === "doc") {
      toast({ title: "Formato no soportado", description: format === "doc" ? "Guarde el .doc como .docx o PDF, o tómele una foto." : "Use PDF, Word (.docx) o imágenes.", variant: "destructive" });
      return;
    }
    try {
      setStep("subiendo");
      const path = `residents/${resident.id}/${Date.now()}_${safeName(file.name)}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("document_attachments").insert({
        entity_type: "resident", entity_id: resident.id, file_name: file.name, file_type: format, file_url: path, uploaded_by: user.id,
      });
      if (dbErr) throw dbErr;
      loadDocs();
      onChanged();
      await analyze(file, path, preRead);
    } catch (e) {
      toast({ title: "No se pudo procesar el documento", description: errorMessage(e), variant: "destructive" });
    }
    setStep(null);
  };

  const reanalyze = async (doc: Attachment) => {
    try {
      setStep("leyendo");
      const { data, error } = await supabase.storage.from("documents").download(doc.file_url);
      if (error || !data) throw error ?? new Error("No se encontró el archivo");
      await analyze(new File([data], doc.file_name, { type: data.type }), doc.file_url);
    } catch (e) {
      toast({ title: "No se pudo analizar", description: errorMessage(e), variant: "destructive" });
    }
    setStep(null);
  };

  const open = async (doc: Attachment) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_url, 600);
    if (error || !data) return toast({ title: "No se pudo abrir", description: errorMessage(error), variant: "destructive" });
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (doc: Attachment) => {
    if (!confirm(`¿Eliminar «${doc.file_name}»? Los datos ya aplicados a los formularios se conservan.`)) return;
    const { error: stErr } = await supabase.storage.from("documents").remove([doc.file_url]);
    const { error } = await supabase.from("document_attachments").delete().eq("id", doc.id);
    if (error || stErr) return toast({ title: "No se pudo eliminar", description: errorMessage(error ?? stErr), variant: "destructive" });
    toast({ title: "Documento eliminado" });
    loadDocs();
    onChanged();
  };

  const busy = step !== null;
  const actionBtn = "flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 text-xs font-bold min-h-[96px] transition-colors disabled:opacity-40";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
        <p className="text-sm font-black text-foreground flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Documentos inteligentes</p>
        <p className="text-xs text-muted-foreground mt-1">
          Suba la cédula, carné de EPS, historia clínica, epicrisis o fórmulas. La IA lee el documento y le propone completar
          la ficha, HB-F1, HB-F22, valoración, alimentación, bienestar, salud, higiene y seguridad. Usted revisa y confirma.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} className={`${actionBtn} border-primary/30 bg-primary/5 text-primary hover:border-primary`}>
          <Camera size={22} /> Tomar foto
        </button>
        <button type="button" disabled={busy} onClick={() => setScannerOpen(true)} className={`${actionBtn} border-primary/30 bg-primary/5 text-primary hover:border-primary`}>
          <ScanLine size={22} /> Escanear
        </button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`${actionBtn} border-primary/30 bg-primary/5 text-primary hover:border-primary`}>
          <FileUp size={22} /> PDF / Word / Imagen
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }} />
      <input ref={fileRef} type="file" accept={ACCEPTED_FILES} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }} />

      {busy && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2" role="status">
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

      <div>
        <h4 className="text-xs font-black text-foreground mb-2">Archivos del residente ({docs.length})</h4>
        {docs.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">Aún no hay documentos digitalizados.</p>}
        <div className="space-y-2">
          {docs.map((doc) => {
            const Icon = ICONS[doc.file_type as keyof typeof ICONS] ?? FileIcon;
            return (
              <div key={doc.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon size={17} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{doc.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <button type="button" onClick={() => reanalyze(doc)} disabled={busy} title="Analizar con IA"
                  className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center disabled:opacity-40"><Sparkles size={15} /></button>
                <button type="button" onClick={() => open(doc)} title="Ver"
                  className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center"><Eye size={15} /></button>
                {canDelete && (
                  <button type="button" onClick={() => remove(doc)} title="Eliminar"
                    className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"><Trash2 size={15} /></button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DocumentScanner open={scannerOpen} onOpenChange={setScannerOpen} onComplete={(file, read) => handleFile(file, read)} />

      <Dialog open={!!review} onOpenChange={(o) => { if (!o) setReview(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Revisar lo que encontró la IA</DialogTitle>
            <DialogDescription>Marque lo que desea guardar en cada formulario. Puede corregir los textos antes de aplicar.</DialogDescription>
          </DialogHeader>
          {review && user && (
            <AIProposalReview
              extraction={review.extraction}
              proposalSet={review.proposalSet}
              fileName={review.fileName}
              aiError={review.aiError}
              onClose={() => setReview(null)}
              onApply={async (proposals) => {
                const results = await applyProposals(supabase, {
                  residentId: resident.id, userId: user.id, proposals, currentNotes: review.currentNotes,
                  filePath: review.filePath, fileName: review.fileName,
                });
                if (results.some((r) => r.ok)) onChanged();
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
