import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveResidents } from "@/hooks/useActiveResidents";
import { useFormDraft } from "@/hooks/useFormDraft";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import DraftNotice from "@/components/DraftNotice";
import FormHistory from "@/components/FormHistory";
import DictationTextarea from "@/components/DictationTextarea";
import { Section, Field, ChoiceChips, inputCls } from "@/components/forms/ui";
import { todayLocal } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const THERAPY_TYPES = ['Física', 'Ocupacional', 'Cognitiva', 'Lúdica', 'Musical', 'Artística', 'Social'];
const FREQUENCIES = [
  { value: 'diario', label: 'Diario' }, { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' }, { value: 'mensual', label: 'Mensual' },
];

/** Weekday name (Lunes…Domingo) of a YYYY-MM-DD date. */
const weekdayOf = (day: string) => DAYS[(new Date(`${day}T12:00:00`).getDay() + 6) % 7];

type SessionDraft = {
  therapyType: string; therapyName: string; sessionDate: string; sessionTime: string; selectedDays: string[];
  frequency: string; selectedResidents: string[]; attendeeObs: Record<string, string>; observations: string;
};
const newDraft = (): SessionDraft => {
  const today = todayLocal();
  return {
    therapyType: THERAPY_TYPES[0], therapyName: '', sessionDate: today, sessionTime: '09:00', selectedDays: [weekdayOf(today)],
    frequency: 'semanal', selectedResidents: [], attendeeObs: {}, observations: '',
  };
};

const TherapySessionForm = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { residents } = useActiveResidents();
  const [form, setForm] = useState<SessionDraft>(newDraft);
  const [saving, setSaving] = useState(false);
  const draft = useFormDraft('sesion-terapia', form, setForm, d => !d.therapyName && !d.selectedResidents.length && !d.observations);
  const set = <K extends keyof SessionDraft>(k: K, v: SessionDraft[K]) => setForm(f => ({ ...f, [k]: v }));

  const missing = [
    ...(form.therapyName.trim() ? [] : ['nombre de la actividad']),
    ...(form.selectedResidents.length ? [] : ['asistentes']),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const attendees = form.selectedResidents.map(id => ({
      resident_id: id, resident_name: residents.find(r => r.id === id)?.full_name,
      attended: true, observations: form.attendeeObs[id] || '',
    }));
    const { error } = await supabase.from('therapy_sessions').insert({
      therapy_name: `${form.therapyType}: ${form.therapyName.trim()}`, session_date: form.sessionDate,
      session_time: form.sessionTime || null, days_of_week: form.selectedDays, frequency: form.frequency,
      attendees, observations: form.observations.trim() || null, created_by: user.id,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Sesión de terapia guardada ✅", description: `${form.therapyType}: ${form.therapyName} · ${attendees.length} asistentes` });
      draft.clear();
      setForm(f => ({ ...newDraft(), therapyType: f.therapyType, therapyName: f.therapyName, selectedDays: f.selectedDays, frequency: f.frequency, sessionTime: f.sessionTime }));
    }
    setSaving(false);
  };

  const allSelected = residents.length > 0 && form.selectedResidents.length === residents.length;

  return (
    <div className="animate-fade-in">
      <FormHeader title="Sesión de Terapia" subtitle="Actividad grupal con asistencia y observaciones (HB-F9)" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(newDraft()); }} />

      <Section>
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tipo</span>
        <ChoiceChips size="sm" options={THERAPY_TYPES.map(t => ({ value: t, label: t }))} value={form.therapyType} onChange={v => set('therapyType', v)} />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Actividad" required className="sm:col-span-3">
            <input value={form.therapyName} onChange={e => set('therapyName', e.target.value)} placeholder="Ej.: Bailoterapia, estimulación de memoria" className={inputCls} />
          </Field>
          <Field label="Fecha">
            <input type="date" value={form.sessionDate} onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value, selectedDays: f.selectedDays.length ? f.selectedDays : [weekdayOf(e.target.value)] }))} className={inputCls} />
          </Field>
          <Field label="Hora">
            <input type="time" value={form.sessionTime} onChange={e => set('sessionTime', e.target.value)} className={inputCls} />
          </Field>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Frecuencia</span>
            <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={inputCls}>
              {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Días programados</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {DAYS.map(day => (
              <button key={day} type="button" aria-pressed={form.selectedDays.includes(day)}
                onClick={() => set('selectedDays', form.selectedDays.includes(day) ? form.selectedDays.filter(d => d !== day) : [...form.selectedDays, day])}
                className={`min-h-[40px] rounded-xl border-2 px-3 text-xs font-bold transition ${form.selectedDays.includes(day) ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={`Asistentes (${form.selectedResidents.length})`}
        actions={<button type="button" onClick={() => set('selectedResidents', allSelected ? [] : residents.map(r => r.id))}
          className="min-h-[36px] rounded-xl bg-muted px-3 text-xs font-bold hover:bg-accent">{allSelected ? 'Quitar todos' : 'Todos asistieron'}</button>}>
        <div className="space-y-2">
          {residents.map(r => {
            const selected = form.selectedResidents.includes(r.id);
            return (
              <div key={r.id} className={`rounded-xl border-2 p-2 transition ${selected ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                <label className="flex min-h-[40px] cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={selected} className="h-5 w-5 accent-primary"
                    onChange={e => set('selectedResidents', e.target.checked ? [...form.selectedResidents, r.id] : form.selectedResidents.filter(x => x !== r.id))} />
                  <span className="flex-1 text-sm font-medium text-foreground">{r.full_name}</span>
                </label>
                {selected && (
                  <input placeholder="¿Cómo participó? (opcional)" value={form.attendeeObs[r.id] || ''}
                    onChange={e => set('attendeeObs', { ...form.attendeeObs, [r.id]: e.target.value })} className={`${inputCls} mt-1`} />
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section>
        <DictationTextarea label="Observaciones generales" value={form.observations} onChange={v => set('observations', v)} minRows={3} />
      </Section>

      <FormHistory tableName="therapy_sessions" title="Historial de Sesiones" fileName="hist_sesiones_terapia" dateColumn="session_date"
        columns={[
          { key: 'session_date', label: 'Fecha' }, { key: 'session_time', label: 'Hora' }, { key: 'therapy_name', label: 'Actividad' },
          { key: 'attendees', label: 'Asistentes', render: (v) => Array.isArray(v) ? String(v.length) : '0' },
          { key: 'frequency', label: 'Frecuencia' },
        ]} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default TherapySessionForm;
