import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SignaturePad from "@/components/SignaturePad";
import { CheckCircle2, AlertCircle, Upload, FileText, Trash2 } from "lucide-react";

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
  }, [selectedResident]);

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
      toast({ title: "Checklist guardado", description: `Carpeta: ${folderStatus.toUpperCase()}` });
      await supabase.from('audit_log').insert({
        user_id: user.id, action: existingId ? 'update_admission_checklist' : 'create_admission_checklist',
        entity_type: 'admission_checklist', entity_id: selectedResident,
        details: { folder_status: folderStatus, checked: checkedCount, total: DOCS.length },
      });
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F1: Checklist de Ingreso" subtitle="Verificación de documentos legales y clínicos" onBack={onBack} />
      <div ref={contentRef}>
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Residente</label>
          <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
            className="mt-2 w-full max-w-md px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar residente --</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </div>
        {selectedResident && (
          <>
            <div className={`flex items-center gap-3 p-4 rounded-2xl mb-6 ${isComplete ? 'bg-cat-nutritional/10 text-cat-nutritional' : 'bg-cat-fragility/10 text-cat-fragility'}`}>
              {isComplete ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <div>
                <p className="text-sm font-black uppercase">Carpeta {folderStatus}</p>
                <p className="text-xs">{checkedCount} de {DOCS.length} documentos verificados</p>
              </div>
              <div className="flex-1 ml-4">
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-cat-nutritional' : 'bg-cat-fragility'}`}
                    style={{ width: `${(checkedCount / DOCS.length) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black text-foreground mb-4">Documentos requeridos</h3>
              <div className="space-y-3">
                {DOCS.map((doc, idx) => (
                  <div key={doc.key} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${checks[doc.key] ? 'border-cat-nutritional/30 bg-cat-nutritional/5' : 'border-border'}`}>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" checked={checks[doc.key] || false}
                          onChange={e => setChecks(prev => ({ ...prev, [doc.key]: e.target.checked }))}
                          className="w-5 h-5 rounded border-2 border-input accent-primary" />
                        <span className={`text-sm font-medium ${checks[doc.key] ? 'text-foreground' : 'text-muted-foreground'}`}>{doc.label}</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {attachments[doc.key] ? (
                        <div className="flex items-center gap-1 text-xs text-primary font-medium">
                          <FileText size={14} />
                          <span className="max-w-[100px] truncate">{attachments[doc.key]!.name}</span>
                          <button onClick={() => handleFileChange(doc.key, null)} className="text-destructive"><Trash2 size={12} /></button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary cursor-pointer font-medium">
                          <Upload size={14} /><span>Adjuntar</span>
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => handleFileChange(doc.key, e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Observaciones</label>
              <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={4}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" placeholder="Notas adicionales..." />
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black text-foreground mb-4">Firmas electrónicas</h3>
              <div className="flex flex-wrap gap-8 justify-center">
                <SignaturePad label="Familiar Responsable" />
                <SignaturePad label="Coordinador" />
              </div>
            </div>
          </>
        )}
      </div>
      {selectedResident && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ExportButtons contentRef={contentRef} title={`HB-F1 Checklist ${residentName}`} fileName={`checklist_ingreso_${residentName}`} textContent={`Checklist de Ingreso - ${residentName}\nEstado: ${folderStatus}\n${checkedCount}/${DOCS.length} documentos`} />
          <ShareButtons title={`HB-F1 Checklist ${residentName}`} text={`Checklist de Ingreso - ${residentName}\nEstado: ${folderStatus}\n${checkedCount}/${DOCS.length} documentos`} />
        </div>
      )}
      <ActionButtons onFinish={handleSave} disabled={saving || !selectedResident} />
    </div>
  );
};

export default AdmissionChecklist;
