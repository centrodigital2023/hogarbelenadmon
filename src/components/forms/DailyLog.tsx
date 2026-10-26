import { useState, useEffect, useRef, useCallback } from "react";
import { useActiveResidents } from "@/hooks/useActiveResidents";
import { useFormDraft } from "@/hooks/useFormDraft";
import DraftNotice from "@/components/DraftNotice";
import VitalInputs, { emptyVitals, hasVitals, vitalColumns, vitalTypos, type VitalValues } from "@/components/forms/VitalInputs";
import { ChoiceChips } from "@/components/forms/ui";
import { todayLocal, shiftForHour, numberOrNull } from "@/lib/form-helpers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";
import DictationTextarea from "@/components/DictationTextarea";
import { Sparkles, Loader2, AlertTriangle, User, FileText, CheckCircle2, Minus, Plus } from "lucide-react";
import FormHistory from "@/components/FormHistory";
import type { HistoryColumn } from "@/components/FormHistory";
import { errorMessage } from "@/lib/errors";
import { vitalIssues } from "@/lib/vital-signs";
import { appendPhrase } from "@/lib/nursing-notes";

interface Props { onBack: () => void; }

const MOODS = ['😊 Alegre', '😌 Tranquilo', '😰 Ansioso', '😢 Triste', '😤 Agitado', '😶 Apático'];
const ELIMINATIONS = ['Continente', 'Incontinente', 'Estreñimiento', 'Normal', 'Diarrea'];
const SHIFTS = [
  { value: 'mañana', label: 'Mañana (7-12)' },
  { value: 'tarde', label: 'Tarde (12-18)' },
  { value: 'noche', label: 'Noche (18-7)' },
];
const NUTRITION_OPTIONS = ['0', '25', '50', '75', '100'].map(v => ({ value: v, label: `${v}%` }));
const RESPONSIBLE_ROLES = ['Auxiliar de Enfermería', 'Cuidadora de Turno'];
const VITAL_NOTE_PHRASES = ['Toma en reposo.', 'Se repite la toma para confirmar.', 'Se informa al médico tratante.'];
const NEWS_PHRASES = [
  { label: 'Sin novedades', text: 'Turno sin novedades, residente estable.' },
  { label: 'Durmió bien', text: 'Descansó y durmió tranquilo.' },
  { label: 'Comió completo', text: 'Consume la totalidad de sus alimentos.' },
  { label: 'Medicación OK', text: 'Recibe medicación formulada sin novedad.' },
  { label: 'Refiere dolor', text: 'Refiere dolor; se valora y se informa al profesional a cargo.' },
  { label: 'Visita familiar', text: 'Recibe visita familiar.' },
];
const phraseChip = 'shrink-0 min-h-[36px] rounded-full border border-border px-3 text-xs font-bold text-foreground transition hover:border-primary hover:bg-primary/5 active:scale-95 disabled:border-emerald-300 disabled:bg-emerald-50 disabled:text-emerald-700';

interface EntryData extends VitalValues {
  /** '' until someone chooses a percentage, so an untouched box is not saved as "ate 0 %". */
  nutrition_pct: string;
  hydration_glasses: string;
  elimination: string;
  mood: string;
  observations: string;
  vital_notes: string;
}

const newEntry = (): EntryData => ({
  ...emptyVitals(), nutrition_pct: '', hydration_glasses: '', elimination: '', mood: '', observations: '', vital_notes: '',
});

const entryHasData = (e?: EntryData) => !!e && (hasVitals(e) ||
  [e.nutrition_pct, e.hydration_glasses, e.elimination, e.mood, e.observations, e.vital_notes].some(v => v.trim() !== ''));

/** Values for the ai-nursing-notes function: numbers or null, never empty strings. */
const toLive = (e: EntryData) => ({
  ...vitalColumns(e), vital_notes: e.vital_notes, observations: e.observations, mood: e.mood, elimination: e.elimination,
  nutrition_pct: numberOrNull(e.nutrition_pct), hydration_glasses: numberOrNull(e.hydration_glasses),
});

interface LogDraft { logDate: string; shift: string; entries: Record<string, EntryData> }
const newDraft = (): LogDraft => ({ logDate: todayLocal(), shift: shiftForHour(new Date().getHours()), entries: {} });

const DailyLog = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents } = useActiveResidents();
  const [form, setForm] = useState<LogDraft>(newDraft);
  const { logDate, shift, entries } = form;
  const setShift = (v: string) => setForm(f => ({ ...f, shift: v }));
  const setLogDate = (v: string) => setForm(f => ({ ...f, logDate: v }));
  const draft = useFormDraft('bitacora', form, setForm, d => !Object.values(d.entries).some(entryHasData));
  const [loggedThisShift, setLoggedThisShift] = useState<Set<string>>(new Set());
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleRole, setResponsibleRole] = useState(RESPONSIBLE_ROLES[0]);
  const [responsibleManual, setResponsibleManual] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);

  // History - now using FormHistory component

  // Single resident report
  const [selectedResident, setSelectedResident] = useState('');
  const [singleReport, setSingleReport] = useState('');
  const [generatingSingle, setGeneratingSingle] = useState(false);
  const singleReportRef = useRef<HTMLDivElement>(null);

  // Residents already logged in this shift, so the team sees who is still pending
  const loadLogged = useCallback(async (date: string, s: string) => {
    const { data } = await supabase.from('daily_logs').select('resident_id').eq('log_date', date).eq('shift', s);
    setLoggedThisShift(new Set((data ?? []).map(r => r.resident_id)));
  }, []);
  useEffect(() => { loadLogged(logDate, shift); }, [logDate, shift, loadLogged]);

  // Set responsible name from current user
  useEffect(() => {
    if (user && !responsibleManual) {
      supabase.from('profiles').select('full_name').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setResponsibleName(data.full_name); });
    }
  }, [user, responsibleManual]);

  const updateEntry = (rid: string, field: keyof EntryData, val: string) => {
    setForm(f => ({ ...f, entries: { ...f.entries, [rid]: { ...(f.entries[rid] ?? newEntry()), [field]: val } } }));
  };

  const filled = Object.entries(entries).filter(([, e]) => entryHasData(e));
  const typoNames = filled.filter(([, e]) => vitalTypos(e).length > 0)
    .map(([rid]) => residents.find(r => r.id === rid)?.full_name.split(' ')[0] ?? 'residente');
  const missing = [
    ...(filled.length ? [] : ['datos de al menos un residente']),
    ...(responsibleName.trim() ? [] : ['nombre del responsable']),
    ...(typoNames.length ? [`revisar signos de ${typoNames.join(', ')}`] : []),
  ];

  const handleGenerateAI = async () => {
    if (!user) return;
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: { residentId: null, dateFrom: logDate, dateTo: logDate, shift, isConsolidated: true },
      });
      if (error) throw error;
      if (data?.note) setAiNote(data.note);
      else toast({ title: "Sin datos previos", description: "Guarde primero la bitácora y luego genere la nota con IA.", variant: "destructive" });
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e, "Error generando nota"), variant: "destructive" });
    }
    setGeneratingAI(false);
  };

  // History columns for FormHistory
  const historyColumns: HistoryColumn[] = [
    { key: 'log_date', label: 'Fecha' },
    { key: 'shift', label: 'Turno' },
    { key: 'resident_name', label: 'Residente', render: (_v, row) => row.residents?.full_name || '-' },
    { key: 'responsible_name', label: 'Responsable' },
    { key: 'blood_pressure', label: 'T.A.' },
    { key: 'spo2', label: 'SpO2' },
    { key: 'temperature', label: 'Temp' },
    { key: 'glucose', label: 'Gluc' },
    { key: 'heart_rate', label: 'FC' },
    { key: 'weight', label: 'Peso' },
    { key: 'nutrition_pct', label: 'Nutr%' },
    { key: 'mood', label: 'Ánimo' },
  ];

  const historyEditableFields = [
    { key: 'blood_pressure', label: 'T.A.', type: 'text' as const },
    { key: 'spo2', label: 'SpO2', type: 'number' as const },
    { key: 'temperature', label: 'Temp', type: 'number' as const },
    { key: 'glucose', label: 'Glucemia', type: 'number' as const },
    { key: 'heart_rate', label: 'FC', type: 'number' as const },
    { key: 'weight', label: 'Peso', type: 'number' as const },
    { key: 'observations', label: 'Novedades', type: 'text' as const },
    { key: 'mood', label: 'Ánimo', type: 'select' as const, options: MOODS },
  ];

  const historyExportTransform = (h: Record<string, unknown> & { residents?: { full_name?: string } | null }) => ({
    Fecha: h.log_date, Turno: h.shift,
    Residente: h.residents?.full_name || '',
    Responsable: h.responsible_name || '',
    'T.A.': h.blood_pressure || '', 'SpO2': h.spo2 || '', 'Temp °C': h.temperature || '',
    Glucemia: h.glucose || '', FC: h.heart_rate || '', 'Peso kg': h.weight || '',
    'Nutrición %': h.nutrition_pct, Hidratación: h.hydration_glasses,
    Eliminación: h.elimination, Ánimo: h.mood, Novedades: h.observations,
  });

  // Save: only residents with something written; empty boxes are stored as NULL
  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const inserts = filled.map(([rid, e]) => ({
      resident_id: rid, created_by: user.id, shift, log_date: logDate,
      ...vitalColumns(e),
      nutrition_pct: numberOrNull(e.nutrition_pct), hydration_glasses: numberOrNull(e.hydration_glasses) ?? 0,
      elimination: e.elimination || null, mood: e.mood || null, observations: e.observations.trim() || null,
      vital_notes: e.vital_notes.trim() || null, ai_nursing_note: aiNote || null,
      responsible_name: responsibleName.trim(), responsible_role: responsibleRole,
      signature: signatureData,
    }));
    const { error } = await supabase.from('daily_logs').insert(inserts);
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      const alerts = filled.filter(([, e]) => vitalIssues(e).length > 0).length;
      toast({
        title: "Bitácora guardada ✅",
        description: `${inserts.length} residente${inserts.length > 1 ? 's' : ''} · turno ${shift}${alerts ? ` · ${alerts} con signos de alerta` : ''}`,
      });
      draft.clear();
      setForm(f => ({ ...f, entries: {} }));
      loadLogged(logDate, shift);
    }
    setSaving(false);
  };

  // Single resident AI report
  const handleSingleReport = async () => {
    if (!selectedResident) return;
    setGeneratingSingle(true);
    try {
      const liveEntry = entries[selectedResident] ? toLive(entries[selectedResident]) : null;
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: {
          residentId: selectedResident,
          dateFrom: logDate,
          dateTo: logDate,
          shift,
          isConsolidated: false,
          liveEntry,
          responsibleName,
          responsibleRole,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.note) {
        toast({
          title: "Sin datos suficientes",
          description: "Diligencia signos vitales y bienestar del residente o guarda la bitácora antes de generar el informe.",
          variant: "destructive",
        });
        setGeneratingSingle(false);
        return;
      }
      setSingleReport(data.note);
    } catch (e) {
      toast({ title: "Error", description: errorMessage(e), variant: "destructive" });
    }
    setGeneratingSingle(false);
  };

  const saveSingleReport = async () => {
    if (!user || !selectedResident || !singleReport) return;
    const { error } = await supabase.from('nursing_notes').insert({
      resident_id: selectedResident, generated_by: user.id,
      note: singleReport, note_date: logDate, shift, is_ai_generated: true,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Informe guardado" });
  };

  const getTextContent = () => {
    const lines = [`HB-F4: Bitácora Diaria - ${logDate} - Turno: ${shift}\nResponsable: ${responsibleName} (${responsibleRole})\n`];
    filled.forEach(([rid, e]) => {
      const r = residents.find(res => res.id === rid);
      lines.push(`${r?.full_name}: TA ${e.blood_pressure}, SpO2 ${e.spo2}%, Temp ${e.temperature}°C, Gluc ${e.glucose}, FC ${e.heart_rate}, Peso ${e.weight}kg | Nutrición ${e.nutrition_pct}%, Hidratación ${e.hydration_glasses} vasos, Eliminación: ${e.elimination}, Ánimo: ${e.mood}, Obs: ${e.observations}`);
    });
    if (aiNote) lines.push(`\nNota IA:\n${aiNote}`);
    return lines.join('\n');
  };

  const getTableData = () => filled.map(([rid, e]) => {
    const r = residents.find(res => res.id === rid);
    return {
      Residente: r?.full_name || '', 'T.A.': e.blood_pressure, SpO2: e.spo2, 'Temp °C': e.temperature,
      Glucemia: e.glucose, FC: e.heart_rate, 'Peso kg': e.weight,
      'Nutrición %': e.nutrition_pct, Hidratación: e.hydration_glasses,
      Eliminación: e.elimination, Ánimo: e.mood, Novedades: e.observations,
    };
  });

  const selectedResidentName = residents.find(r => r.id === selectedResident)?.full_name || '';

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F4: Bitácora Diaria" subtitle="Registro por turnos de indicadores de salud, bienestar y signos vitales" onBack={onBack} />

      <div ref={contentRef}>
        <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(newDraft()); }} />
        {/* Header: Fecha, Turno, Responsable */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 mb-6">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Fecha</label>
              <input type="date" value={logDate} max={todayLocal()} onChange={e => setLogDate(e.target.value)}
                className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-input bg-background text-base sm:text-sm" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Turno</span>
              <ChoiceChips options={SHIFTS} value={shift} onChange={setShift} />
            </div>
          </div>

          {/* Responsible */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <User size={14} className="text-primary" />
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Responsable del turno</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <select value={responsibleRole} onChange={e => setResponsibleRole(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-input bg-background text-base sm:text-sm">
                {RESPONSIBLE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="text" value={responsibleName}
                  onChange={e => setResponsibleName(e.target.value)}
                  readOnly={!responsibleManual}
                  className={`w-full min-h-[44px] px-3 rounded-xl border border-input text-base sm:text-sm ${responsibleManual ? 'bg-background' : 'bg-muted'}`}
                  placeholder="Nombre del responsable" />
                <button type="button" onClick={() => setResponsibleManual(m => !m)}
                  className="shrink-0 min-h-[44px] px-3 rounded-xl bg-muted text-xs font-bold text-foreground hover:bg-accent">
                  {responsibleManual ? 'Usar mi nombre' : 'Cambiar'}
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3 mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground">
              {residents.filter(r => loggedThisShift.has(r.id)).length} de {residents.length} residentes ya registrados en este turno
            </p>
            <FormHistory
              tableName="daily_logs"
              columns={historyColumns}
              title="Historial Bitácora Diaria"
              fileName="historial_bitacora"
              days={180}
              dateColumn="log_date"
              selectClause="*, residents(full_name)"
              editableFields={historyEditableFields}
              exportTransform={historyExportTransform}
            />
          </div>
        </div>

        {/* Resident entries with vital signs */}
        <div className="space-y-4 mb-6">
          {residents.map(r => {
            const e = entries[r.id] ?? newEntry();
            const issues = vitalIssues(e);
            const done = loggedThisShift.has(r.id);
            return (
              <div key={r.id} className={`bg-card border-2 rounded-2xl p-4 sm:p-5 ${issues.length ? 'border-destructive/40' : entryHasData(e) ? 'border-primary/40' : 'border-border'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-black text-foreground">{r.full_name}</p>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {done && <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14} /> Ya registrado</span>}
                    {issues.length > 0 && <span className="flex items-center gap-1 text-destructive"><AlertTriangle size={14} /> {issues.join(' · ')}</span>}
                  </div>
                </div>

                <p className="text-[10px] font-bold text-primary uppercase mb-1">Signos vitales</p>
                <div className="mb-4">
                  <VitalInputs idPrefix={`log-${r.id}`} value={e} onChange={(k, v) => updateEntry(r.id, k, v)} />
                </div>

                <p className="text-[10px] font-bold text-primary uppercase mb-1">Bienestar</p>
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">¿Cuánto comió?</span>
                    <ChoiceChips size="sm" options={NUTRITION_OPTIONS} value={e.nutrition_pct}
                      onChange={v => updateEntry(r.id, 'nutrition_pct', e.nutrition_pct === v ? '' : v)} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Hidratación (vasos)</span>
                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" aria-label="Un vaso menos"
                        onClick={() => updateEntry(r.id, 'hydration_glasses', String(Math.max(0, (numberOrNull(e.hydration_glasses) ?? 0) - 1)))}
                        className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center hover:bg-accent"><Minus size={16} /></button>
                      <span className="w-10 text-center text-lg font-black">{e.hydration_glasses || '–'}</span>
                      <button type="button" aria-label="Un vaso más"
                        onClick={() => updateEntry(r.id, 'hydration_glasses', String(Math.min(20, (numberOrNull(e.hydration_glasses) ?? 0) + 1)))}
                        className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Plus size={16} /></button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Eliminación</span>
                    <ChoiceChips size="sm" options={ELIMINATIONS.map(v => ({ value: v, label: v }))} value={e.elimination}
                      onChange={v => updateEntry(r.id, 'elimination', e.elimination === v ? '' : v)} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Ánimo</span>
                    <ChoiceChips size="sm" options={MOODS.map(v => ({ value: v, label: v }))} value={e.mood}
                      onChange={v => updateEntry(r.id, 'mood', e.mood === v ? '' : v)} />
                  </div>
                </div>

                {/* Notas amplias con dictado por voz */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <DictationTextarea label="Notas de signos vitales" value={e.vital_notes} minRows={3}
                      onChange={v => updateEntry(r.id, 'vital_notes', v)}
                      placeholder="Ej.: toma en reposo, brazo izquierdo. Escribe o toca Dictar." />
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {VITAL_NOTE_PHRASES.map(p => (
                        <button key={p} type="button" className={phraseChip} disabled={e.vital_notes.includes(p)}
                          onClick={() => updateEntry(r.id, 'vital_notes', appendPhrase(e.vital_notes, p))}>
                          {e.vital_notes.includes(p) ? '✓ ' : '+ '}{p.replace(/\.$/, '')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <DictationTextarea label="Novedades del turno" value={e.observations} minRows={4}
                      onChange={v => updateEntry(r.id, 'observations', v)}
                      placeholder="Cuenta cómo estuvo el residente. Escribe o toca Dictar y habla con naturalidad." />
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {NEWS_PHRASES.map(p => (
                        <button key={p.label} type="button" className={phraseChip} disabled={e.observations.includes(p.text)}
                          onClick={() => updateEntry(r.id, 'observations', appendPhrase(e.observations, p.text))}>
                          {e.observations.includes(p.text) ? '✓ ' : '+ '}{p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Note */}
        <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> Nota de Enfermería con IA
            </h3>
            <button onClick={handleGenerateAI} disabled={generatingAI}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[36px]">
              {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {generatingAI ? 'Generando...' : 'Generar Nota'}
            </button>
          </div>
          <textarea value={aiNote} onChange={e => setAiNote(e.target.value)} rows={8}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
            placeholder="La nota se generará automáticamente con IA a partir de los registros del turno..." />
        </div>

        {/* Signature */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 flex flex-col items-center">
          <h3 className="text-sm font-black text-foreground mb-3">Firma Digital del Responsable</h3>
          <SignaturePad label={`${responsibleName} — ${responsibleRole}`} value={signatureData || undefined} onChange={setSignatureData} />
        </div>
      </div>

      {/* Export & Share */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <ExportButtons contentRef={contentRef} title={`HB-F4 Bitácora ${logDate}`} fileName={`bitacora_${logDate}_${shift}`}
          textContent={getTextContent()} data={getTableData()} signatureDataUrl={signatureData} />
        <ShareButtons title={`HB-F4 Bitácora ${logDate}`} text={getTextContent()} />
      </div>

      <SmartReportSection
        module="salud"
        formTitle="HB-F4: Bitácora Diaria"
        formData={{ entries, shift, log_date: logDate, responsible_name: responsibleName, responsible_role: responsibleRole }}
        contentRef={contentRef}
        responsibleName={responsibleName}
        responsibleRole={responsibleRole}
        dateFrom={logDate}
        dateTo={logDate}
        reportType="grupal"
      />

      {/* Single Resident Report */}
      <div className="bg-card border-2 border-accent rounded-2xl p-6 mt-6">
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-[11px] font-bold text-amber-900">🔒 NOTA INDIVIDUAL Y CONFIDENCIAL</p>
          <p className="text-[10px] text-amber-800 mt-1">Esta nota contendrá información EXCLUSIVA del residente seleccionado. Los datos no se mezclarán con otros residentes.</p>
        </div>
        <h3 className="text-sm font-black text-foreground flex items-center gap-2 mb-4">
          <FileText size={16} className="text-primary" /> Informe Individual con IA
        </h3>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Residente (selecciona uno)</label>
            <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">Seleccionar residente...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <button onClick={handleSingleReport} disabled={!selectedResident || generatingSingle}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[40px]">
            {generatingSingle ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Generar Informe
          </button>
        </div>

        {selectedResident && !singleReport && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-[10px] font-semibold text-blue-900">ℹ️ Informe para: <span className="font-bold">{selectedResidentName}</span></p>
            <p className="text-[10px] text-blue-800 mt-1">Cuando hagas clic en "Generar Informe", se recopilarán solo los datos de este residente.</p>
          </div>
        )}

        {singleReport && (
          <div ref={singleReportRef}>
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-[10px] font-bold text-green-900">✅ Informe Individual de: <span className="font-bold">{selectedResidentName}</span></p>
              <p className="text-[10px] text-green-800 mt-1">Nota confidencial generada. Contiene solo información de este residente.</p>
            </div>
            <textarea value={singleReport} onChange={e => setSingleReport(e.target.value)} rows={8}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none mb-4" />
            <div className="flex flex-wrap gap-2">
              <button onClick={saveSingleReport}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold min-h-[40px]">
                <FileText size={12} /> Guardar
              </button>
              <ExportButtons contentRef={singleReportRef} title={`Informe ${selectedResidentName} ${logDate}`}
                fileName={`informe_${selectedResidentName.replace(/\s+/g, '_')}_${logDate}`}
                textContent={singleReport} signatureDataUrl={signatureData} showDrive={false} />
              <ShareButtons title={`Informe ${selectedResidentName}`} text={singleReport} />
            </div>
          </div>
        )}
      </div>
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} count={filled.length} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default DailyLog;
