import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveResidents } from "@/hooks/useActiveResidents";
import { useFormDraft } from "@/hooks/useFormDraft";
import { ROLE_LABELS } from "@/hooks/usePermissions";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import DraftNotice from "@/components/DraftNotice";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";
import DictationTextarea from "@/components/DictationTextarea";
import FormHistory from "@/components/FormHistory";
import { Section, Field, ChoiceChips, ResidentSelect, inputCls } from "@/components/forms/ui";
import { Minus, Plus } from "lucide-react";
import { todayLocal } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

const ACTIVITY_TYPES = ['Oración comunitaria', 'Misa/Culto', 'Visita pastoral', 'Lectura espiritual', 'Meditación/Reflexión', 'Celebración especial'];

type SpiritualDraft = {
  recordDate: string; activityType: string; topic: string; leader: string;
  attendeesCount: number; residentId: string; observations: string;
}
const newDraft = (): SpiritualDraft => ({
  recordDate: todayLocal(), activityType: ACTIVITY_TYPES[0], topic: '', leader: '', attendeesCount: 0, residentId: '', observations: '',
});

const SpiritualRecord = ({ onBack }: Props) => {
  const { user, profile, roles } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const [form, setForm] = useState<SpiritualDraft>(newDraft);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draft = useFormDraft('espiritual', form, setForm, d => !d.topic && !d.leader && !d.observations && !d.attendeesCount && !d.residentId);
  const set = <K extends keyof SpiritualDraft>(k: K, v: SpiritualDraft[K]) => setForm(f => ({ ...f, [k]: v }));
  const individual = form.activityType === 'Visita pastoral';

  const missing = [
    ...(form.topic.trim() ? [] : ['tema']),
    ...(individual ? (form.residentId ? [] : ['residente visitado']) : (form.attendeesCount > 0 ? [] : ['número de asistentes'])),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { error } = await supabase.from('spiritual_records').insert({
      record_date: form.recordDate, activity_type: form.activityType, topic: form.topic.trim(),
      leader: form.leader.trim() || null, attendees_count: individual ? 1 : form.attendeesCount,
      resident_id: form.residentId || null, observations: form.observations.trim() || null, created_by: user.id,
      signature, responsible_id: user.id, responsible_name: profile?.full_name ?? null,
      responsible_role: roles[0] ? ROLE_LABELS[roles[0]] : null,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Acompañamiento espiritual guardado ✅", description: `${form.activityType} · ${form.topic}` });
      draft.clear();
      setForm(f => ({ ...newDraft(), recordDate: f.recordDate, leader: f.leader }));
      setSignature(null);
    }
    setSaving(false);
  };

  const summary = `HB-F11 ${form.activityType} — ${form.recordDate}\nTema: ${form.topic}\nGuía: ${form.leader}\n${individual ? `Residente: ${residents.find(r => r.id === form.residentId)?.full_name ?? ''}` : `Asistentes: ${form.attendeesCount}`}\n${form.observations}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F11: Acompañamiento Espiritual" subtitle="Actividades espirituales y visitas pastorales" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(newDraft()); }} />
      <div ref={contentRef}>
        <Section>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Actividad</span>
          <ChoiceChips size="sm" options={ACTIVITY_TYPES.map(t => ({ value: t, label: t }))} value={form.activityType} onChange={v => set('activityType', v)} />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Fecha">
              <input type="date" value={form.recordDate} max={todayLocal()} onChange={e => set('recordDate', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Guía / líder">
              <input value={form.leader} onChange={e => set('leader', e.target.value)} placeholder="Ej.: Padre Juan" className={inputCls} />
            </Field>
            {individual ? (
              <Field label="Residente visitado" required>
                <ResidentSelect residents={residents} loading={loading} value={form.residentId} onChange={v => set('residentId', v)} />
              </Field>
            ) : (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Asistentes <span className="text-destructive">*</span></span>
                <div className="mt-1 flex items-center gap-2">
                  <button type="button" aria-label="Uno menos" onClick={() => set('attendeesCount', Math.max(0, form.attendeesCount - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted hover:bg-accent"><Minus size={16} /></button>
                  <input type="number" inputMode="numeric" min={0} value={form.attendeesCount || ''} onChange={e => set('attendeesCount', Math.max(0, Number(e.target.value) || 0))}
                    className="h-11 w-16 rounded-xl border border-input bg-background text-center text-lg font-black" />
                  <button type="button" aria-label="Uno más" onClick={() => set('attendeesCount', form.attendeesCount + 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Plus size={16} /></button>
                  {residents.length > 0 && (
                    <button type="button" onClick={() => set('attendeesCount', residents.length)} className="text-xs font-bold text-primary">Todos ({residents.length})</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section>
          <Field label="Tema / reflexión" required>
            <input value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="Ej.: La gratitud" className={inputCls} />
          </Field>
          <div className="mt-4">
            <DictationTextarea label="Observaciones" value={form.observations} onChange={v => set('observations', v)} minRows={3}
              placeholder="Cómo participaron, peticiones especiales, quién necesita acompañamiento." />
          </div>
        </Section>

        <Section title="Firma del responsable">
          <SignaturePad label="Responsable" value={signature || undefined} onChange={setSignature} />
        </Section>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title="HB-F11 Acompañamiento Espiritual" fileName={`espiritual_${form.recordDate}`} textContent={summary} signatureDataUrl={signature} />
        <ShareButtons title="HB-F11 Acompañamiento Espiritual" text={summary} />
        <FormHistory tableName="spiritual_records" title="Historial Espiritual" fileName="hist_espiritual" dateColumn="record_date"
          columns={[
            { key: 'record_date', label: 'Fecha' }, { key: 'activity_type', label: 'Actividad' }, { key: 'topic', label: 'Tema' },
            { key: 'leader', label: 'Guía' }, { key: 'attendees_count', label: 'Asistentes' },
          ]} />
      </div>
      <SmartReportSection module="bienestar" formTitle="HB-F11: Acompañamiento Espiritual" formData={form} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default SpiritualRecord;
