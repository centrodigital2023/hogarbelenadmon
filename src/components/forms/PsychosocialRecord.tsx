import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }

const MOTIVOS = ['Adaptación al hogar', 'Conflictos interpersonales', 'Duelo', 'Ansiedad', 'Depresión', 'Agresividad', 'Aislamiento', 'Solicitud familiar', 'Seguimiento'];

const PsychosocialRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<any[]>([]);
  const [recordType, setRecordType] = useState<'individual' | 'grupal'>('individual');
  const [residentId, setResidentId] = useState("");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [evolution, setEvolution] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [groupTopic, setGroupTopic] = useState("");
  const [groupAchievement, setGroupAchievement] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['permanente', 'prueba']).then(({ data }) => data && setResidents(data));
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload: any = {
      record_type: recordType, record_date: recordDate,
      created_by: user.id, evolution, recommendations,
    };
    if (recordType === 'individual') {
      payload.resident_id = residentId;
      payload.reason = motivos.join(', ');
    } else {
      payload.group_topic = groupTopic;
      payload.group_achievement = groupAchievement;
      payload.attendees = attendees;
    }
    const { error } = await supabase.from('psychosocial_records').insert(payload);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "HB-F10 guardado" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-F10: Atención Psicosocial" subtitle="Sesiones individuales y grupales" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex gap-4 mb-4">
          <button onClick={() => setRecordType('individual')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${recordType === 'individual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Individual</button>
          <button onClick={() => setRecordType('grupal')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${recordType === 'grupal' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Grupal</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
            <input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
          {recordType === 'individual' && (
            <div><label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
              <select value={residentId} onChange={e => setResidentId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
                <option value="">Seleccionar</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select></div>
          )}
        </div>
      </div>

      {recordType === 'individual' ? (
        <>
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-black text-foreground mb-3">Motivo de Consulta</h3>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS.map(m => (
                <button key={m} onClick={() => setMotivos(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${motivos.includes(m) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <label className="text-xs font-bold text-muted-foreground uppercase">Evolución</label>
            <textarea value={evolution} onChange={e => setEvolution(e.target.value)} rows={4}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <label className="text-xs font-bold text-muted-foreground uppercase">Recomendaciones</label>
            <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
          </div>
        </>
      ) : (
        <>
          <div className="bg-card border border-border rounded-2xl p-6">
            <label className="text-xs font-bold text-muted-foreground uppercase">Tema de la sesión grupal</label>
            <input value={groupTopic} onChange={e => setGroupTopic(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <label className="text-xs font-bold text-muted-foreground uppercase">Asistentes</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {residents.map(r => (
                <button key={r.id} onClick={() => setAttendees(p => p.includes(r.id) ? p.filter(x => x !== r.id) : [...p, r.id])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${attendees.includes(r.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {r.full_name}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <label className="text-xs font-bold text-muted-foreground uppercase">Logro del grupo</label>
            <textarea value={groupAchievement} onChange={e => setGroupAchievement(e.target.value)} rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
          </div>
        </>
      )}

      <div className="bg-card border border-border rounded-2xl p-6"><SignaturePad label="Profesional" /></div>
      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default PsychosocialRecord;
