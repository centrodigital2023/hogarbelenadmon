import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import type { ResidentOption } from "@/integrations/supabase/tables";

interface Props { onBack: () => void; }

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const THERAPY_TYPES = ['Física', 'Ocupacional', 'Cognitiva', 'Lúdica', 'Musical', 'Artística', 'Social'];

const TherapySessionForm = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [therapyName, setTherapyName] = useState("");
  const [therapyType, setTherapyType] = useState(THERAPY_TYPES[0]);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState("09:00");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("semanal");
  const [selectedResidents, setSelectedResidents] = useState<string[]>([]);
  const [attendeeObs, setAttendeeObs] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['permanente', 'prueba']).then(({ data }) => data && setResidents(data));
  }, []);

  const handleSave = async () => {
    if (!user || !therapyName) return;
    setSaving(true);
    const attendees = selectedResidents.map(id => ({
      resident_id: id, resident_name: residents.find(r => r.id === id)?.full_name,
      attended: true, observations: attendeeObs[id] || '',
    }));
    const { error } = await supabase.from('therapy_sessions').insert({
      therapy_name: `${therapyType}: ${therapyName}`, session_date: sessionDate,
      session_time: sessionTime, days_of_week: selectedDays, frequency,
      attendees, observations, created_by: user.id,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Sesión de terapia guardada" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-F9: Terapias y Actividades (Mejorado)" subtitle="Registro de sesiones con asistencia y observaciones" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Tipo</label>
            <select value={therapyType} onChange={e => setTherapyType(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
              {THERAPY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select></div>
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Nombre</label>
            <input value={therapyName} onChange={e => setTherapyName(e.target.value)} placeholder="Nombre de la actividad" className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Hora</label>
            <input type="time" value={sessionTime} onChange={e => setSessionTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-3">Programación</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {DAYS.map(day => (
            <button key={day} onClick={() => setSelectedDays(p => p.includes(day) ? p.filter(d => d !== day) : [...p, day])}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedDays.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {day}
            </button>
          ))}
        </div>
        <select value={frequency} onChange={e => setFrequency(e.target.value)} className="px-3 py-2 rounded-xl border border-input bg-background text-sm">
          <option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option><option value="diario">Diario</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-3">Asistentes</h3>
        <div className="space-y-2">
          {residents.map(r => (
            <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedResidents.includes(r.id) ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <input type="checkbox" checked={selectedResidents.includes(r.id)}
                onChange={e => setSelectedResidents(p => e.target.checked ? [...p, r.id] : p.filter(x => x !== r.id))}
                className="w-5 h-5 rounded accent-primary" />
              <span className="text-sm font-medium text-foreground flex-1">{r.full_name}</span>
              {selectedResidents.includes(r.id) && (
                <input placeholder="Observaciones" value={attendeeObs[r.id] || ''}
                  onChange={e => setAttendeeObs(p => ({...p, [r.id]: e.target.value}))}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-xs" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Observaciones Generales</label>
        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
      </div>

      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default TherapySessionForm;
