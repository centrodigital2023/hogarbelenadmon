import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const TherapyRecords = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [weekStart, setWeekStart] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<Record<string, {
    attended_monday: boolean; attended_wednesday: boolean; attended_friday: boolean;
    therapy_type: string; evolution_code: string; observations: string;
  }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const updateEntry = (rid: string, key: string, val: any) => {
    setEntries(prev => ({
      ...prev,
      [rid]: { ...prev[rid] || { attended_monday: false, attended_wednesday: false, attended_friday: false, therapy_type: '', evolution_code: '', observations: '' }, [key]: val }
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const inserts = Object.entries(entries).map(([rid, e]) => ({
      resident_id: rid, created_by: user.id, week_start: weekStart, ...e,
    }));
    const { error } = await supabase.from('therapy_records').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Terapias registradas" });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F9: Terapias" subtitle="Registro semanal de terapias físicas y cognitivas" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Semana del</label>
        <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
          className="mt-1 max-w-xs px-4 py-3 rounded-xl border border-input bg-background text-sm" />
      </div>
      <div className="space-y-3 mb-6">
        {residents.map(r => {
          const e = entries[r.id] || { attended_monday: false, attended_wednesday: false, attended_friday: false, therapy_type: '', evolution_code: '', observations: '' };
          return (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
              <p className="text-sm font-black text-foreground mb-3">{r.full_name}</p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Lunes</span>
                  <input type="checkbox" checked={e.attended_monday || false}
                    onChange={ev => updateEntry(r.id, 'attended_monday', ev.target.checked)}
                    className="w-6 h-6 accent-primary" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Miércoles</span>
                  <input type="checkbox" checked={e.attended_wednesday || false}
                    onChange={ev => updateEntry(r.id, 'attended_wednesday', ev.target.checked)}
                    className="w-6 h-6 accent-primary" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Viernes</span>
                  <input type="checkbox" checked={e.attended_friday || false}
                    onChange={ev => updateEntry(r.id, 'attended_friday', ev.target.checked)}
                    className="w-6 h-6 accent-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Tipo</label>
                  <select value={e.therapy_type || ''} onChange={ev => updateEntry(r.id, 'therapy_type', ev.target.value)}
                    className="mt-1 w-full px-2 py-1 rounded-lg border border-input bg-background text-xs">
                    <option value="">--</option>
                    <option>Fisioterapia</option>
                    <option>Cognitiva</option>
                    <option>Ocupacional</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Evolución</label>
                  <select value={e.evolution_code || ''} onChange={ev => updateEntry(r.id, 'evolution_code', ev.target.value)}
                    className="mt-1 w-full px-2 py-1 rounded-lg border border-input bg-background text-xs">
                    <option value="">--</option>
                    <option value="M">(M) Mantiene</option>
                    <option value="I">(I) Incrementa</option>
                    <option value="D">(D) Deterioro</option>
                    <option value="P">(P) Pasiva</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Obs.</label>
                  <input type="text" value={e.observations || ''} onChange={ev => updateEntry(r.id, 'observations', ev.target.value)}
                    className="mt-1 w-full px-2 py-1 rounded-lg border border-input bg-background text-xs" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <SignaturePad label="Terapeuta" />
      </div>
      <ActionButtons onFinish={handleSave} disabled={saving || Object.keys(entries).length === 0} />
    </div>
  );
};

export default TherapyRecords;
