import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }

const TrainingRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [form, setForm] = useState({
    topic: '', facilitator: '', facilitator_entity: '', training_date: new Date().toISOString().split('T')[0],
    start_time: '', end_time: '', objective: '', content: '', observations: '', objective_met: false,
  });
  const [attendees, setAttendees] = useState<{ name: string; cargo: string }[]>([{ name: '', cargo: '' }]);
  const [saving, setSaving] = useState(false);

  const addAttendee = () => setAttendees(prev => [...prev, { name: '', cargo: '' }]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('trainings').insert({
      ...form, created_by: user.id,
      attendees: attendees.filter(a => a.name) as any,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Capacitación registrada" });
    setSaving(false);
  };

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F24: Capacitaciones" subtitle="Registro de capacitaciones del personal" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Tema</label>
          <input type="text" value={form.topic} onChange={e => update('topic', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Facilitador</label>
          <input type="text" value={form.facilitator} onChange={e => update('facilitator', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Entidad</label>
          <input type="text" value={form.facilitator_entity} onChange={e => update('facilitator_entity', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
          <input type="date" value={form.training_date} onChange={e => update('training_date', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Hora inicio</label>
          <input type="time" value={form.start_time} onChange={e => update('start_time', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Hora fin</label>
          <input type="time" value={form.end_time} onChange={e => update('end_time', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" /></div>
        <div className="sm:col-span-2"><label className="text-xs font-bold text-muted-foreground uppercase">Objetivo</label>
          <textarea value={form.objective} onChange={e => update('objective', e.target.value)} rows={2}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" /></div>
        <div className="sm:col-span-2"><label className="text-xs font-bold text-muted-foreground uppercase">Contenido</label>
          <textarea value={form.content} onChange={e => update('content', e.target.value)} rows={3}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" /></div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-black text-foreground mb-3">Lista de Asistentes</h3>
        {attendees.map((a, i) => (
          <div key={i} className="flex gap-3 mb-2">
            <input type="text" placeholder="Nombre" value={a.name}
              onChange={e => { const n = [...attendees]; n[i].name = e.target.value; setAttendees(n); }}
              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="Cargo" value={a.cargo}
              onChange={e => { const n = [...attendees]; n[i].cargo = e.target.value; setAttendees(n); }}
              className="w-40 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
        ))}
        <button onClick={addAttendee} className="text-xs text-primary font-bold mt-2">+ Agregar asistente</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={form.objective_met} onChange={e => update('objective_met', e.target.checked)}
            className="w-5 h-5 accent-primary" />
          <span className="text-sm font-bold text-foreground">¿Se cumplió el objetivo?</span>
        </label>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <SignaturePad label="Facilitador" />
      </div>

      <SmartReportSection module="personal" formTitle="HB-F24: Capacitaciones" formData={{ ...form, attendees }} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} disabled={saving || !form.topic} />
    </div>
  );
};

export default TrainingRecord;
