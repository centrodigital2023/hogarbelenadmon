import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }

const ACTIVITY_TYPES = ['Oración comunitaria', 'Misa/Culto', 'Visita pastoral', 'Lectura espiritual', 'Meditación/Reflexión', 'Celebración especial'];

const SpiritualRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0]);
  const [topic, setTopic] = useState("");
  const [leader, setLeader] = useState("");
  const [attendeesCount, setAttendeesCount] = useState("");
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('spiritual_records').insert({
      record_date: recordDate, activity_type: activityType,
      topic, leader, attendees_count: parseInt(attendeesCount) || 0,
      observations, created_by: user.id,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "HB-F11 guardado" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-F11: Acompañamiento Espiritual" subtitle="Actividades espirituales y religiosas" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
          <input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Tipo de Actividad</label>
          <select value={activityType} onChange={e => setActivityType(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
            {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Líder/Guía</label>
          <input value={leader} onChange={e => setLeader(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Asistentes</label>
          <input type="number" value={attendeesCount} onChange={e => setAttendeesCount(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Tema / Reflexión</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Observaciones</label>
        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={4}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6"><SignaturePad label="Responsable" /></div>
      <SmartReportSection module="bienestar" formTitle="HB-F11: Acompañamiento Espiritual" formData={{ activityType, topic, observations, attendeesCount }} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default SpiritualRecord;
