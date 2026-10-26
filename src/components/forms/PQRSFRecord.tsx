import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFormDraft } from "@/hooks/useFormDraft";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import DraftNotice from "@/components/DraftNotice";
import ExportButtons from "@/components/ExportButtons";
import SmartReportSection from "@/components/SmartReportSection";
import DictationTextarea from "@/components/DictationTextarea";
import { Section, Field, ChoiceChips, Notice, inputCls } from "@/components/forms/ui";
import { MessageSquarePlus, X } from "lucide-react";
import type { Row } from "@/integrations/supabase/tables";
import { todayLocal, daysBetween } from "@/lib/form-helpers";
import { PQRSF_TYPES, pqrsfLabel, pqrsfDeadline, deadlineState, type PqrsfType } from "@/lib/form-rules";

interface Props { onBack: () => void; }

type Pqrsf = Row<"pqrsf">;
type Filter = 'abierto' | 'cerrado' | 'todos';

const TYPE_STYLE: Record<string, string> = {
  peticion: 'bg-sky-500/10 text-sky-700',
  queja: 'bg-destructive/10 text-destructive',
  reclamo: 'bg-amber-500/10 text-amber-700',
  sugerencia: 'bg-violet-500/10 text-violet-700',
  felicitacion: 'bg-emerald-500/10 text-emerald-700',
};

type NewPqrsf = { sender_name: string; pqrsf_type: PqrsfType | ''; description: string; record_date: string };
const emptyForm = (): NewPqrsf => ({ sender_name: '', pqrsf_type: '', description: '', record_date: todayLocal() });

const PQRSFRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [records, setRecords] = useState<Pqrsf[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewPqrsf>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>('abierto');
  const [answering, setAnswering] = useState<string | null>(null);
  const [answer, setAnswer] = useState({ analysis: '', improvement_plan: '' });
  const draft = useFormDraft('pqrsf', form, setForm, d => !d.sender_name && !d.description && !d.pqrsf_type);
  const today = todayLocal();

  const load = useCallback(async () => {
    const { data } = await supabase.from('pqrsf').select('*').order('record_date', { ascending: false }).limit(200);
    setRecords(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (draft.restoredAt) setShowForm(true); }, [draft.restoredAt]);

  const missing = [
    ...(form.sender_name.trim() ? [] : ['quién lo envía']),
    ...(form.pqrsf_type ? [] : ['tipo']),
    ...(form.description.trim() ? [] : ['descripción']),
  ];

  const handleSave = async () => {
    if (!user || missing.length || !form.pqrsf_type) return;
    setSaving(true);
    const { error } = await supabase.from('pqrsf').insert({
      sender_name: form.sender_name.trim(), pqrsf_type: form.pqrsf_type, description: form.description.trim(),
      record_date: form.record_date, status: 'abierto', created_by: user.id,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      const deadline = pqrsfDeadline(form.pqrsf_type, form.record_date);
      toast({ title: `${pqrsfLabel(form.pqrsf_type)} registrada ✅`, description: deadline ? `Plazo legal de respuesta: ${deadline}` : 'Gracias por registrarla.' });
      draft.clear();
      setForm(emptyForm());
      setShowForm(false);
      load();
    }
    setSaving(false);
  };

  const closeWithAnswer = async (r: Pqrsf) => {
    if (!answer.analysis.trim()) return;
    const { error } = await supabase.from('pqrsf').update({
      status: 'cerrado', response_date: today, analysis: answer.analysis.trim(),
      improvement_plan: answer.improvement_plan.trim() || null, updated_at: new Date().toISOString(),
    }).eq('id', r.id);
    if (error) { toast({ title: "No se pudo cerrar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "PQRSF respondida y cerrada ✅" });
    setAnswering(null);
    setAnswer({ analysis: '', improvement_plan: '' });
    load();
  };

  const open = records.filter(r => r.status !== 'cerrado');
  const overdue = open.filter(r => deadlineState(pqrsfDeadline(r.pqrsf_type, r.record_date ?? today), today) === 'vencido');
  const shown = filter === 'todos' ? records : filter === 'cerrado' ? records.filter(r => r.status === 'cerrado') : open;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F23: PQRSF" subtitle="Peticiones, quejas, reclamos, sugerencias y felicitaciones" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(emptyForm()); setShowForm(false); }} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3 text-center"><p className="text-2xl font-black text-foreground">{open.length}</p><p className="text-[11px] font-bold text-muted-foreground">Abiertas</p></div>
        <div className={`rounded-2xl border p-3 text-center ${overdue.length ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'}`}><p className={`text-2xl font-black ${overdue.length ? 'text-destructive' : 'text-foreground'}`}>{overdue.length}</p><p className="text-[11px] font-bold text-muted-foreground">Vencidas</p></div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center"><p className="text-2xl font-black text-emerald-700">{records.filter(r => r.pqrsf_type === 'felicitacion').length}</p><p className="text-[11px] font-bold text-muted-foreground">Felicitaciones</p></div>
      </div>

      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)}
          className="mb-5 flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm">
          <MessageSquarePlus size={18} /> Registrar PQRSF
        </button>
      )}

      {showForm && (
        <Section title="Nueva PQRSF" actions={<button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"><X size={18} /></button>}>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tipo <span className="text-destructive">*</span></span>
          <ChoiceChips size="sm" options={PQRSF_TYPES.map(t => ({ value: t.value, label: `${t.emoji} ${t.label}` }))} value={form.pqrsf_type || null}
            onChange={v => setForm(p => ({ ...p, pqrsf_type: v }))} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="¿Quién la envía?" required>
              <input value={form.sender_name} onChange={e => setForm(p => ({ ...p, sender_name: e.target.value }))} placeholder="Nombre y parentesco" className={inputCls} />
            </Field>
            <Field label="Fecha de recibido">
              <input type="date" value={form.record_date} max={today} onChange={e => setForm(p => ({ ...p, record_date: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <div className="mt-4">
            <DictationTextarea label="Descripción *" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} minRows={3}
              placeholder="Escriba o dicte lo que la persona expresa, con sus palabras." />
          </div>
          {form.pqrsf_type && pqrsfDeadline(form.pqrsf_type, form.record_date) && (
            <div className="mt-3"><Notice>Debe responderse a más tardar el <strong>{pqrsfDeadline(form.pqrsf_type, form.record_date)}</strong> (15 días hábiles, Ley 1755 de 2015).</Notice></div>
          )}
          <ActionButtons inline onFinish={handleSave} saving={saving} missing={missing} label="Registrar" draftSavedAt={draft.savedAt} />
        </Section>
      )}

      <div className="mb-3"><ChoiceChips size="sm" options={[{ value: 'abierto' as const, label: `Abiertas (${open.length})` }, { value: 'cerrado' as const, label: 'Cerradas' }, { value: 'todos' as const, label: 'Todas' }]} value={filter} onChange={setFilter} /></div>

      <div ref={contentRef} className="space-y-3">
        {shown.map(r => {
          const deadline = pqrsfDeadline(r.pqrsf_type, r.record_date ?? today);
          const state = r.status === 'cerrado' ? null : deadlineState(deadline, today);
          return (
            <div key={r.id} className={`rounded-2xl border-2 bg-card p-4 ${state === 'vencido' ? 'border-destructive/40' : state === 'por_vencer' ? 'border-amber-400' : 'border-border'}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${TYPE_STYLE[r.pqrsf_type] ?? 'bg-muted'}`}>{pqrsfLabel(r.pqrsf_type)}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${r.status === 'cerrado' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-foreground'}`}>{r.status === 'cerrado' ? 'Cerrada' : 'Abierta'}</span>
                <span className="text-xs text-muted-foreground">{r.record_date}</span>
                {state === 'vencido' && deadline && <span className="text-xs font-bold text-destructive">Vencida hace {daysBetween(deadline, today)} días</span>}
                {state === 'por_vencer' && deadline && <span className="text-xs font-bold text-amber-700">Vence {deadline}</span>}
                {state === 'a_tiempo' && deadline && <span className="text-xs text-muted-foreground">Responder antes del {deadline}</span>}
              </div>
              <p className="text-sm font-bold text-foreground">{r.sender_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
              {r.analysis && <p className="mt-2 rounded-lg bg-muted p-2 text-xs"><strong>Respuesta ({r.response_date}):</strong> {r.analysis}{r.improvement_plan ? ` · Plan: ${r.improvement_plan}` : ''}</p>}
              {r.status !== 'cerrado' && (answering === r.id ? (
                <div className="mt-3 space-y-3">
                  <DictationTextarea label="Respuesta y análisis *" value={answer.analysis} onChange={v => setAnswer(a => ({ ...a, analysis: v }))} minRows={3} />
                  <Field label="Plan de mejora (opcional)">
                    <input value={answer.improvement_plan} onChange={e => setAnswer(a => ({ ...a, improvement_plan: e.target.value }))} className={inputCls} />
                  </Field>
                  <div className="flex gap-2">
                    <button type="button" disabled={!answer.analysis.trim()} onClick={() => closeWithAnswer(r)}
                      className="min-h-[44px] rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-40">Responder y cerrar</button>
                    <button type="button" onClick={() => setAnswering(null)} className="min-h-[44px] rounded-xl bg-muted px-4 text-sm font-bold">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setAnswering(r.id); setAnswer({ analysis: r.analysis ?? '', improvement_plan: r.improvement_plan ?? '' }); }}
                  className="mt-3 min-h-[40px] rounded-xl border-2 border-primary px-4 text-xs font-bold text-primary">Responder</button>
              ))}
            </div>
          );
        })}
        {shown.length === 0 && <Notice>{filter === 'abierto' ? '¡Todo al día! No hay PQRSF abiertas.' : 'No hay registros.'}</Notice>}
      </div>

      <div className="my-4">
        <ExportButtons contentRef={contentRef} title="HB-F23 PQRSF" fileName="pqrsf"
          data={records.map(r => ({ Fecha: r.record_date, Tipo: pqrsfLabel(r.pqrsf_type), Remitente: r.sender_name, Descripción: r.description, Estado: r.status, Respuesta: r.analysis, 'Fecha respuesta': r.response_date }))}
          textContent={records.map(r => `${r.record_date} ${pqrsfLabel(r.pqrsf_type)} — ${r.sender_name}: ${r.description} [${r.status}]`).join('\n')} />
      </div>
      <SmartReportSection module="calidad" formTitle="HB-F23: PQRSF" formData={{ records }} contentRef={contentRef} />
    </div>
  );
};

export default PQRSFRecord;
