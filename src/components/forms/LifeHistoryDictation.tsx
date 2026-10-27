import { useMemo, useState } from "react";
import { Mic, Sparkles, Loader2, Check, RotateCcw, Trash2, MessageCircleQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFormDraft } from "@/hooks/useFormDraft";
import DictationTextarea from "@/components/DictationTextarea";
import { ChoiceChips, Notice, inputCls } from "@/components/forms/ui";
import { errorMessage } from "@/lib/errors";
import { LIFE_HISTORY_FIELDS, type LifeHistoryField } from "@/lib/resident-documents";
import {
  LIFE_TOPICS, MORNING_OPTIONS, coveredTopics, defaultMode, mergeField, nextQuestion, organizeLocally, parseOrganized,
  type LifeHistoryForm, type MergeMode, type OrganizedDictation,
} from "@/lib/life-history-dictation";

interface Props {
  residentId: string;
  residentName: string;
  form: LifeHistoryForm;
  /** Recibe los campos ya unidos para pasarlos al formulario. */
  onApply: (values: Partial<LifeHistoryForm>) => void;
}

interface Row { field: LifeHistoryField; value: string; evidence?: string; mode: MergeMode }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const MIN_CHARS = 15;

const MODE_OPTIONS: { value: MergeMode; label: string }[] = [
  { value: "agregar", label: "Agregar" },
  { value: "reemplazar", label: "Reemplazar" },
  { value: "omitir", label: "Dejar lo que hay" },
];

/** Dictar toda la Historia de Vida de una vez y que la IA ponga cada cosa en su campo. */
const LifeHistoryDictation = ({ residentId, residentName, form, onApply }: Props) => {
  const { toast } = useToast();
  const [transcript, setTranscript] = useState("");
  const [organizing, setOrganizing] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [unassigned, setUnassigned] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);

  // Una conversación larga no se pierde si se cierra la app antes de organizarla
  const draft = useFormDraft(`HB-F22-dictado:${residentId}`, transcript, setTranscript, t => !t.trim());

  const covered = useMemo(() => coveredTopics(transcript), [transcript]);
  const suggestion = useMemo(() => nextQuestion(transcript, form), [transcript, form]);

  const toRows = (result: OrganizedDictation): Row[] =>
    LIFE_TOPICS.flatMap(t => {
      const p = result.fields[t.field];
      if (!p) return [];
      return [{ field: t.field, value: p.value, evidence: p.evidence, mode: defaultMode(form[t.field], p.value) }];
    });

  const organize = async () => {
    setOrganizing(true);
    let result: OrganizedDictation;
    let fallback = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-life-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ transcript, currentForm: form, residentName }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok || body.error) throw new Error(body.error || `Error ${resp.status}`);
      result = parseOrganized(body.data);
    } catch (err) {
      // Sin IA (sin internet, sin créditos): se reparte por palabras clave para no perder el trabajo
      console.warn("ai-life-history dictado:", errorMessage(err));
      result = organizeLocally(transcript);
      fallback = true;
    }
    const next = toRows(result);
    setRows(next);
    setUnassigned(result.unassigned);
    setUsedFallback(fallback);
    setOrganizing(false);
    if (next.length === 0) {
      toast({ title: "No encontramos datos para el formulario", description: "Cuente un poco más: gustos, familia, oficio, creencias…", variant: "destructive" });
    }
  };

  const updateRow = (field: LifeHistoryField, patch: Partial<Row>) =>
    setRows(prev => prev?.map(r => (r.field === field ? { ...r, ...patch } : r)) ?? null);

  const selected = rows?.filter(r => r.mode !== "omitir" && r.value.trim()) ?? [];

  const apply = () => {
    const values: Partial<LifeHistoryForm> = {};
    for (const r of selected) values[r.field] = mergeField(r.field, form[r.field], r.value, r.mode);
    onApply(values);
    setRows(null);
    setUnassigned("");
    setTranscript("");
    draft.clear();
    toast({ title: `✨ ${selected.length} campos completados desde el dictado`, description: "Revise el formulario y toque Guardar." });
  };

  // Paso 2: revisión campo por campo antes de pasar al formulario
  if (rows) {
    return (
      <section className="mb-6 rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <h3 className="text-base font-black text-foreground">Revise lo que organizó la IA</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Corrija lo que haga falta. Nada se guarda hasta que pase los campos al formulario y toque <b>Guardar</b>.
        </p>

        {usedFallback && (
          <div className="mb-4">
            <Notice tone="warning">
              La IA no respondió, así que repartimos el dictado por palabras clave. Revise con un poco más de cuidado cada campo.
            </Notice>
          </div>
        )}

        <div className="space-y-3">
          {rows.map(r => {
            const topic = LIFE_TOPICS.find(t => t.field === r.field)!;
            const current = form[r.field];
            return (
              <div key={r.field} className={`rounded-xl border-2 p-3 transition ${r.mode === "omitir" ? "border-border opacity-60" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase text-foreground">{topic.icon} {LIFE_HISTORY_FIELDS[r.field]}</span>
                  {current.trim() ? (
                    <ChoiceChips size="sm" options={MODE_OPTIONS} value={r.mode} onChange={mode => updateRow(r.field, { mode })} />
                  ) : (
                    <ChoiceChips size="sm" options={[{ value: "reemplazar" as MergeMode, label: "Usar" }, { value: "omitir" as MergeMode, label: "No usar" }]}
                      value={r.mode} onChange={mode => updateRow(r.field, { mode })} />
                  )}
                </div>
                {r.field === "morning_or_night" ? (
                  <select value={r.value} onChange={e => updateRow(r.field, { value: e.target.value })} className={inputCls} aria-label={LIFE_HISTORY_FIELDS[r.field]}>
                    {MORNING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <textarea value={r.value} onChange={e => updateRow(r.field, { value: e.target.value })} rows={Math.min(6, Math.max(2, Math.ceil(r.value.length / 70)))}
                    aria-label={LIFE_HISTORY_FIELDS[r.field]} className={`${inputCls} resize-y leading-relaxed`} />
                )}
                {r.evidence && <p className="mt-1.5 text-[11px] italic text-muted-foreground">🎙️ Se dijo: “{r.evidence}”</p>}
                {current.trim() && r.mode !== "omitir" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Ya tenía: “{current.length > 120 ? `${current.slice(0, 120)}…` : current}” {r.mode === "agregar" ? "→ se agrega al final" : "→ se reemplaza"}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {unassigned && (
          <div className="mt-4">
            <Notice tone="info">
              <b>Esto no encajó en ningún campo:</b> “{unassigned}”. Si es importante, cópielo en el campo que corresponda.
            </Notice>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={apply} disabled={selected.length === 0}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            <Check size={18} /> Pasar {selected.length} {selected.length === 1 ? "campo" : "campos"} al formulario
          </button>
          <button type="button" onClick={() => setRows(null)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-border px-5 text-sm font-bold text-foreground transition hover:border-primary/40">
            <RotateCcw size={16} /> Volver al dictado
          </button>
        </div>
      </section>
    );
  }

  // Paso 1: dictar
  return (
    <section className="mb-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-4 shadow-sm sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"><Mic size={18} /></span>
        <div>
          <h3 className="text-base font-black text-foreground">Dictar toda la historia</h3>
          <p className="text-xs text-muted-foreground">Converse con {residentName ? residentName.split(" ")[0] : "el residente"} o su familia y dicte todo seguido. La IA pone cada cosa en su lugar y usted revisa.</p>
        </div>
      </div>

      {/* Guía: temas de la conversación; se ponen en verde cuando ya se habló de ellos */}
      <div className="my-4 flex flex-wrap gap-1.5" aria-label="Temas de la historia de vida">
        {LIFE_TOPICS.map(t => {
          const done = covered.has(t.field) || !!form[t.field]?.trim();
          return (
            <span key={t.field} title={t.question}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${done ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-background text-muted-foreground"}`}>
              {done ? <Check size={12} strokeWidth={3} /> : <span aria-hidden>{t.icon}</span>} {t.short}
            </span>
          );
        })}
      </div>

      {suggestion && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-background/80 p-3 text-sm text-foreground">
          <MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-primary" />
          <span><span className="text-xs font-bold uppercase text-muted-foreground">Puede preguntar: </span>{suggestion.question}</span>
        </p>
      )}

      <DictationTextarea
        value={transcript}
        onChange={setTranscript}
        minRows={6}
        placeholder="Toque Dictar y cuente su historia. Ej: «Le gusta que le digan doña Rosa. Fue modista en Pasto toda la vida, es viuda y tiene tres hijos…»"
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={organize} disabled={organizing || transcript.trim().length < MIN_CHARS}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
          {organizing ? <><Loader2 size={18} className="animate-spin" /> Ordenando la historia…</> : <><Sparkles size={18} /> Organizar en el formulario</>}
        </button>
        {transcript && !organizing && (
          <button type="button" onClick={() => { setTranscript(""); draft.clear(); }}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-muted-foreground transition hover:text-destructive">
            <Trash2 size={14} /> Borrar dictado
          </button>
        )}
      </div>
      {draft.restoredAt && transcript && (
        <p className="mt-2 text-[11px] text-muted-foreground">💾 Recuperamos el dictado que dejó sin terminar el {draft.restoredAt.toLocaleString("es-CO")}.</p>
      )}
    </section>
  );
};

export default LifeHistoryDictation;
