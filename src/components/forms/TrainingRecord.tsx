import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFormDraft } from "@/hooks/useFormDraft";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import DraftNotice from "@/components/DraftNotice";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";
import DictationTextarea from "@/components/DictationTextarea";
import { Section, Field, ChoiceChips, Notice, inputCls, smallInputCls } from "@/components/forms/ui";
import { Trash2, UserPlus, Users } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import type { Row } from "@/integrations/supabase/tables";
import { todayLocal, blankToNull } from "@/lib/form-helpers";
import { minutesBetween, formatDuration } from "@/lib/form-rules";

interface Props { onBack: () => void; }

type Attendee = { name: string; cargo: string };
type TrainingForm = {
  topic: string; facilitator: string; facilitator_entity: string; training_date: string;
  start_time: string; end_time: string; objective: string; content: string; observations: string;
  objective_met: boolean | null; attendees: Attendee[];
};

const emptyForm = (): TrainingForm => ({
  topic: '', facilitator: '', facilitator_entity: '', training_date: todayLocal(), start_time: '', end_time: '',
  objective: '', content: '', observations: '', objective_met: null, attendees: [],
});

const TrainingRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<TrainingForm>(emptyForm);
  const [staff, setStaff] = useState<{ name: string; cargo: string }[]>([]);
  const [history, setHistory] = useState<Row<"trainings">[]>([]);
  const [saving, setSaving] = useState(false);
  const [sigKey, setSigKey] = useState(0);
  const draft = useFormDraft('capacitacion', form, setForm, d => !d.topic && !d.attendees.length && !d.content);

  const loadHistory = useCallback(() => {
    supabase.from('trainings').select('*').order('training_date', { ascending: false }).limit(10)
      .then(({ data }) => setHistory(data ?? []));
  }, []);

  useEffect(() => {
    loadHistory();
    // Staff list with their role so attendees can be added with one tap
    Promise.all([
      supabase.from('profiles').select('user_id, full_name').order('full_name'),
      supabase.from('user_roles').select('user_id, role'),
    ]).then(([{ data: profiles }, { data: roles }]) => {
      const roleOf = new Map((roles ?? []).map(r => [r.user_id, r.role as string]));
      setStaff((profiles ?? []).map(p => ({ name: p.full_name, cargo: (roleOf.get(p.user_id) ?? '').replace(/_/g, ' ') })));
    });
  }, [loadHistory]);

  const set = <K extends keyof TrainingForm>(k: K, v: TrainingForm[K]) => setForm(p => ({ ...p, [k]: v }));
  const setAttendees = (fn: (a: Attendee[]) => Attendee[]) => setForm(p => ({ ...p, attendees: fn(p.attendees) }));
  const present = new Set(form.attendees.map(a => a.name.trim().toLowerCase()));
  const notYet = staff.filter(s => !present.has(s.name.trim().toLowerCase()));

  const duration = minutesBetween(form.start_time, form.end_time);
  const badTimes = !!form.start_time && !!form.end_time && duration === null;
  const named = form.attendees.filter(a => a.name.trim());
  const missing = [
    ...(form.topic.trim() ? [] : ['tema']),
    ...(form.facilitator.trim() ? [] : ['facilitador']),
    ...(named.length ? [] : ['asistentes']),
    ...(badTimes ? ['hora fin después del inicio'] : []),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { attendees, ...rest } = form;
    const { error } = await supabase.from('trainings').insert({
      ...rest,
      topic: form.topic.trim(), facilitator: form.facilitator.trim(),
      facilitator_entity: blankToNull(form.facilitator_entity.trim()),
      start_time: blankToNull(form.start_time), end_time: blankToNull(form.end_time),
      objective: blankToNull(form.objective.trim()), content: blankToNull(form.content.trim()),
      observations: blankToNull(form.observations.trim()),
      attendees: attendees.filter(a => a.name.trim()) as unknown as Json, created_by: user.id,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Capacitación registrada ✅", description: `${form.topic} · ${named.length} asistentes` });
      draft.clear();
      setForm(emptyForm());
      setSigKey(k => k + 1);
      loadHistory();
    }
    setSaving(false);
  };

  const summary = `Capacitación: ${form.topic}\nFecha: ${form.training_date}${duration ? ` (${formatDuration(duration)})` : ''}\nFacilitador: ${form.facilitator}${form.facilitator_entity ? ` — ${form.facilitator_entity}` : ''}\nAsistentes (${named.length}):\n${named.map(a => `• ${a.name}${a.cargo ? ` (${a.cargo})` : ''}`).join('\n')}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F24: Capacitaciones" subtitle="Registro de capacitaciones del personal" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(emptyForm()); }} />
      <div ref={contentRef}>
        <Section>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tema" required className="sm:col-span-2">
              <input value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="Ej.: Prevención de caídas" className={inputCls} />
            </Field>
            <Field label="Facilitador" required>
              <input value={form.facilitator} onChange={e => set('facilitator', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Entidad">
              <input value={form.facilitator_entity} onChange={e => set('facilitator_entity', e.target.value)} placeholder="Ej.: ARL, Secretaría de Salud" className={inputCls} />
            </Field>
            <Field label="Fecha">
              <input type="date" value={form.training_date} onChange={e => set('training_date', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio"><input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inputCls} /></Field>
              <Field label="Fin"><input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inputCls} /></Field>
            </div>
          </div>
          {duration && <p className="mt-2 text-xs font-bold text-primary">Duración: {formatDuration(duration)}</p>}
          {badTimes && <div className="mt-2"><Notice tone="warning">La hora de fin debe ser posterior a la de inicio.</Notice></div>}
          <div className="mt-4 space-y-4">
            <DictationTextarea label="Objetivo" value={form.objective} onChange={v => set('objective', v)} minRows={2} />
            <DictationTextarea label="Contenido" value={form.content} onChange={v => set('content', v)} minRows={3} />
          </div>
        </Section>

        <Section title={`Asistentes (${named.length})`} icon={Users}
          actions={notYet.length > 0 && (
            <button type="button" onClick={() => setAttendees(a => [...a.filter(x => x.name.trim()), ...notYet])}
              className="min-h-[36px] rounded-xl bg-muted px-3 text-xs font-bold hover:bg-accent">Agregar todo el equipo</button>
          )}>
          {notYet.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {notYet.slice(0, 24).map(s => (
                <button key={s.name} type="button" onClick={() => setAttendees(a => [...a, s])}
                  className="min-h-[36px] rounded-full border-2 border-dashed border-primary/40 px-3 text-xs font-bold text-primary hover:bg-primary/5">
                  + {s.name}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {form.attendees.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input placeholder="Nombre" value={a.name} onChange={e => setAttendees(l => l.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={`${smallInputCls} flex-1`} />
                <input placeholder="Cargo" value={a.cargo} onChange={e => setAttendees(l => l.map((x, j) => j === i ? { ...x, cargo: e.target.value } : x))} className={`${smallInputCls} w-28 sm:w-40`} />
                <button type="button" aria-label="Quitar" onClick={() => setAttendees(l => l.filter((_, j) => j !== i))} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setAttendees(a => [...a, { name: '', cargo: '' }])} className="mt-3 flex min-h-[40px] items-center gap-2 text-xs font-bold text-primary">
            <UserPlus size={16} /> Agregar persona externa
          </button>
        </Section>

        <Section title="Cierre">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">¿Se cumplió el objetivo?</span>
          <ChoiceChips options={[{ value: 'si', label: '✅ Sí' }, { value: 'no', label: '❌ No' }]}
            value={form.objective_met === null ? null : form.objective_met ? 'si' : 'no'} onChange={v => set('objective_met', v === 'si')} />
          <div className="mt-4">
            <Field label="Observaciones">
              <textarea value={form.observations} onChange={e => set('observations', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </Field>
          </div>
          <div key={sigKey} className="mt-4 flex justify-center"><SignaturePad label="Facilitador" /></div>
        </Section>
      </div>

      {form.topic && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ExportButtons contentRef={contentRef} title={`Capacitación ${form.topic}`} fileName={`capacitacion_${form.training_date}`} textContent={summary} />
          <ShareButtons title={`Capacitación ${form.topic}`} text={summary} />
        </div>
      )}

      {history.length > 0 && (
        <details className="mb-5">
          <summary className="cursor-pointer text-sm font-bold text-foreground">Capacitaciones recientes ({history.length})</summary>
          <div className="mt-2 space-y-1">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs">
                <span className="font-medium">{h.training_date} · {h.topic}</span>
                <span className="shrink-0 text-muted-foreground">{Array.isArray(h.attendees) ? h.attendees.length : 0} asistentes</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <SmartReportSection module="personal" formTitle="HB-F24: Capacitaciones" formData={form} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default TrainingRecord;
