import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFormDraft } from "@/hooks/useFormDraft";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import DraftNotice from "@/components/DraftNotice";
import SignaturePad from "@/components/SignaturePad";
import FormHistory from "@/components/FormHistory";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import { Section, Field, inputCls, ChoiceChips, CheckRow, ProgressLine, Notice } from "@/components/forms/ui";
import { ClipboardCheck, Thermometer, SprayCan, CheckCircle2, AlertTriangle } from "lucide-react";
import { todayLocal, numberOrNull } from "@/lib/form-helpers";
import { coldRangeFor, isColdSafe, fridgeShiftFor } from "@/lib/form-rules";
import { errorMessage } from "@/lib/errors";

interface Props { onBack: () => void; }

const CHECKLIST_ITEMS = [
  { key: 'used_ppe', label: 'Usé gorro, tapabocas y delantal limpio' },
  { key: 'respected_diets', label: 'Respeté las dietas especiales de cada residente' },
  { key: 'washed_produce', label: 'Lavé y desinfecté frutas y verduras' },
  { key: 'cleaned_kitchen', label: 'Limpié y desinfecté toda la cocina al terminar' },
] as const;

const FRIDGES = ['Nevera principal', 'Nevera medicamentos', 'Congelador'];
const DISINFECTION_AREAS = ['Mesones', 'Estufa', 'Lavaplatos', 'Pisos', 'Paredes', 'Campana extractora', 'Utensilios'];
const SHIFTS = [{ value: 'manana' as const, label: '☀️ Mañana' }, { value: 'tarde' as const, label: '🌇 Tarde' }];

interface KitchenDraft {
  checkDate: string;
  shift: 'manana' | 'tarde';
  checks: Record<string, boolean>;
  checkObs: string;
  temps: Record<string, { temp: string; notes: string }>;
  disinfection: Record<string, boolean>;
}

const emptyDraft = (): KitchenDraft => ({
  checkDate: todayLocal(),
  shift: fridgeShiftFor(new Date().getHours()),
  checks: {},
  checkObs: '',
  temps: Object.fromEntries(FRIDGES.map(f => [f, { temp: '', notes: '' }])),
  disinfection: {},
});

const isBlank = (d: KitchenDraft) =>
  !Object.values(d.checks).some(Boolean) && !d.checkObs &&
  !Object.values(d.temps).some(t => t.temp || t.notes) && !Object.values(d.disinfection).some(Boolean);

interface SavedToday { checklist: number; temps: string[]; disinfection: number }

const UnifiedKitchen = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<KitchenDraft>(emptyDraft);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedToday, setSavedToday] = useState<SavedToday | null>(null);
  const draft = useFormDraft('cocina-diaria', form, setForm, isBlank);
  const set = <K extends keyof KitchenDraft>(key: K, value: KitchenDraft[K]) => setForm(p => ({ ...p, [key]: value }));

  // What was already registered for this date, so nobody fills the same control twice
  const loadSavedToday = useCallback(async (date: string, shift: string) => {
    const [checklist, temps, disinfection] = await Promise.all([
      supabase.from('kitchen_checklists').select('id', { count: 'exact', head: true }).eq('check_date', date),
      supabase.from('fridge_temps').select('fridge_name').eq('record_date', date).eq('shift', shift),
      supabase.from('disinfection_records').select('id', { count: 'exact', head: true }).eq('record_date', date).eq('record_type', 'cocina').eq('completed', true),
    ]);
    setSavedToday({
      checklist: checklist.count ?? 0,
      temps: [...new Set((temps.data ?? []).map(t => t.fridge_name))],
      disinfection: disinfection.count ?? 0,
    });
  }, []);

  useEffect(() => { loadSavedToday(form.checkDate, form.shift); }, [form.checkDate, form.shift, loadSavedToday]);

  const checkedCount = CHECKLIST_ITEMS.filter(i => form.checks[i.key]).length;
  const disinfectedCount = DISINFECTION_AREAS.filter(a => form.disinfection[a]).length;
  const tempRows = useMemo(() => FRIDGES.flatMap(name => {
    const t = numberOrNull(form.temps[name]?.temp);
    return t === null ? [] : [{ name, temperature: t, safe: isColdSafe(name, t), notes: form.temps[name]?.notes || '' }];
  }), [form.temps]);
  const unsafeWithoutAction = tempRows.filter(r => !r.safe && !r.notes.trim()).map(r => r.name);
  const hasAnything = checkedCount > 0 || form.checkObs.trim() !== '' || tempRows.length > 0 || disinfectedCount > 0;

  const missing = [
    ...(hasAnything ? [] : ['marcar al menos un punto']),
    ...unsafeWithoutAction.map(n => `acción tomada en ${n}`),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const done: string[] = [];
    try {
      if (checkedCount > 0 || form.checkObs.trim()) {
        const { error } = await supabase.from('kitchen_checklists').insert({
          created_by: user.id, check_date: form.checkDate,
          used_ppe: !!form.checks.used_ppe, respected_diets: !!form.checks.respected_diets,
          washed_produce: !!form.checks.washed_produce, cleaned_kitchen: !!form.checks.cleaned_kitchen,
          observations: form.checkObs.trim() || null,
        });
        if (error) throw new Error(`Checklist: ${error.message}`);
        done.push('checklist');
      }
      if (tempRows.length) {
        const { error } = await supabase.from('fridge_temps').insert(tempRows.map(r => ({
          created_by: user.id, record_date: form.checkDate, fridge_name: r.name, shift: form.shift,
          temperature: r.temperature, is_safe: r.safe, notes: r.notes.trim() || null,
        })));
        if (error) throw new Error(`Temperaturas: ${error.message}`);
        done.push('temperaturas');
      }
      if (disinfectedCount > 0) {
        const { error } = await supabase.from('disinfection_records').insert(DISINFECTION_AREAS.map(area => ({
          created_by: user.id, record_date: form.checkDate, area,
          completed: !!form.disinfection[area], record_type: 'cocina', signature,
        })));
        if (error) throw new Error(`Desinfección: ${error.message}`);
        done.push('desinfección');
      }
      toast({ title: "Control de cocina guardado ✅", description: `Se guardó: ${done.join(', ')}.` });
      draft.clear();
      setForm({ ...emptyDraft(), checkDate: form.checkDate, shift: form.shift });
      setSignature(null);
      loadSavedToday(form.checkDate, form.shift);
    } catch (e) {
      // Parts already saved stay saved; say exactly which ones so nothing is entered twice
      toast({
        title: "No se pudo guardar todo",
        description: `${done.length ? `Ya quedó guardado: ${done.join(', ')}. ` : ''}${errorMessage(e)}`,
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const summary = [
    `Control Diario de Cocina — ${form.checkDate} (${form.shift === 'manana' ? 'mañana' : 'tarde'})`,
    ...CHECKLIST_ITEMS.map(i => `${form.checks[i.key] ? '✅' : '⬜'} ${i.label}`),
    ...tempRows.map(r => `🌡️ ${r.name}: ${r.temperature} °C ${r.safe ? '(seguro)' : '⚠️ FUERA DE RANGO'}${r.notes ? ` — ${r.notes}` : ''}`),
    `🧹 Desinfección: ${disinfectedCount}/${DISINFECTION_AREAS.length} áreas`,
    form.checkObs ? `Obs: ${form.checkObs}` : '',
  ].filter(Boolean).join('\n');

  return (
    <div className="animate-fade-in">
      <FormHeader title="Control Diario de Cocina" subtitle="Checklist, temperaturas y desinfección en un solo paso (HB-F5 · HB-F7 · HB-F8)" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(emptyDraft()); }} />

      <div ref={contentRef}>
        <Section>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input type="date" value={form.checkDate} max={todayLocal()} onChange={e => set('checkDate', e.target.value)} className={inputCls} />
            </Field>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Turno de temperaturas</span>
              <ChoiceChips options={SHIFTS} value={form.shift} onChange={v => set('shift', v)} />
            </div>
          </div>
          {savedToday && (savedToday.checklist > 0 || savedToday.temps.length > 0 || savedToday.disinfection > 0) && (
            <div className="mt-4">
              <Notice tone="success">
                <span className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <span>Ya registrado este día: {[
                    savedToday.checklist ? `checklist (${savedToday.checklist})` : '',
                    savedToday.temps.length ? `temperaturas de la ${form.shift === 'manana' ? 'mañana' : 'tarde'} (${savedToday.temps.join(', ')})` : '',
                    savedToday.disinfection ? `${savedToday.disinfection} áreas desinfectadas` : '',
                  ].filter(Boolean).join(' · ')}.</span>
                </span>
              </Notice>
            </div>
          )}
        </Section>

        <Section title="Buenas prácticas" icon={ClipboardCheck}
          actions={<button type="button" onClick={() => set('checks', Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.key, true])))}
            className="min-h-[36px] rounded-xl bg-muted px-3 text-xs font-bold text-foreground hover:bg-accent">Todo cumplido</button>}>
          <div className="mb-3"><ProgressLine done={checkedCount} total={CHECKLIST_ITEMS.length} label="puntos" /></div>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
              <CheckRow key={item.key} checked={!!form.checks[item.key]} onChange={v => set('checks', { ...form.checks, [item.key]: v })}>{item.label}</CheckRow>
            ))}
          </div>
          <textarea value={form.checkObs} onChange={e => set('checkObs', e.target.value)} placeholder="Observaciones (opcional)"
            rows={2} className={`${inputCls} mt-3 resize-none`} />
        </Section>

        <Section title="Temperaturas de neveras" icon={Thermometer} hint="Escribe solo las que mediste. Si alguna sale de rango, anota qué hiciste.">
          <div className="space-y-3">
            {FRIDGES.map(fridge => {
              const data = form.temps[fridge];
              const t = numberOrNull(data?.temp);
              const range = coldRangeFor(fridge);
              const safe = t === null ? null : isColdSafe(fridge, t);
              const alreadySaved = savedToday?.temps.includes(fridge);
              return (
                <div key={fridge} className={`rounded-xl border-2 p-3 transition ${safe === false ? 'border-destructive/40 bg-destructive/5' : safe ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">{fridge}</p>
                    <span className="text-[11px] text-muted-foreground">Seguro: {range.label}{alreadySaved ? ' · ya registrada ✓' : ''}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <div className="relative">
                      <input type="number" inputMode="decimal" step="0.1" value={data?.temp ?? ''} placeholder="°C"
                        aria-label={`Temperatura ${fridge}`}
                        onChange={e => set('temps', { ...form.temps, [fridge]: { ...data, temp: e.target.value } })}
                        className={`${inputCls} mt-0 text-center text-lg font-black`} />
                    </div>
                    <input value={data?.notes ?? ''} placeholder={safe === false ? '¿Qué acción tomaste? (obligatorio)' : 'Nota (opcional)'}
                      onChange={e => set('temps', { ...form.temps, [fridge]: { ...data, notes: e.target.value } })}
                      className={`${inputCls} mt-0 ${safe === false && !data?.notes ? 'border-destructive' : ''}`} />
                  </div>
                  {safe === false && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-bold text-destructive"><AlertTriangle size={14} /> Fuera de rango: revisa la puerta, ajusta el termostato y mueve los alimentos o medicamentos si hace falta.</p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Desinfección de cocina" icon={SprayCan}
          actions={<button type="button" onClick={() => set('disinfection', Object.fromEntries(DISINFECTION_AREAS.map(a => [a, true])))}
            className="min-h-[36px] rounded-xl bg-muted px-3 text-xs font-bold text-foreground hover:bg-accent">Marcar todas</button>}>
          <div className="mb-3"><ProgressLine done={disinfectedCount} total={DISINFECTION_AREAS.length} label="áreas" /></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DISINFECTION_AREAS.map(area => (
              <CheckRow key={area} checked={!!form.disinfection[area]} onChange={v => set('disinfection', { ...form.disinfection, [area]: v })}>{area}</CheckRow>
            ))}
          </div>
        </Section>

        <Section title="Firma del responsable de cocina">
          <SignaturePad label="Responsable de cocina" value={signature || undefined} onChange={setSignature} />
        </Section>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title="Control Diario Cocina" fileName={`cocina_${form.checkDate}`} textContent={summary} signatureDataUrl={signature} />
        <ShareButtons title="Control Diario Cocina" text={summary} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FormHistory tableName="kitchen_checklists" title="Historial Checklist Cocina" fileName="hist_checklist_cocina"
          columns={[
            { key: 'check_date', label: 'Fecha' },
            { key: 'used_ppe', label: 'EPP', render: (v) => v ? '✅' : '❌' },
            { key: 'respected_diets', label: 'Dietas', render: (v) => v ? '✅' : '❌' },
            { key: 'washed_produce', label: 'Lavado', render: (v) => v ? '✅' : '❌' },
            { key: 'cleaned_kitchen', label: 'Limpieza', render: (v) => v ? '✅' : '❌' },
            { key: 'observations', label: 'Obs' },
          ]}
          dateColumn="check_date"
          editableFields={[{ key: 'observations', label: 'Observaciones', type: 'text' }]}
        />
        <FormHistory tableName="fridge_temps" title="Historial Temperaturas" fileName="hist_temperaturas"
          columns={[
            { key: 'record_date', label: 'Fecha' },
            { key: 'fridge_name', label: 'Nevera' },
            { key: 'shift', label: 'Turno', render: (v) => v === 'manana' ? 'Mañana' : 'Tarde' },
            { key: 'temperature', label: '°C' },
            { key: 'is_safe', label: 'Segura', render: (v) => v ? '✅' : '⚠️' },
            { key: 'notes', label: 'Notas' },
          ]}
          dateColumn="record_date"
          editableFields={[{ key: 'notes', label: 'Notas', type: 'text' }]}
        />
        <FormHistory tableName="disinfection_records" title="Historial Desinfección" fileName="hist_desinfeccion"
          columns={[
            { key: 'record_date', label: 'Fecha' },
            { key: 'area', label: 'Área' },
            { key: 'completed', label: 'Completado', render: (v) => v ? '✅' : '❌' },
          ]}
          dateColumn="record_date"
          filters={[['record_type', 'eq', 'cocina']]}
        />
      </div>

      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default UnifiedKitchen;
