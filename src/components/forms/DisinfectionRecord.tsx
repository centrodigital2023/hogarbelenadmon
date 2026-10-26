import { useEffect, useRef, useState } from "react";
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
import FormHistory from "@/components/FormHistory";
import { Section, Field, inputCls, ChoiceChips, CheckRow, ProgressLine, Notice } from "@/components/forms/ui";
import { SprayCan } from "lucide-react";
import { todayLocal } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

const AREAS = {
  general: ['Lavamanos', 'Inodoros', 'Pisos', 'Puertas y ventanas', 'Paredes/techos', 'Áreas comunes', 'Lavandería', 'Nocheros', 'Camas', 'Tendidos', 'Pasamanos', 'Puntos ecológicos', 'Almacén'],
  cocina: ['Alacena', 'Comedor', 'Pisos cocina', 'Puertas y ventanas', 'Mesones', 'Equipos', 'Utensilios'],
};
type RecordType = keyof typeof AREAS;
const TYPES: { value: RecordType; label: string }[] = [
  { value: 'general', label: '🏠 General del hogar' },
  { value: 'cocina', label: '🍳 Cocina y comedor' },
];

interface DisinfectionDraft { recordType: RecordType; recordDate: string; checks: Record<string, boolean> }
const emptyDraft = (): DisinfectionDraft => ({ recordType: 'general', recordDate: todayLocal(), checks: {} });

const DisinfectionRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<DisinfectionDraft>(emptyDraft);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState<string[]>([]);
  const draft = useFormDraft('desinfeccion', form, setForm, d => !Object.values(d.checks).some(Boolean));

  const areas = AREAS[form.recordType];
  const completed = areas.filter(a => form.checks[a]);

  // Areas already disinfected this day, so the round can continue where it stopped
  useEffect(() => {
    supabase.from('disinfection_records').select('area').eq('record_date', form.recordDate)
      .eq('record_type', form.recordType).eq('completed', true)
      .then(({ data }) => setAlreadyDone([...new Set((data ?? []).map(r => r.area))]));
  }, [form.recordDate, form.recordType]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('disinfection_records').insert(areas.map(area => ({
      created_by: user.id, area, completed: !!form.checks[area],
      record_date: form.recordDate, record_type: form.recordType, signature,
    })));
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Desinfección registrada ✅", description: `${completed.length} de ${areas.length} áreas` });
      draft.clear();
      setAlreadyDone(prev => [...new Set([...prev, ...completed])]);
      setForm(f => ({ ...f, checks: {} }));
      setSignature(null);
    }
    setSaving(false);
  };

  const pending = areas.filter(a => !form.checks[a] && !alreadyDone.includes(a));
  const summary = `Desinfección ${form.recordType === 'cocina' ? 'cocina' : 'general'} — ${form.recordDate}\n${areas.map(a => `${form.checks[a] ? '✅' : '⬜'} ${a}`).join('\n')}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F8a1: Limpieza y Desinfección" subtitle="Marca cada área a medida que la desinfectas" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(emptyDraft()); }} />

      <div ref={contentRef}>
        <Section>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Zona</span>
              <ChoiceChips options={TYPES} value={form.recordType} onChange={v => setForm(f => ({ ...f, recordType: v, checks: {} }))} />
            </div>
            <Field label="Fecha">
              <input type="date" value={form.recordDate} max={todayLocal()} onChange={e => setForm(f => ({ ...f, recordDate: e.target.value }))} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section title="Áreas" icon={SprayCan}
          actions={<button type="button" onClick={() => setForm(f => ({ ...f, checks: Object.fromEntries(areas.map(a => [a, true])) }))}
            className="min-h-[36px] rounded-xl bg-muted px-3 text-xs font-bold text-foreground hover:bg-accent">Marcar todas</button>}>
          <div className="mb-3"><ProgressLine done={completed.length} total={areas.length} label="áreas" /></div>
          {alreadyDone.length > 0 && (
            <div className="mb-3"><Notice tone="success">Hoy ya se registraron: {alreadyDone.join(', ')}.{pending.length ? ` Faltan: ${pending.join(', ')}.` : ' ¡Ronda completa!'}</Notice></div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {areas.map(area => (
              <CheckRow key={area} checked={!!form.checks[area]} onChange={v => setForm(f => ({ ...f, checks: { ...f.checks, [area]: v } }))}>
                {area}{alreadyDone.includes(area) && <span className="ml-1 text-[11px] text-emerald-700"> · ya hecho hoy</span>}
              </CheckRow>
            ))}
          </div>
        </Section>

        <Section title="Firma del responsable">
          <SignaturePad label="Responsable" value={signature || undefined} onChange={setSignature} />
        </Section>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title="HB-F8a1 Desinfección" fileName={`desinfeccion_${form.recordType}_${form.recordDate}`} textContent={summary} signatureDataUrl={signature} />
        <ShareButtons title="HB-F8a1 Desinfección" text={summary} />
        <FormHistory tableName="disinfection_records" title="Historial Desinfección" fileName="hist_desinfeccion_general"
          columns={[
            { key: 'record_date', label: 'Fecha' },
            { key: 'record_type', label: 'Zona' },
            { key: 'area', label: 'Área' },
            { key: 'completed', label: 'Hecho', render: (v) => v ? '✅' : '❌' },
          ]}
          dateColumn="record_date"
        />
      </div>
      <SmartReportSection module="higiene" formTitle="HB-F8a1: Desinfección" formData={{ recordType: form.recordType, checks: form.checks }} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={completed.length ? [] : ['marcar al menos un área']} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default DisinfectionRecord;
