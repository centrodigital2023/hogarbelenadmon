import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";
import FormHistory from "@/components/FormHistory";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const TYPES = ['Caída desde su propia altura', 'Caída desde mobiliario', 'Casi caída', 'Error de medicación', 'Agresión', 'Otro'];
const CONSEQUENCES = ['Ninguna', 'Raspadura / Laceración', 'Hematoma / Inflamación', 'Posible fractura o pérdida de conciencia'];

const IncidentReport = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [form, setForm] = useState({
    resident_id: '', incident_type: '', description: '', consequences: '',
    cause_analysis: '', first_aid: false, family_notified: false,
    family_contact_name: '', transferred_to_er: false, er_facility: '',
  });
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente'])
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const handleSave = async () => {
    if (!user || !form.resident_id) return;
    setSaving(true);
    const { error } = await supabase.from('incidents').insert({
      ...form, created_by: user.id,
      corrective_actions: [
        form.first_aid && 'Se brindaron primeros auxilios',
        form.family_notified && `Se informó a la familia (${form.family_contact_name})`,
        form.transferred_to_er && `Se trasladó a urgencias (${form.er_facility})`,
      ].filter(Boolean),
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Incidente registrado ✅" });
    setSaving(false);
  };

  const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const residentName = residents.find(r => r.id === form.resident_id)?.full_name || '';

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F20: Incidentes y Caídas" subtitle="Documentar y analizar incidentes" onBack={onBack} />

      <div ref={contentRef}>
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Residente</label>
            <select value={form.resident_id} onChange={e => update('resident_id', e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all">
              <option value="">-- Seleccionar --</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo de evento</label>
            <select value={form.incident_type} onChange={e => update('incident_type', e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all">
              <option value="">-- Seleccionar --</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 space-y-4 shadow-sm">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descripción del suceso</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Consecuencias visibles</label>
            <select value={form.consequences} onChange={e => update('consequences', e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20">
              <option value="">-- Seleccionar --</option>
              {CONSEQUENCES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Análisis de causa</label>
            <textarea value={form.cause_analysis} onChange={e => update('cause_analysis', e.target.value)} rows={2}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ej: piso húmedo, falta de barandas..." />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
          <h3 className="text-sm font-black text-foreground mb-3">Acciones correctivas</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-border cursor-pointer hover:border-primary/20 transition-all">
              <input type="checkbox" checked={form.first_aid} onChange={e => update('first_aid', e.target.checked)} className="w-5 h-5 accent-primary" />
              <span className="text-sm font-medium">Se brindaron primeros auxilios</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-border cursor-pointer hover:border-primary/20 transition-all">
              <input type="checkbox" checked={form.family_notified} onChange={e => update('family_notified', e.target.checked)} className="w-5 h-5 accent-primary" />
              <span className="text-sm font-medium">Se informó a la familia</span>
            </label>
            {form.family_notified && (
              <input type="text" placeholder="Nombre del familiar contactado" value={form.family_contact_name}
                onChange={e => update('family_contact_name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm ml-8 focus:ring-2 focus:ring-primary/20" />
            )}
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-border cursor-pointer hover:border-primary/20 transition-all">
              <input type="checkbox" checked={form.transferred_to_er} onChange={e => update('transferred_to_er', e.target.checked)} className="w-5 h-5 accent-primary" />
              <span className="text-sm font-medium">Se trasladó a urgencias</span>
            </label>
            {form.transferred_to_er && (
              <input type="text" placeholder="Nombre de la IPS" value={form.er_facility}
                onChange={e => update('er_facility', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm ml-8 focus:ring-2 focus:ring-primary/20" />
            )}
          </div>
        </div>

        {/* Firma Digital */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
          <h3 className="text-sm font-black text-foreground mb-4">Firma Digital</h3>
          <div className="flex flex-wrap gap-6 justify-center">
            <SignaturePad label="Responsable del Turno" value={signature || undefined} onChange={setSignature} />
            <SignaturePad label="Coordinador/Supervisor" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <ExportButtons contentRef={contentRef} title={`HB-F20 Incidente ${residentName}`}
          fileName={`incidente_${residentName}`}
          textContent={`Incidente: ${form.incident_type} - ${residentName}\n${form.description}`}
          signatureDataUrl={signature} />
        <ShareButtons title={`HB-F20 Incidente ${residentName}`}
          text={`Incidente: ${form.incident_type} - ${residentName}\n${form.description}`} />
      </div>

      {/* History */}
      <FormHistory tableName="incidents" title="Historial Incidentes" fileName="hist_incidentes"
        selectClause="*, residents(full_name)"
        columns={[
          { key: 'incident_datetime', label: 'Fecha', render: (v: string) => v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '-' },
          { key: 'residents', label: 'Residente', render: (v: any) => v?.full_name || '-' },
          { key: 'incident_type', label: 'Tipo' },
          { key: 'consequences', label: 'Consecuencias' },
          { key: 'description', label: 'Descripción', render: (v: string) => v?.slice(0, 50) || '-' },
        ]}
        dateColumn="incident_datetime"
        editableFields={[
          { key: 'description', label: 'Descripción', type: 'text' },
          { key: 'cause_analysis', label: 'Análisis', type: 'text' },
        ]}
      />

      <SmartReportSection module="seguridad" formTitle="HB-F20: Incidentes y Caídas"
        residentId={form.resident_id} residentName={residentName} formData={form} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} disabled={saving || !form.resident_id || !form.incident_type} />
    </div>
  );
};

export default IncidentReport;
