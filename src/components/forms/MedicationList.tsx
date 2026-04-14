import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import { Upload } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; eps: string | null; allergies: string | null; }

const MedicationList = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [medications, setMedications] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    medication_name: '', concentration: '', dose: '', route: 'Oral', schedule: '',
    prescription_date: '', expiry_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name, eps, allergies').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    supabase.from('medications').select('*').eq('resident_id', selectedResident).order('medication_name')
      .then(({ data }) => { if (data) setMedications(data); });
  }, [selectedResident]);

  const handleAdd = async () => {
    if (!user || !selectedResident) return;
    setSaving(true);
    const { error } = await supabase.from('medications').insert({ ...form, resident_id: selectedResident, created_by: user.id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Medicamento agregado" });
      setShowAdd(false);
      setForm({ medication_name: '', concentration: '', dose: '', route: 'Oral', schedule: '', prescription_date: '', expiry_date: '', notes: '' });
      const { data } = await supabase.from('medications').select('*').eq('resident_id', selectedResident).order('medication_name');
      if (data) setMedications(data);
    }
    setSaving(false);
  };

  const resident = residents.find(r => r.id === selectedResident);
  const residentName = resident?.full_name || '';

  const getTextContent = () => {
    const lines = [`HB-F14: Medicamentos - ${residentName}\n`];
    medications.forEach(m => lines.push(`${m.medication_name} ${m.concentration || ''} - ${m.dose} - ${m.route} - ${m.schedule} - ${m.is_active ? 'Activo' : 'Inactivo'}`));
    return lines.join('\n');
  };

  const getMedData = () => medications.map(m => ({
    Medicamento: m.medication_name, Concentración: m.concentration, Dosis: m.dose,
    Vía: m.route, Horario: m.schedule, Estado: m.is_active ? 'Activo' : 'Inactivo',
  }));

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F14: Medicamentos" subtitle="Gestión de medicación por residente" onBack={onBack} />
      <div ref={contentRef}>
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
          <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
            className="mt-1 w-full max-w-md px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar --</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
          {resident && (
            <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
              <span><strong>EPS:</strong> {resident.eps || 'N/A'}</span>
              <span><strong>Alergias:</strong> {resident.allergies || 'Ninguna'}</span>
            </div>
          )}
        </div>

        {selectedResident && (
          <>
            <button onClick={() => setShowAdd(!showAdd)}
              className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase mb-4 min-h-[48px]">
              + Agregar Medicamento
            </button>

            {showAdd && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'medication_name', label: 'Nombre del medicamento', required: true },
                  { key: 'concentration', label: 'Concentración' },
                  { key: 'dose', label: 'Dosis' },
                  { key: 'schedule', label: 'Horarios' },
                  { key: 'prescription_date', label: 'Fecha fórmula', type: 'date' },
                  { key: 'expiry_date', label: 'Fecha vencimiento', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.label}</label>
                    <input type={f.type || 'text'} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Vía</label>
                  <select value={form.route} onChange={e => setForm(p => ({ ...p, route: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {['Oral', 'Gotas', 'Tópica', 'Subcutánea', 'Intramuscular', 'Inhalada'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button onClick={handleAdd} disabled={saving || !form.medication_name}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase min-h-[48px] disabled:opacity-50">
                    Guardar
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {medications.map(m => (
                <div key={m.id} className={`bg-card border-2 rounded-2xl p-5 ${m.is_active ? 'border-border' : 'border-muted opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-foreground">{m.medication_name}</p>
                      <p className="text-xs text-muted-foreground">{m.concentration} — {m.dose} — {m.route}</p>
                      <p className="text-xs text-muted-foreground">Horario: {m.schedule}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${m.is_active ? 'bg-cat-nutritional/10 text-cat-nutritional' : 'bg-muted text-muted-foreground'}`}>
                      {m.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              ))}
              {medications.length === 0 && <p className="text-sm text-muted-foreground">Sin medicamentos registrados.</p>}
            </div>
          </>
        )}
      </div>
      {selectedResident && medications.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ExportButtons contentRef={contentRef} title={`HB-F14 Medicamentos ${residentName}`} fileName={`medicamentos_${residentName}`} data={getMedData()} textContent={getTextContent()} />
          <ShareButtons title={`HB-F14 Medicamentos ${residentName}`} text={getTextContent()} />
        </div>
      )}
    </div>
  );
};

export default MedicationList;
