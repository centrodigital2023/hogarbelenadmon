import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveResidents } from "@/hooks/useActiveResidents";
import { useFormDraft } from "@/hooks/useFormDraft";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import DraftNotice from "@/components/DraftNotice";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";
import FormHistory from "@/components/FormHistory";
import DictationTextarea from "@/components/DictationTextarea";
import { Section, Field, ChoiceChips, CheckRow, Notice, ResidentSelect, inputCls } from "@/components/forms/ui";
import { appendPhrase } from "@/lib/nursing-notes";
import { dateTimeLocal } from "@/lib/form-helpers";
import { incidentGuidance } from "@/lib/form-rules";

interface Props { onBack: () => void; }

const TYPES = ['Caída desde su propia altura', 'Caída desde mobiliario', 'Casi caída', 'Error de medicación', 'Agresión', 'Otro'];
const CONSEQUENCES = ['Ninguna', 'Raspadura / Laceración', 'Hematoma / Inflamación', 'Posible fractura o pérdida de conciencia'];
const CAUSES = ['Piso húmedo', 'Calzado inadecuado', 'Sin acompañamiento', 'Mareo / hipotensión', 'Poca iluminación', 'Obstáculo en el camino', 'Sin barandas'];

type IncidentDraft = {
  resident_id: string; when: string; incident_type: string; description: string; consequences: string;
  cause_analysis: string; first_aid: boolean; family_notified: boolean; family_contact_name: string;
  transferred_to_er: boolean; er_facility: string;
};
const newDraft = (): IncidentDraft => ({
  resident_id: '', when: dateTimeLocal(), incident_type: '', description: '', consequences: '',
  cause_analysis: '', first_aid: false, family_notified: false, family_contact_name: '', transferred_to_er: false, er_facility: '',
});

const IncidentReport = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const [form, setForm] = useState<IncidentDraft>(newDraft);
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [recentFalls, setRecentFalls] = useState(0);
  const draft = useFormDraft('incidente', form, setForm, d => !d.resident_id && !d.incident_type && !d.description);
  const update = <K extends keyof IncidentDraft>(key: K, val: IncidentDraft[K]) => setForm(prev => ({ ...prev, [key]: val }));

  // Falls in the last 90 days: a repeated faller needs a prevention plan, not only a report
  useEffect(() => {
    if (!form.resident_id) { setRecentFalls(0); return; }
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
    supabase.from('incidents').select('id', { count: 'exact', head: true })
      .eq('resident_id', form.resident_id).ilike('incident_type', 'Caída%').gte('incident_datetime', since)
      .then(({ count }) => setRecentFalls(count ?? 0));
  }, [form.resident_id]);

  const guidance = incidentGuidance(form);
  const isFall = form.incident_type.startsWith('Caída');
  const missing = [
    ...(form.resident_id ? [] : ['residente']),
    ...(form.incident_type ? [] : ['tipo de evento']),
    ...(form.description.trim() ? [] : ['descripción']),
    ...(form.consequences ? [] : ['consecuencias']),
    ...(form.family_notified && !form.family_contact_name.trim() ? ['familiar contactado'] : []),
    ...(form.transferred_to_er && !form.er_facility.trim() ? ['IPS de urgencias'] : []),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { error } = await supabase.from('incidents').insert({
      resident_id: form.resident_id, created_by: user.id,
      incident_datetime: new Date(form.when).toISOString(),
      incident_type: form.incident_type, description: form.description.trim(), consequences: form.consequences,
      cause_analysis: form.cause_analysis.trim() || null,
      first_aid: form.first_aid, family_notified: form.family_notified,
      family_contact_name: form.family_notified ? form.family_contact_name.trim() : null,
      transferred_to_er: form.transferred_to_er, er_facility: form.transferred_to_er ? form.er_facility.trim() : null,
      corrective_actions: [
        form.first_aid && 'Se brindaron primeros auxilios',
        form.family_notified && `Se informó a la familia (${form.family_contact_name.trim()})`,
        form.transferred_to_er && `Se trasladó a urgencias (${form.er_facility.trim()})`,
      ].filter(Boolean),
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Incidente registrado ✅", description: isFall ? "Recuerde vigilar al residente las próximas 24 horas." : undefined });
      draft.clear();
      setForm(newDraft());
      setSignature(null);
    }
    setSaving(false);
  };

  const residentName = residents.find(r => r.id === form.resident_id)?.full_name || '';
  const summary = `HB-F20 Incidente — ${residentName}\n${new Date(form.when).toLocaleString('es-CO')}\nTipo: ${form.incident_type}\nConsecuencias: ${form.consequences}\n${form.description}\nCausa: ${form.cause_analysis}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F20: Incidentes y Caídas" subtitle="Registre el evento apenas el residente esté seguro" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(newDraft()); }} />

      <div ref={contentRef}>
        <Section>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Residente" required>
              <ResidentSelect residents={residents} loading={loading} value={form.resident_id} onChange={v => update('resident_id', v)} />
            </Field>
            <Field label="Fecha y hora del evento">
              <input type="datetime-local" value={form.when} max={dateTimeLocal()} onChange={e => update('when', e.target.value)} className={inputCls} />
            </Field>
          </div>
          {recentFalls > 0 && (
            <div className="mt-3"><Notice tone="warning">{residentName.split(' ')[0]} ya tiene {recentFalls} caída{recentFalls > 1 ? 's' : ''} en los últimos 90 días. Revise su plan de prevención (Tinetti, acompañamiento, calzado).</Notice></div>
          )}
          <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tipo de evento <span className="text-destructive">*</span></span>
            <ChoiceChips size="sm" options={TYPES.map(t => ({ value: t, label: t }))} value={form.incident_type} onChange={v => update('incident_type', v)} />
          </div>
        </Section>

        <Section>
          <DictationTextarea label="¿Qué pasó? *" value={form.description} onChange={v => update('description', v)} minRows={3}
            placeholder="Dónde estaba, qué hacía y cómo lo encontraron. Escribe o toca Dictar." />
          <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Consecuencias visibles <span className="text-destructive">*</span></span>
            <ChoiceChips size="sm" options={CONSEQUENCES.map(c => ({ value: c, label: c }))} value={form.consequences} onChange={v => update('consequences', v)} />
          </div>
          <div className="mt-4">
            <Field label="Análisis de causa">
              <textarea value={form.cause_analysis} onChange={e => update('cause_analysis', e.target.value)} rows={2}
                className={`${inputCls} resize-none`} placeholder="Ej.: piso húmedo, falta de barandas…" />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CAUSES.map(c => (
                <button key={c} type="button" onClick={() => update('cause_analysis', appendPhrase(form.cause_analysis, `${c}.`))}
                  disabled={form.cause_analysis.includes(c)}
                  className="min-h-[32px] rounded-full border border-border px-3 text-[11px] font-bold hover:border-primary disabled:border-emerald-300 disabled:bg-emerald-50 disabled:text-emerald-700">
                  {form.cause_analysis.includes(c) ? '✓ ' : '+ '}{c}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Acciones tomadas">
          {guidance.length > 0 && (
            <div className="mb-3 space-y-2">
              {guidance.map(g => <Notice key={g.text} tone={g.level}>{g.text}</Notice>)}
            </div>
          )}
          <div className="space-y-2">
            <CheckRow checked={form.first_aid} onChange={v => update('first_aid', v)}>Se brindaron primeros auxilios</CheckRow>
            <CheckRow checked={form.family_notified} onChange={v => update('family_notified', v)}>Se informó a la familia</CheckRow>
            {form.family_notified && (
              <input placeholder="¿Con quién habló?" value={form.family_contact_name} onChange={e => update('family_contact_name', e.target.value)} className={inputCls} />
            )}
            <CheckRow checked={form.transferred_to_er} onChange={v => update('transferred_to_er', v)}>Se trasladó a urgencias</CheckRow>
            {form.transferred_to_er && (
              <input placeholder="¿A qué IPS?" value={form.er_facility} onChange={e => update('er_facility', e.target.value)} className={inputCls} />
            )}
          </div>
        </Section>

        <Section title="Firma de quien reporta">
          <SignaturePad label="Responsable del turno" value={signature || undefined} onChange={setSignature} />
        </Section>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title={`HB-F20 Incidente ${residentName}`} fileName={`incidente_${residentName}`} textContent={summary} signatureDataUrl={signature} />
        <ShareButtons title={`HB-F20 Incidente ${residentName}`} text={summary} />
        <FormHistory tableName="incidents" title="Historial Incidentes" fileName="hist_incidentes"
          selectClause="*, residents(full_name)"
          columns={[
            { key: 'incident_datetime', label: 'Fecha', render: (v) => v ? new Date(String(v)).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '-' },
            { key: 'residents', label: 'Residente', render: (_v, row) => row.residents?.full_name || '-' },
            { key: 'incident_type', label: 'Tipo' },
            { key: 'consequences', label: 'Consecuencias' },
            { key: 'description', label: 'Descripción', render: (v) => String(v ?? '').slice(0, 60) || '-' },
          ]}
          dateColumn="incident_datetime"
          editableFields={[
            { key: 'description', label: 'Descripción', type: 'text' },
            { key: 'cause_analysis', label: 'Análisis', type: 'text' },
          ]}
        />
      </div>

      <SmartReportSection module="seguridad" formTitle="HB-F20: Incidentes y Caídas"
        residentId={form.resident_id} residentName={residentName} formData={form} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default IncidentReport;
