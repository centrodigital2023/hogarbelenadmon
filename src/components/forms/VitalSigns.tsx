import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { AlertTriangle } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const VitalSigns = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<Record<string, {
    blood_pressure: string; spo2: number; temperature: number; glucose: number; heart_rate: number; weight: number; notes: string;
  }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const updateEntry = (rid: string, field: string, val: any) => {
    setEntries(prev => ({
      ...prev,
      [rid]: { ...prev[rid] || { blood_pressure: '', spo2: 0, temperature: 0, glucose: 0, heart_rate: 0, weight: 0, notes: '' }, [field]: val }
    }));
  };

  const isAbnormal = (field: string, val: number) => {
    if (field === 'spo2' && val > 0 && val < 90) return true;
    if (field === 'temperature' && val > 0 && (val < 35 || val > 38)) return true;
    if (field === 'glucose' && val > 0 && (val < 70 || val > 180)) return true;
    if (field === 'heart_rate' && val > 0 && (val < 50 || val > 120)) return true;
    return false;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const inserts = Object.entries(entries).map(([rid, e]) => ({
      resident_id: rid, created_by: user.id, record_date: recordDate,
      blood_pressure: e.blood_pressure, spo2: e.spo2 || null, temperature: e.temperature || null,
      glucose: e.glucose || null, heart_rate: e.heart_rate || null, weight: e.weight || null, notes: e.notes,
    }));
    const { error } = await supabase.from('vital_signs').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Signos vitales registrados" });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F16: Signos Vitales" subtitle="Registro de signos vitales por residente" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
        <input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)}
          className="mt-1 max-w-xs px-4 py-3 rounded-xl border border-input bg-background text-sm" />
      </div>
      <div className="space-y-4 mb-6">
        {residents.map(r => {
          const e = entries[r.id] || { blood_pressure: '', spo2: 0, temperature: 0, glucose: 0, heart_rate: 0, weight: 0, notes: '' };
          const hasAlert = isAbnormal('spo2', e.spo2) || isAbnormal('temperature', e.temperature) || isAbnormal('glucose', e.glucose) || isAbnormal('heart_rate', e.heart_rate);
          return (
            <div key={r.id} className={`bg-card border-2 rounded-2xl p-5 ${hasAlert ? 'border-destructive/40' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-foreground">{r.full_name}</p>
                {hasAlert && <span className="flex items-center gap-1 text-xs font-bold text-destructive"><AlertTriangle size={14} /> Alerta</span>}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {[
                  { key: 'blood_pressure', label: 'T.A.', type: 'text', placeholder: '120/80' },
                  { key: 'spo2', label: 'SpO2', type: 'number', placeholder: '%' },
                  { key: 'temperature', label: 'Temp °C', type: 'number', placeholder: '36.5' },
                  { key: 'glucose', label: 'Glucemia', type: 'number', placeholder: 'mg/dl' },
                  { key: 'heart_rate', label: 'FC', type: 'number', placeholder: 'bpm' },
                  { key: 'weight', label: 'Peso kg', type: 'number', placeholder: 'kg' },
                  { key: 'notes', label: 'Notas', type: 'text', placeholder: '...' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">{f.label}</label>
                    <input type={f.type} value={(e as any)[f.key] || ''}
                      onChange={ev => updateEntry(r.id, f.key, f.type === 'number' ? parseFloat(ev.target.value) || 0 : ev.target.value)}
                      placeholder={f.placeholder}
                      className={`mt-1 w-full px-2 py-2 rounded-lg border text-sm text-center ${
                        f.type === 'number' && isAbnormal(f.key, (e as any)[f.key]) ? 'border-destructive bg-destructive/5' : 'border-input bg-background'
                      }`} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ActionButtons onFinish={handleSave} disabled={saving || Object.keys(entries).length === 0} />
    </div>
  );
};

export default VitalSigns;
