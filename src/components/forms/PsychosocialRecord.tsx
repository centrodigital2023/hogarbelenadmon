import { useRef, useState } from "react";
import type { TablesInsert } from "@/integrations/supabase/types";
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
import { todayLocal } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

const MOTIVOS = ['Adaptación al hogar', 'Conflictos interpersonales', 'Duelo', 'Ansiedad', 'Depresión', 'Agresividad', 'Aislamiento', 'Solicitud familiar', 'Seguimiento'];
const TOPICS = ['Reminiscencia', 'Manejo de emociones', 'Duelo y pérdidas', 'Autoestima', 'Comunicación', 'Integración social'];
const TYPES = [{ value: 'individual' as const, label: '👤 Individual' }, { value: 'grupal' as const, label: '👥 Grupal' }];

type PsychoDraft = {
  recordType: 'individual' | 'grupal'; residentId: string; recordDate: string; motivos: string[];
  evolution: string; recommendations: string; groupTopic: string; groupAchievement: string; attendees: string[];
}
const newDraft = (): PsychoDraft => ({
  recordType: 'individual', residentId: '', recordDate: todayLocal(), motivos: [],
  evolution: '', recommendations: '', groupTopic: '', groupAchievement: '', attendees: [],
});
const isBlank = (d: PsychoDraft) => !d.residentId && !d.motivos.length && !d.evolution && !d.recommendations && !d.groupTopic && !d.groupAchievement && !d.attendees.length;

const toggle = (list: string[], item: string) => list.includes(item) ? list.filter(x => x !== item) : [...list, item];

const PsychosocialRecord = ({ onBack }: Props) => {
  const { user, profile, roles } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const [form, setForm] = useState<PsychoDraft>(newDraft);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draft = useFormDraft('psicosocial', form, setForm, isBlank);
  const set = <K extends keyof PsychoDraft>(k: K, v: PsychoDraft[K]) => setForm(f => ({ ...f, [k]: v }));
  const individual = form.recordType === 'individual';
  const professionalRole = roles.includes('psicologo') ? ROLE_LABELS.psicologo : roles[0] ? ROLE_LABELS[roles[0]] : 'Profesional';

  const missing = individual
    ? [...(form.residentId ? [] : ['residente']), ...(form.motivos.length ? [] : ['motivo']), ...(form.evolution.trim() ? [] : ['evolución'])]
    : [...(form.groupTopic.trim() ? [] : ['tema']), ...(form.attendees.length ? [] : ['asistentes'])];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const payload: TablesInsert<"psychosocial_records"> = {
      record_type: form.recordType, record_date: form.recordDate, created_by: user.id,
      evolution: form.evolution.trim() || null, recommendations: form.recommendations.trim() || null,
      signature, responsible_id: user.id, responsible_name: profile?.full_name ?? null, responsible_role: professionalRole,
      ...(individual
        ? { resident_id: form.residentId, reason: form.motivos.join(', ') }
        : { group_topic: form.groupTopic.trim(), group_achievement: form.groupAchievement.trim() || null, attendees: form.attendees }),
    };
    const { error } = await supabase.from('psychosocial_records').insert(payload);
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Atención psicosocial guardada ✅", description: individual ? residents.find(r => r.id === form.residentId)?.full_name : `${form.attendees.length} asistentes` });
      draft.clear();
      setForm(f => ({ ...newDraft(), recordType: f.recordType, recordDate: f.recordDate }));
      setSignature(null);
    }
    setSaving(false);
  };

  const residentName = residents.find(r => r.id === form.residentId)?.full_name ?? '';
  const summary = individual
    ? `HB-F10 Atención psicosocial individual — ${residentName} — ${form.recordDate}\nMotivo: ${form.motivos.join(', ')}\nEvolución: ${form.evolution}\nRecomendaciones: ${form.recommendations}`
    : `HB-F10 Sesión grupal — ${form.recordDate}\nTema: ${form.groupTopic}\nAsistentes: ${form.attendees.map(id => residents.find(r => r.id === id)?.full_name).join(', ')}\nLogro: ${form.groupAchievement}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F10: Atención Psicosocial" subtitle="Sesiones individuales y grupales" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(newDraft()); }} />
      <div ref={contentRef}>
        <Section>
          <ChoiceChips options={TYPES} value={form.recordType} onChange={v => set('recordType', v)} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input type="date" value={form.recordDate} max={todayLocal()} onChange={e => set('recordDate', e.target.value)} className={inputCls} />
            </Field>
            {individual && (
              <Field label="Residente" required>
                <ResidentSelect residents={residents} loading={loading} value={form.residentId} onChange={v => set('residentId', v)} />
              </Field>
            )}
          </div>
        </Section>

        {individual ? (
          <>
            <Section title="Motivo de consulta">
              <div className="flex flex-wrap gap-2">
                {MOTIVOS.map(m => (
                  <button key={m} type="button" onClick={() => set('motivos', toggle(form.motivos, m))} aria-pressed={form.motivos.includes(m)}
                    className={`min-h-[40px] rounded-xl border-2 px-3 text-xs font-bold transition ${form.motivos.includes(m) ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{m}</button>
                ))}
              </div>
            </Section>
            <Section>
              <DictationTextarea label="Evolución" value={form.evolution} onChange={v => set('evolution', v)} minRows={4}
                placeholder="Cómo llegó, qué se trabajó y cómo respondió. Escribe o toca Dictar." />
              <div className="mt-4">
                <DictationTextarea label="Recomendaciones" value={form.recommendations} onChange={v => set('recommendations', v)} minRows={3}
                  placeholder="Para el equipo de cuidado y la familia." />
              </div>
            </Section>
          </>
        ) : (
          <>
            <Section title="Tema de la sesión">
              <ChoiceChips size="sm" options={TOPICS.map(t => ({ value: t, label: t }))} value={form.groupTopic} onChange={v => set('groupTopic', v)} />
              <input value={form.groupTopic} onChange={e => set('groupTopic', e.target.value)} placeholder="u otro tema…" className={inputCls} />
            </Section>
            <Section title={`Asistentes (${form.attendees.length})`}
              actions={<button type="button" onClick={() => set('attendees', form.attendees.length === residents.length ? [] : residents.map(r => r.id))}
                className="min-h-[36px] rounded-xl bg-muted px-3 text-xs font-bold hover:bg-accent">{form.attendees.length === residents.length ? 'Quitar todos' : 'Todos'}</button>}>
              <div className="flex flex-wrap gap-2">
                {residents.map(r => (
                  <button key={r.id} type="button" onClick={() => set('attendees', toggle(form.attendees, r.id))} aria-pressed={form.attendees.includes(r.id)}
                    className={`min-h-[40px] rounded-xl border-2 px-3 text-xs font-bold transition ${form.attendees.includes(r.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>{r.full_name}</button>
                ))}
              </div>
            </Section>
            <Section>
              <DictationTextarea label="Logro del grupo" value={form.groupAchievement} onChange={v => set('groupAchievement', v)} minRows={3} />
            </Section>
          </>
        )}

        <Section title="Firma del profesional" hint={`${profile?.full_name ?? ''} · ${professionalRole}`}>
          <SignaturePad label="Profesional" value={signature || undefined} onChange={setSignature} />
        </Section>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title="HB-F10 Atención Psicosocial" fileName={`psicosocial_${form.recordDate}`} textContent={summary} signatureDataUrl={signature} />
        <ShareButtons title="HB-F10 Atención Psicosocial" text={summary} />
        <FormHistory tableName="psychosocial_records" title="Historial Psicosocial" fileName="hist_psicosocial"
          selectClause="*, residents(full_name)" dateColumn="record_date"
          columns={[
            { key: 'record_date', label: 'Fecha' },
            { key: 'record_type', label: 'Tipo' },
            { key: 'residents', label: 'Residente', render: (_v, row) => row.residents?.full_name || (row.group_topic as string) || '-' },
            { key: 'reason', label: 'Motivo' },
            { key: 'responsible_name', label: 'Profesional' },
          ]} />
      </div>
      <SmartReportSection module="bienestar" formTitle="HB-F10: Atención Psicosocial" formData={form} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default PsychosocialRecord;
