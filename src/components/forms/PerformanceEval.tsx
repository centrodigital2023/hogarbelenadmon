import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFormDraft } from "@/hooks/useFormDraft";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import DraftNotice from "@/components/DraftNotice";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";
import DictationTextarea from "@/components/DictationTextarea";
import { Section, Field, Notice, inputCls } from "@/components/forms/ui";
import type { Row } from "@/integrations/supabase/tables";
import { todayLocal } from "@/lib/form-helpers";
import { CONCEPT_LABELS, performanceConcept, semesterLabel, type PerformanceConcept } from "@/lib/form-rules";

interface Props { onBack: () => void; }

const CRITERIA = [
  { key: 'score_resident_care', label: 'Trato al residente', hint: 'Calidez, respeto, paciencia' },
  { key: 'score_compliance', label: 'Cumplimiento', hint: 'Horarios, uniforme, registros' },
  { key: 'score_safety', label: 'Seguridad', hint: 'Aplica los protocolos' },
  { key: 'score_proactivity', label: 'Proactividad', hint: 'Se anticipa y propone' },
  { key: 'score_teamwork', label: 'Trabajo en equipo', hint: 'Colabora y comunica' },
  { key: 'score_hygiene', label: 'Higiene', hint: 'Personal y del entorno' },
] as const;
type ScoreKey = typeof CRITERIA[number]['key'];

const SCALE = ['', 'Deficiente', 'Por mejorar', 'Aceptable', 'Bueno', 'Excelente'];

type EvalForm = Record<ScoreKey, number> & { evaluated_user_id: string; period: string; evaluation_date: string; improvement_plan: string };

const emptyForm = (): EvalForm => ({
  evaluated_user_id: '', period: semesterLabel(), evaluation_date: todayLocal(), improvement_plan: '',
  score_resident_care: 3, score_compliance: 3, score_safety: 3, score_proactivity: 3, score_teamwork: 3, score_hygiene: 3,
});

const CONCEPT_STYLE: Record<PerformanceConcept, string> = {
  sobresaliente: 'bg-emerald-500/10 text-emerald-700 border-emerald-400',
  satisfactorio: 'bg-sky-500/10 text-sky-700 border-sky-400',
  necesita_mejorar: 'bg-destructive/10 text-destructive border-destructive/40',
};

const PerformanceEval = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [profiles, setProfiles] = useState<Pick<Row<"profiles">, "user_id" | "full_name">[]>([]);
  const [form, setForm] = useState<EvalForm>(emptyForm);
  const [previous, setPrevious] = useState<Row<"performance_evaluations"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [sigKey, setSigKey] = useState(0);
  const draft = useFormDraft('desempeno', form, setForm, d => !d.evaluated_user_id && !d.improvement_plan);

  useEffect(() => {
    supabase.from('profiles').select('user_id, full_name').order('full_name')
      .then(({ data }) => setProfiles((data ?? []).filter(p => p.user_id !== user?.id)));
  }, [user?.id]);

  useEffect(() => {
    setPrevious(null);
    if (!form.evaluated_user_id) return;
    supabase.from('performance_evaluations').select('*').eq('evaluated_user_id', form.evaluated_user_id)
      .order('evaluation_date', { ascending: false }).limit(1)
      .then(({ data }) => setPrevious(data?.[0] ?? null));
  }, [form.evaluated_user_id]);

  const total = CRITERIA.reduce((s, c) => s + form[c.key], 0);
  const concept = performanceConcept(total);
  const lowCriteria = CRITERIA.filter(c => form[c.key] <= 2);
  const needsPlan = concept === 'necesita_mejorar' || lowCriteria.length > 0;
  const missing = [
    ...(form.evaluated_user_id ? [] : ['colaborador']),
    ...(form.period.trim() ? [] : ['periodo']),
    ...(needsPlan && !form.improvement_plan.trim() ? ['plan de mejora'] : []),
  ];
  const name = profiles.find(p => p.user_id === form.evaluated_user_id)?.full_name ?? '';

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { error } = await supabase.from('performance_evaluations').insert({
      ...form, period: form.period.trim(), improvement_plan: form.improvement_plan.trim() || null,
      evaluated_by: user.id, total_score: total, concept,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Evaluación guardada ✅", description: `${name}: ${total}/30 · ${CONCEPT_LABELS[concept]}` });
      draft.clear();
      setForm(emptyForm());
      setSigKey(k => k + 1);
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F25: Evaluación de Desempeño" subtitle="Evaluación periódica del personal" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(emptyForm()); }} />
      <div ref={contentRef}>
        <Section>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Colaborador" required>
              <select value={form.evaluated_user_id} onChange={e => setForm(p => ({ ...p, evaluated_user_id: e.target.value }))} className={inputCls}>
                <option value="">Elegir colaborador…</option>
                {profiles.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
              </select>
            </Field>
            <Field label="Periodo evaluado" required>
              <input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} placeholder="Ej.: Enero-Junio 2026" className={inputCls} />
            </Field>
            <Field label="Fecha de evaluación">
              <input type="date" value={form.evaluation_date} max={todayLocal()} onChange={e => setForm(p => ({ ...p, evaluation_date: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          {previous && (
            <div className="mt-3">
              <Notice>Evaluación anterior ({previous.period ?? previous.evaluation_date}): <strong>{previous.total_score}/30</strong>
                {previous.concept && ` · ${CONCEPT_LABELS[previous.concept as PerformanceConcept] ?? previous.concept}`}
                {previous.total_score != null && form.evaluated_user_id && ` · Hoy va ${total > previous.total_score ? `${total - previous.total_score} puntos arriba 📈` : total < previous.total_score ? `${previous.total_score - total} puntos abajo` : 'igual'}`}
                {previous.improvement_plan && <><br />Compromisos anteriores: {previous.improvement_plan}</>}
              </Notice>
            </div>
          )}
        </Section>

        <Section title="Criterios" hint="1 = Deficiente · 3 = Aceptable · 5 = Excelente">
          <div className="space-y-4">
            {CRITERIA.map(c => (
              <div key={c.key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground">{c.hint} · <span className="font-bold">{SCALE[form[c.key]]}</span></p>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:flex" role="radiogroup" aria-label={c.label}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} type="button" role="radio" aria-checked={form[c.key] === v} onClick={() => setForm(p => ({ ...p, [c.key]: v }))}
                      className={`h-11 rounded-xl text-sm font-black transition active:scale-95 sm:w-11 ${form[c.key] === v ? (v <= 2 ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground') : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-5 flex items-center justify-between rounded-xl border-2 p-3 ${CONCEPT_STYLE[concept]}`}>
            <span className="text-sm font-black">Total: {total}/30</span>
            <span className="text-sm font-black">{CONCEPT_LABELS[concept]}</span>
          </div>
        </Section>

        <Section title="Plan de mejora y compromisos">
          {needsPlan && (
            <div className="mb-3"><Notice tone="warning">
              {lowCriteria.length ? `Puntaje bajo en: ${lowCriteria.map(c => c.label.toLowerCase()).join(', ')}. ` : ''}Acuerde compromisos concretos con fecha.
            </Notice></div>
          )}
          <DictationTextarea label={needsPlan ? 'Compromisos *' : 'Compromisos (opcional)'} value={form.improvement_plan}
            onChange={v => setForm(p => ({ ...p, improvement_plan: v }))} minRows={3}
            placeholder="Ej.: Llegar a tiempo al relevo de turno; repasar protocolo de caídas antes del 30 de noviembre." />
        </Section>

        <Section title="Firmas" hint="Se imprimen en el PDF del informe.">
          <div key={sigKey} className="flex flex-wrap justify-center gap-6">
            <SignaturePad label="Evaluador" />
            <SignaturePad label="Evaluado" />
          </div>
        </Section>
      </div>

      <SmartReportSection module="personal" formTitle="HB-F25: Evaluación Desempeño" formData={{ ...form, colaborador: name, total, concepto: CONCEPT_LABELS[concept] }} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default PerformanceEval;
