import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const MedicationAdmin = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [medications, setMedications] = useState<any[]>([]);
  const [adminRecords, setAdminRecords] = useState<Record<string, {
    was_administered: boolean; check_patient: boolean; check_medication: boolean;
    check_dose: boolean; check_route: boolean; check_time: boolean;
    dose_given: string; route: string; skip_reason: string; notes: string;
  }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    supabase.from('medications').select('*').eq('resident_id', selectedResident).eq('is_active', true)
      .then(({ data }) => { if (data) setMedications(data); });
  }, [selectedResident]);

  const updateRecord = (medId: string, key: string, val: any) => {
    setAdminRecords(prev => ({
      ...prev,
      [medId]: { ...prev[medId] || { was_administered: true, check_patient: false, check_medication: false, check_dose: false, check_route: false, check_time: false, dose_given: '', route: '', skip_reason: '', notes: '' }, [key]: val }
    }));
  };

  const handleSave = async () => {
    if (!user || !selectedResident) return;
    setSaving(true);
    const inserts = Object.entries(adminRecords).map(([medId, r]) => ({
      medication_id: medId, resident_id: selectedResident, administered_by: user.id,
      ...r,
    }));
    const { error } = await supabase.from('medication_admin').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Administración registrada" });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F15: Administración de Medicamentos" subtitle="Verificación de los 5 correctos" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
        <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
          className="mt-1 w-full max-w-md px-4 py-3 rounded-xl border border-input bg-background text-sm">
          <option value="">-- Seleccionar --</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
      </div>

      {selectedResident && medications.length === 0 && (
        <p className="text-sm text-muted-foreground p-4">No hay medicamentos activos para este residente. Registre medicamentos en HB-F14.</p>
      )}

      {medications.map(med => {
        const rec = adminRecords[med.id] || { was_administered: true, check_patient: false, check_medication: false, check_dose: false, check_route: false, check_time: false, dose_given: '', route: '', skip_reason: '', notes: '' };
        return (
          <div key={med.id} className="bg-card border-2 border-border rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-foreground">{med.medication_name}</p>
                <p className="text-xs text-muted-foreground">{med.dose} — {med.route} — {med.schedule}</p>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={rec.was_administered}
                  onChange={e => updateRecord(med.id, 'was_administered', e.target.checked)}
                  className="w-5 h-5 accent-primary" />
                <span className="text-xs font-bold">{rec.was_administered ? '✅ Administrado' : '❌ No administrado'}</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-3 mb-3">
              {[
                { key: 'check_patient', label: 'Paciente ✓' },
                { key: 'check_medication', label: 'Medicamento ✓' },
                { key: 'check_dose', label: 'Dosis ✓' },
                { key: 'check_route', label: 'Vía ✓' },
                { key: 'check_time', label: 'Hora ✓' },
              ].map(c => (
                <label key={c.key} className={`flex items-center gap-1 text-xs px-3 py-2 rounded-lg border cursor-pointer ${(rec as any)[c.key] ? 'border-cat-nutritional/30 bg-cat-nutritional/10 text-cat-nutritional' : 'border-border'}`}>
                  <input type="checkbox" checked={(rec as any)[c.key] || false}
                    onChange={e => updateRecord(med.id, c.key, e.target.checked)} className="w-4 h-4 accent-primary" />
                  {c.label}
                </label>
              ))}
            </div>
            {!rec.was_administered && (
              <input type="text" placeholder="Motivo de no administración"
                value={rec.skip_reason}
                onChange={e => updateRecord(med.id, 'skip_reason', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            )}
          </div>
        );
      })}

      {medications.length > 0 && (
        <>
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <SignaturePad label="Enfermera responsable" />
          </div>
          <ActionButtons onFinish={handleSave} disabled={saving} />
        </>
      )}
    </div>
  );
};

export default MedicationAdmin;
