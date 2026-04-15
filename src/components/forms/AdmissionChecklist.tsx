import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SignaturePad from "@/components/SignaturePad";
import FormHistory from "@/components/FormHistory";
import { CheckCircle2, AlertCircle, Upload, FileText, Trash2, Download, Eye, Loader2 } from "lucide-react";

interface Props { onBack: () => void; }

const DOCS = [
  { key: 'doc_cedula', label: 'Fotocopia de cédula (ampliada)' },
  { key: 'doc_eps', label: 'Fotocopia del carné de EPS o certificado de afiliación' },
  { key: 'doc_contrato', label: 'Copia del contrato de prestación de servicios (firmado)' },
  { key: 'doc_reglamento', label: 'Acta de aceptación del Reglamento Interno (firmada)' },
  { key: 'doc_contactos_emergencia', label: 'Datos de contacto de 2 familiares (Emergencias)' },
  { key: 'doc_inventario_f3', label: 'HB-F3 Inventario de pertenencias (Firmado)' },
  { key: 'doc_historia_clinica', label: 'Resumen de Historia Clínica reciente (mín. 6 meses)' },
  { key: 'doc_formulas_medicas', label: 'Fórmulas médicas vigentes (con dosis y horarios)' },
  { key: 'doc_laboratorios', label: 'Resultados de laboratorios o exámenes recientes' },
  { key: 'doc_valoracion_f2', label: 'HB-F2 Valoración inicial (Barthel, Lawton, Fried)' },
  { key: 'doc_vacunacion', label: 'Carné de vacunación (COVID-19, Influenza)' },
];

interface Resident { id: string; full_name: string; }
interface StoredFile { name: string; id: string; created_at: string; metadata: any; }

const AdmissionChecklist = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState("");
  const [attachments, setAttachments] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  // Stored documents from cloud storage
  const [storedDocs, setStoredDocs] = useState<Record<string, StoredFile[]>>({});
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').eq('status', 'prueba')
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    supabase.from('admission_checklists').select('*').eq('resident_id', selectedResident).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          const newChecks: Record<string, boolean> = {};
          DOCS.forEach(d => { newChecks[d.key] = (data as any)[d.key] ?? false; });
          setChecks(newChecks);
          setObservations(data.observations || '');
        } else { setExistingId(null); setChecks({}); setObservations(''); }
      });
    loadStoredDocs(selectedResident);
  }, [selectedResident]);

  const loadStoredDocs = async (residentId: string) => {
    setLoadingDocs(true);
    const grouped: Record<string, StoredFile[]> = {};
    for (const doc of DOCS) {
      const { data } = await supabase.storage.from('documents')
        .list(`admission/${residentId}`, { search: doc.key });
      if (data && data.length > 0) {
        grouped[doc.key] = data.map(f => ({
          name: f.name, id: f.id || f.name,
          created_at: f.created_at || '', metadata: f.metadata,
        }));
      }
    }
    setStoredDocs(grouped);
    setLoadingDocs(false);
  };

  const downloadFile = async (docKey: string, fileName: string) => {
    const path = `admission/${selectedResident}/${fileName}`;
    const { data } = await supabase.storage.from('documents').download(path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } else {
      toast({ title: "Error descargando archivo", variant: "destructive" });
    }
  };

  const previewFile = async (fileName: string) => {
    const path = `admission/${selectedResident}/${fileName}`;
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    }
  };

  const checkedCount = Object.values(checks).filter(Boolean).length;
  const folderStatus = checkedCount === DOCS.length ? 'completa' : 'pendiente';
  const isComplete = checkedCount === DOCS.length;
  const residentName = residents.find(r => r.id === selectedResident)?.full_name || '';

  const handleFileChange = (key: string, file: File | null) => setAttachments(prev => ({ ...prev, [key]: file }));

  const handleSave = async () => {
    if (!selectedResident || !user) return;
    setSaving(true);
    const payload = {
      resident_id: selectedResident, created_by: user.id, observations, folder_status: folderStatus,
      ...Object.fromEntries(DOCS.map(d => [d.key, checks[d.key] || false])),
    };
    let error;
    if (existingId) { ({ error } = await supabase.from('admission_checklists').update(payload).eq('id', existingId)); }
    else { ({ error } = await supabase.from('admission_checklists').insert(payload)); }
    for (const [key, file] of Object.entries(attachments)) {
      if (file) {
        const path = `admission/${selectedResident}/${key}_${Date.now()}_${file.name}`;
        await supabase.storage.from('documents').upload(path, file);
      }
    }
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Checklist guardado ✅", description: `Carpeta: ${folderStatus.toUpperCase()}` });
      await supabase.from('audit_log').insert({
        user_id: user.id, action: existingId ? 'update_admission_checklist' : 'create_admission_checklist',
        entity_type: 'admission_checklist', entity_id: selectedResident,
        details: { folder_status: folderStatus, checked: checkedCount, total: DOCS.length },
      });
      setAttachments({});
      loadStoredDocs(selectedResident);
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F1: Checklist de Ingreso" subtitle="Verificación de documentos legales y clínicos" onBack={onBack} />
      <div ref={contentRef}>
        {/* Resident selector */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Residente</label>
          <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
            className="mt-2 w-full max-w-md px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all">
            <option value="">-- Seleccionar residente --</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </div>

        {selectedResident && (
          <>
            {/* Progress banner */}
            <div className={`flex items-center gap-3 p-4 sm:p-5 rounded-2xl mb-6 border-2 transition-all ${isComplete ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
              {isComplete ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-wide">Carpeta {folderStatus}</p>
                <p className="text-xs opacity-80">{checkedCount} de {DOCS.length} documentos verificados</p>
              </div>
              <div className="w-24 sm:w-32">
                <div className="h-2.5 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${(checkedCount / DOCS.length) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Documents list */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
              <h3 className="text-sm font-black text-foreground mb-5 flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                Documentos requeridos
              </h3>
              <div className="space-y-3">
                {DOCS.map((doc, idx) => (
                  <div key={doc.key} className={`p-4 rounded-xl border-2 transition-all ${checks[doc.key] ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border hover:border-primary/20'}`}>
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={checks[doc.key] || false}
                            onChange={e => setChecks(prev => ({ ...prev, [doc.key]: e.target.checked }))}
                            className="w-5 h-5 rounded border-2 border-input accent-primary shrink-0" />
                          <span className={`text-sm font-medium leading-tight ${checks[doc.key] ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {doc.label}
                          </span>
                        </label>

                        {/* Stored files for this doc */}
                        {storedDocs[doc.key] && storedDocs[doc.key].length > 0 && (
                          <div className="mt-3 ml-8 space-y-1.5">
                            {storedDocs[doc.key].map(file => (
                              <div key={file.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                                <FileText size={12} className="text-primary shrink-0" />
                                <span className="truncate flex-1 text-foreground font-medium">{file.name}</span>
                                <button onClick={() => downloadFile(doc.key, file.name)}
                                  className="text-primary hover:text-primary/80 transition-colors p-1" title="Descargar">
                                  <Download size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload new */}
                        <div className="mt-2 ml-8">
                          {attachments[doc.key] ? (
                            <div className="flex items-center gap-2 text-xs text-primary font-medium">
                              <FileText size={13} />
                              <span className="max-w-[150px] truncate">{attachments[doc.key]!.name}</span>
                              <button onClick={() => handleFileChange(doc.key, null)} className="text-destructive hover:text-destructive/80 p-1">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer font-medium transition-colors">
                              <Upload size={13} /><span>Adjuntar archivo</span>
                              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                                onChange={e => handleFileChange(doc.key, e.target.files?.[0] || null)} />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {loadingDocs && (
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Cargando documentos guardados...
                </div>
              )}
            </div>

            {/* Observations */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Observaciones</label>
              <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={4}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Notas adicionales..." />
            </div>

            {/* Signatures */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
              <h3 className="text-sm font-black text-foreground mb-4">Firmas electrónicas</h3>
              <div className="flex flex-wrap gap-6 justify-center">
                <SignaturePad label="Familiar Responsable" />
                <SignaturePad label="Coordinador" />
              </div>
            </div>
          </>
        )}
      </div>
      {selectedResident && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <ExportButtons contentRef={contentRef} title={`HB-F1 Checklist ${residentName}`}
              fileName={`checklist_ingreso_${residentName}`}
              textContent={`Checklist de Ingreso - ${residentName}\nEstado: ${folderStatus}\n${checkedCount}/${DOCS.length} documentos`} />
            <ShareButtons title={`HB-F1 Checklist ${residentName}`}
              text={`Checklist de Ingreso - ${residentName}\nEstado: ${folderStatus}\n${checkedCount}/${DOCS.length} documentos`} />
          </div>
          <FormHistory
            tableName="admission_checklists"
            title="Historial Checklists"
            fileName="historial_checklist_ingreso"
            columns={[
              { key: 'created_at', label: 'Fecha', render: (v: string) => v ? new Date(v).toLocaleDateString('es-CO') : '-' },
              { key: 'folder_status', label: 'Estado' },
              { key: 'observations', label: 'Observaciones' },
            ]}
            editableFields={[
              { key: 'observations', label: 'Observaciones', type: 'text' },
              { key: 'folder_status', label: 'Estado', type: 'select', options: ['pendiente', 'completa'] },
            ]}
          />
        </>
      )}
      <ActionButtons onFinish={handleSave} disabled={saving || !selectedResident} />
    </div>
  );
};

export default AdmissionChecklist;
