import { useState, useEffect, useRef, useCallback } from "react";
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
import { Section, Field, CheckRow, Notice, inputCls } from "@/components/forms/ui";
import { CalendarCheck, Truck } from "lucide-react";
import type { Row } from "@/integrations/supabase/tables";
import { todayLocal, monthLocal, weekOfMonth, weeksInMonth, blankToNull, MONTHS_ES } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

const CHECKS = [
  { key: 'packaging_ok', label: 'Embalaje limpio y sin daños' },
  { key: 'expiry_ok', label: 'Fechas de vencimiento vigentes' },
  { key: 'temperature_ok', label: 'Temperatura adecuada (fríos y congelados)' },
] as const;

type Reception = {
  reception_date: string; supplier: string; invoice_number: string; details: string;
  packaging_ok: boolean; expiry_ok: boolean; temperature_ok: boolean; signature: string | null;
};
const emptyReception = (): Reception => ({
  reception_date: todayLocal(), supplier: '', invoice_number: '', details: '',
  packaging_ok: false, expiry_ok: false, temperature_ok: false, signature: null,
});

const monthName = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_ES[m - 1]} ${y}`;
};

const FoodIntake = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(monthLocal());
  const [form, setForm] = useState<Reception>(emptyReception);
  const [records, setRecords] = useState<Row<"food_intake_records">[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const draft = useFormDraft('ingreso-alimentos', form, setForm, d => !d.supplier && !d.invoice_number && !d.details);

  const load = useCallback(() => {
    supabase.from('food_intake_records').select('*').eq('record_month', month).order('reception_date')
      .then(({ data }) => setRecords(data ?? []));
  }, [month]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from('food_intake_records').select('supplier').not('supplier', 'is', null).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setSuppliers([...new Set((data ?? []).map(d => d.supplier!).filter(Boolean))]));
  }, []);

  // The reception date decides the month and week it is filed under
  const set = <K extends keyof Reception>(k: K, v: Reception[K]) => setForm(p => ({ ...p, [k]: v }));
  const setDate = (d: string) => { set('reception_date', d); if (d) setMonth(d.slice(0, 7)); };

  const week = form.reception_date ? weekOfMonth(form.reception_date) : null;
  const weeks = Array.from({ length: weeksInMonth(month) }, (_, i) => i + 1);
  const byWeek = (w: number) => records.filter(r => r.week_number === w);
  const allOk = CHECKS.every(c => form[c.key]);
  const missing = [
    ...(form.reception_date ? [] : ['fecha de recepción']),
    ...(form.supplier.trim() ? [] : ['proveedor']),
    ...(!allOk && !form.details.trim() ? ['novedad (algo no cumple)'] : []),
    ...(form.signature ? [] : ['firma de quien recibe']),
  ];

  const handleSave = async () => {
    if (!user || missing.length || !week) return;
    setSaving(true);
    const { error } = await supabase.from('food_intake_records').insert({
      record_month: form.reception_date.slice(0, 7), week_number: week, reception_date: form.reception_date,
      supplier: form.supplier.trim(), invoice_number: blankToNull(form.invoice_number.trim()), details: blankToNull(form.details.trim()),
      packaging_ok: form.packaging_ok, expiry_ok: form.expiry_ok, temperature_ok: form.temperature_ok,
      signature: form.signature, created_by: user.id,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Recepción registrada ✅", description: `${form.supplier} · semana ${week}${allOk ? '' : ' · con novedad'}` });
      draft.clear();
      setForm(f => ({ ...emptyReception(), supplier: '', reception_date: f.reception_date }));
      load();
    }
    setSaving(false);
  };

  const text = `Ingreso de alimentos — ${monthName(month)}\n${records.map(r => `Sem ${r.week_number} (${r.reception_date}): ${r.supplier ?? ''}${r.invoice_number ? ` fact. ${r.invoice_number}` : ''} — ${r.packaging_ok && r.expiry_ok && r.temperature_ok ? 'Conforme' : `Novedad: ${r.details ?? ''}`}`).join('\n')}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F6: Ingreso de Alimentos" subtitle="Control de calidad de alimentos recibidos" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(emptyReception()); }} />

      <div ref={contentRef}>
        <Section title={`Recepciones de ${monthName(month)}`} icon={CalendarCheck}
          actions={<input type="month" value={month} max={monthLocal()} onChange={e => e.target.value && setMonth(e.target.value)} className="min-h-[40px] rounded-xl border border-input bg-background px-2 text-base sm:text-sm" />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {weeks.map(w => {
              const list = byWeek(w);
              const issue = list.some(r => !(r.packaging_ok && r.expiry_ok && r.temperature_ok));
              return (
                <div key={w} className={`rounded-xl border-2 p-2 text-center ${list.length ? issue ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10' : 'border-emerald-500/40 bg-emerald-500/5' : 'border-dashed border-border'}`}>
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Semana {w}</p>
                  <p className="text-sm font-black">{list.length ? `${list.length} ${list.length === 1 ? 'recepción' : 'recepciones'}` : 'Pendiente'}</p>
                  {list.map(r => <p key={r.id} className="truncate text-[11px] text-muted-foreground">{r.reception_date?.slice(8)} · {r.supplier}</p>)}
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <Section title="Nueva recepción" icon={Truck}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fecha de recepción" required hint={week ? `Se archiva en la semana ${week}` : undefined}>
            <input type="date" value={form.reception_date} max={todayLocal()} onChange={e => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Proveedor" required>
            <input list="hb-f6-suppliers" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Ej.: Plaza de mercado" className={inputCls} />
            <datalist id="hb-f6-suppliers">{suppliers.map(s => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="N° de factura">
            <input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="mb-2 mt-4 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Verificación</span>
          <button type="button" onClick={() => setForm(p => ({ ...p, packaging_ok: true, expiry_ok: true, temperature_ok: true }))}
            className="min-h-[36px] rounded-xl bg-muted px-3 text-xs font-bold hover:bg-accent">Todo conforme</button>
        </div>
        <div className="space-y-2">
          {CHECKS.map(c => <CheckRow key={c.key} checked={form[c.key]} onChange={v => set(c.key, v)}>{c.label}</CheckRow>)}
        </div>
        {!allOk && (form.packaging_ok || form.expiry_ok || form.temperature_ok) && (
          <div className="mt-3"><Notice tone="warning">Algo no cumple: describa la novedad y qué se hizo (devolución, cambio, descarte).</Notice></div>
        )}
        <div className="mt-4">
          <Field label={allOk ? 'Novedades (opcional)' : 'Novedad *'}>
            <textarea value={form.details} onChange={e => set('details', e.target.value)} rows={2} className={`${inputCls} resize-none`}
              placeholder="Ej.: 2 kg de pollo devueltos por temperatura" />
          </Field>
        </div>
        <div className="mt-4 flex justify-center">
          <SignaturePad label="Quien recibe" value={form.signature ?? undefined} onChange={v => set('signature', v)} />
        </div>
        <ActionButtons inline onFinish={handleSave} saving={saving} missing={missing} label="Registrar recepción" draftSavedAt={draft.savedAt} />
      </Section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title={`HB-F6 Ingreso Alimentos ${monthName(month)}`} fileName={`ingreso_alimentos_${month}`} textContent={text} />
        <ShareButtons title={`HB-F6 Ingreso Alimentos ${monthName(month)}`} text={text} />
      </div>
      <SmartReportSection module="alimentacion" formTitle="HB-F6: Ingreso Alimentos" formData={{ month, records }} contentRef={contentRef} />
    </div>
  );
};

export default FoodIntake;
