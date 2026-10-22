import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDictation } from "@/hooks/useDictation";
import { ROLE_LABELS } from "@/hooks/usePermissions";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SignaturePad from "@/components/SignaturePad";
import {
  Sparkles, Loader2, Save, Calendar, ChevronDown, ChevronUp, Search, Check, AlertTriangle, Mic, MicOff,
  Wand2, Undo2, Eye, Pencil, Minus, Plus, X, Users, User, Heart, Activity, MessageSquareText, FileText,
  ArrowRight, Copy, ShieldAlert, Utensils,
} from "lucide-react";
import { errorMessage } from "@/lib/errors";
import { isVitalAbnormal } from "@/lib/vital-signs";
import {
  SHIFTS, MOODS, ELIMINATIONS, NUTRITION_STEPS, QUICK_PHRASES, type Shift, type NoteEntry,
  shiftForHour, localDateISO, emptyNoteEntry, appendPhrase, entryAlerts, completedSections, composeQuickNote,
  toLiveEntry, toDailyLog, hasVitals, hasWellbeing, relativeDay, initials, noteToHtml,
} from "@/lib/nursing-notes";
import type { Row } from "@/integrations/supabase/tables";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; photo_url: string | null; allergies: string | null; special_diet: string | null; }
interface LastVitals { date: string; blood_pressure: string | null; spo2: number | null; temperature: number | null; heart_rate: number | null; glucose: number | null; weight: number | null; }
interface Draft { entry: NoteEntry; note: string; date: string; shift: Shift; }

const DRAFT_PREFIX = "hb-nursing-note-draft:";
const readDraft = (rid: string): Draft | null => {
  try { const raw = localStorage.getItem(DRAFT_PREFIX + rid); return raw ? JSON.parse(raw) as Draft : null; } catch { return null; }
};
const writeDraft = (rid: string, d: Draft | null) => {
  try { if (d) localStorage.setItem(DRAFT_PREFIX + rid, JSON.stringify(d)); else localStorage.removeItem(DRAFT_PREFIX + rid); } catch { /* sin almacenamiento */ }
};

const chip = (active: boolean) =>
  `min-h-[44px] px-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-foreground hover:border-primary/50"}`;

const SectionCard = ({ step, title, icon: Icon, done, children, hint }: { step: number; title: string; icon: typeof Heart; done: boolean; hint?: string; children: React.ReactNode }) => (
  <section className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
        {done ? <Check size={16} /> : step}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 text-base font-black text-foreground"><Icon size={16} className="text-primary" /> {title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
    {children}
  </section>
);

const VitalField = ({ label, unit, value, onChange, field, last, placeholder }: { label: string; unit: string; value: string; onChange: (v: string) => void; field: string; last?: number | null; placeholder: string }) => {
  const abnormal = isVitalAbnormal(field, value);
  return (
    <label className={`block rounded-xl border-2 p-2.5 transition-colors ${abnormal ? "border-destructive bg-destructive/5" : "border-border bg-background focus-within:border-primary"}`}>
      <span className="flex items-center justify-between text-[11px] font-bold uppercase text-muted-foreground">
        {label} {abnormal && <AlertTriangle size={12} className="text-destructive" />}
      </span>
      <span className="flex items-baseline gap-1">
        <input inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-xl font-black text-foreground outline-none placeholder:text-muted-foreground/40" />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </span>
      {last != null && <span className="block text-[10px] text-muted-foreground">Último: {last}</span>}
    </label>
  );
};

const NursingNotes = ({ onBack }: Props) => {
  const { user, profile, roles } = useAuth();
  const { toast } = useToast();
  const noteRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"individual" | "turno">("individual");
  const [residents, setResidents] = useState<Resident[]>([]);
  const [search, setSearch] = useState("");
  const [residentId, setResidentId] = useState("");
  const [date, setDate] = useState(localDateISO());
  const [dateTo, setDateTo] = useState(localDateISO());
  const [shift, setShift] = useState<Shift>(shiftForHour(new Date().getHours()));
  const [entry, setEntry] = useState<NoteEntry>(emptyNoteEntry());
  const [note, setNote] = useState("");
  const [previousNote, setPreviousNote] = useState<string | null>(null);
  const [noteSource, setNoteSource] = useState<"manual" | "ai" | "quick">("manual");
  const [preview, setPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alsoLog, setAlsoLog] = useState(true);
  const [signature, setSignature] = useState<string | null>(null);
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleRole, setResponsibleRole] = useState("");
  const [history, setHistory] = useState<Row<"nursing_notes">[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastVitals, setLastVitals] = useState<LastVitals | null>(null);
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set());
  const [justSaved, setJustSaved] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSavedNote, setLastSavedNote] = useState<string | null>(null);

  const resident = residents.find(r => r.id === residentId);
  const alerts = useMemo(() => entryAlerts(entry), [entry]);
  const sections = completedSections(entry, note);
  const progress = Object.values(sections).filter(Boolean).length;

  useEffect(() => {
    supabase.from('residents').select('id, full_name, photo_url, allergies, special_diet').in('status', ['prueba', 'permanente'])
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (profile?.full_name && !responsibleName) setResponsibleName(profile.full_name);
    if (roles.length && !responsibleRole) setResponsibleRole(ROLE_LABELS[roles[0]] ?? roles[0]);
  }, [profile, roles, responsibleName, responsibleRole]);

  // Residentes que ya tienen nota en la fecha elegida
  const loadDoneToday = useCallback(() => {
    supabase.from('nursing_notes').select('resident_id').eq('note_date', date).eq('is_consolidated', false)
      .then(({ data }) => setDoneToday(new Set((data || []).map(n => n.resident_id).filter((id): id is string => !!id))));
  }, [date]);
  useEffect(() => { loadDoneToday(); }, [loadDoneToday]);

  const loadHistory = useCallback(() => {
    const since = new Date(); since.setDate(since.getDate() - 30);
    let query = supabase.from('nursing_notes').select('*').gte('created_at', since.toISOString())
      .order('created_at', { ascending: false }).limit(50);
    if (mode === "turno") query = query.eq('is_consolidated', true);
    else if (residentId) query = query.eq('resident_id', residentId);
    else { setHistory([]); return; }
    query.then(({ data }) => { if (data) setHistory(data); });
  }, [residentId, mode]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Últimos signos vitales del residente (bitácora o HB-F16, el más reciente)
  useEffect(() => {
    setLastVitals(null);
    if (!residentId) return;
    Promise.all([
      supabase.from('daily_logs').select('log_date, blood_pressure, spo2, temperature, heart_rate, glucose, weight')
        .eq('resident_id', residentId).or('blood_pressure.not.is.null,heart_rate.not.is.null,temperature.not.is.null')
        .order('log_date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('vital_signs').select('record_date, blood_pressure, spo2, temperature, heart_rate, glucose, weight')
        .eq('resident_id', residentId).order('record_date', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([logRes, vsRes]) => {
      const a = logRes.data ? { ...logRes.data, date: logRes.data.log_date } : null;
      const b = vsRes.data ? { ...vsRes.data, date: vsRes.data.record_date } : null;
      setLastVitals(a && b ? (a.date >= b.date ? a : b) : a || b);
    });
  }, [residentId]);

  // Borrador automático por residente
  useEffect(() => {
    if (mode !== "individual" || !residentId) return;
    const empty = !note.trim() && !hasVitals(entry) && !hasWellbeing(entry) && !entry.observations.trim();
    const t = setTimeout(() => writeDraft(residentId, empty ? null : { entry, note, date, shift }), 600);
    return () => clearTimeout(t);
  }, [mode, residentId, entry, note, date, shift]);

  const selectResident = (id: string) => {
    setResidentId(id);
    setJustSaved(false);
    setLastSavedNote(null);
    setPreviousNote(null);
    setWarnings([]);
    setExpandedId(null);
    const draft = id ? readDraft(id) : null;
    if (draft && draft.date === localDateISO()) {
      setEntry({ ...emptyNoteEntry(), ...draft.entry });
      setNote(draft.note);
      setShift(draft.shift);
      setDraftRestored(true);
    } else {
      setEntry(emptyNoteEntry());
      setNote("");
      setDraftRestored(false);
    }
    setNoteSource("manual");
    setPreview(false);
    if (id) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const discardDraft = () => {
    writeDraft(residentId, null);
    setEntry(emptyNoteEntry());
    setNote("");
    setDraftRestored(false);
  };

  const set = <K extends keyof NoteEntry>(key: K, value: NoteEntry[K]) => setEntry(prev => ({ ...prev, [key]: value }));

  const addPhrase = (text: string, warning?: string) => {
    set('observations', appendPhrase(entry.observations, text));
    if (warning) setWarnings(prev => prev.includes(warning) ? prev : [...prev, warning]);
  };

  const dictation = useDictation(text => setEntry(prev => ({ ...prev, observations: appendPhrase(prev.observations, text) })));

  const replaceNote = (text: string, source: "ai" | "quick") => {
    if (note.trim()) setPreviousNote(note);
    setNote(text);
    setNoteSource(source);
    setPreview(true);
  };

  const quickNote = () => {
    if (!resident) return;
    replaceNote(composeQuickNote(entry, { residentName: resident.full_name, shift, date, responsibleName, responsibleRole }), "quick");
  };

  const generateAI = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const individual = mode === "individual";
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: individual
          ? { residentId, dateFrom: date, dateTo: date, shift, isConsolidated: false, liveEntry: toLiveEntry(entry), responsibleName, responsibleRole }
          : { residentId: null, dateFrom: date, dateTo, shift, isConsolidated: true, responsibleName, responsibleRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.note) replaceNote(data.note, "ai");
      else toast({ title: "Sin datos", description: individual ? "Registra signos vitales, bienestar o novedades para redactar la nota." : "No hay bitácoras guardadas en ese periodo.", variant: "destructive" });
    } catch (e) {
      toast({ title: "No se pudo redactar con IA", description: `${errorMessage(e, "Intenta de nuevo")}. Puedes usar "Nota rápida" mientras tanto.`, variant: "destructive" });
    }
    setGenerating(false);
  };

  const saveNote = async () => {
    if (!user || !note.trim()) return;
    setSaving(true);
    const individual = mode === "individual";
    const { error } = await supabase.from('nursing_notes').insert({
      resident_id: individual ? residentId : null,
      note_date: date,
      note,
      shift,
      generated_by: user.id,
      is_ai_generated: noteSource === "ai",
      is_consolidated: !individual,
    });
    if (error) {
      toast({ title: "No se guardó la nota", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    let logMsg = "";
    if (individual && alsoLog && (hasVitals(entry) || hasWellbeing(entry))) {
      const { error: logError } = await supabase.from('daily_logs').insert(
        toDailyLog(entry, { residentId, userId: user.id, shift, date, responsibleName, responsibleRole, note, signature }),
      );
      logMsg = logError ? ` La bitácora no se actualizó: ${logError.message}` : " Signos y bienestar quedaron en la Bitácora HB-F4.";
    }
    setLastSavedNote(note);
    toast({ title: "✅ Nota guardada", description: `${individual ? resident?.full_name ?? "" : "Nota del turno"}.${logMsg}` });
    if (individual) {
      writeDraft(residentId, null);
      setJustSaved(true);
      setDraftRestored(false);
      loadDoneToday();
    }
    loadHistory();
    setSaving(false);
  };

  const nextResident = useMemo(() => {
    const idx = residents.findIndex(r => r.id === residentId);
    const rest = [...residents.slice(idx + 1), ...residents.slice(0, idx)];
    return rest.find(r => !doneToday.has(r.id)) ?? null;
  }, [residents, residentId, doneToday]);

  const filtered = residents.filter(r => r.full_name.toLowerCase().includes(search.trim().toLowerCase()));
  const pendingCount = residents.filter(r => !doneToday.has(r.id)).length;
  const alreadySaved = lastSavedNote !== null && lastSavedNote === note;
  const canSave = !!note.trim() && (mode === "turno" || !!residentId) && !saving && !alreadySaved;
  const hasContent = hasVitals(entry) || hasWellbeing(entry) || !!entry.observations.trim();

  const copyNote = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: "Nota copiada" }); }
    catch { toast({ title: "No se pudo copiar", variant: "destructive" }); }
  };

  const bp = entry.blood_pressure.split("/");
  const setBp = (sys: string, dia: string) => set('blood_pressure', sys || dia ? `${sys}/${dia}` : "");

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-4 pb-40 lg:pb-24">
      <FormHeader title="Notas de Enfermería" subtitle="Registra el turno en pocos toques. La IA redacta por ti." onBack={onBack} />

      {/* Modo */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        {([["individual", "Por residente", User], ["turno", "Nota del turno", Users]] as const).map(([value, label, Icon]) => (
          <button key={value} onClick={() => { setMode(value); setNote(""); setPreviousNote(null); setJustSaved(false); }}
            aria-pressed={mode === value}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${mode === value ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Fecha y turno */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[140px]">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">{mode === "turno" ? "Desde" : "Fecha"}</span>
            <input type="date" value={date} max={localDateISO()} onChange={e => setDate(e.target.value)}
              className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-input bg-background text-sm" />
          </label>
          {mode === "turno" && (
            <label className="flex-1 min-w-[140px]">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">Hasta</span>
              <input type="date" value={dateTo} min={date} max={localDateISO()} onChange={e => setDateTo(e.target.value)}
                className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-input bg-background text-sm" />
            </label>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SHIFTS.map(s => (
            <button key={s.value} onClick={() => setShift(s.value)} aria-pressed={shift === s.value} className={chip(shift === s.value)}>
              <span className="block leading-tight">{s.icon} {s.label}</span>
              <span className="block text-[10px] font-medium opacity-70">{s.hours}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === "individual" && !resident && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-black text-foreground">¿A quién vas a registrar?</h3>
            {residents.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                {pendingCount} sin nota {date === localDateISO() ? "hoy" : "ese día"}
              </span>
            )}
          </div>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar residente..."
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto">
            {filtered.map(r => {
              const done = doneToday.has(r.id);
              const hasDraft = readDraft(r.id)?.date === localDateISO();
              return (
                <button key={r.id} onClick={() => selectResident(r.id)}
                  className="flex items-center gap-3 rounded-xl border border-border p-2.5 text-left transition hover:border-primary hover:bg-primary/5 active:scale-[0.98]">
                  {r.photo_url
                    ? <img src={r.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">{initials(r.full_name)}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">{r.full_name}</span>
                    <span className="flex gap-1.5 text-[10px]">
                      {done && <span className="font-bold text-emerald-600">✓ Con nota</span>}
                      {hasDraft && !done && <span className="font-bold text-amber-600">Borrador</span>}
                      {r.allergies && <span className="font-bold text-destructive">Alergias</span>}
                    </span>
                  </span>
                  {done ? <Check size={18} className="text-emerald-500" /> : <ArrowRight size={16} className="text-muted-foreground" />}
                </button>
              );
            })}
            {filtered.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">No hay residentes con ese nombre.</p>}
          </div>
        </div>
      )}

      {mode === "individual" && resident && (
        <>
          {/* Ficha del residente */}
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm">
            <div className="flex items-center gap-3">
              {resident.photo_url
                ? <img src={resident.photo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-black text-primary">{initials(resident.full_name)}</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-foreground">{resident.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {lastVitals ? `Últimos signos: ${relativeDay(lastVitals.date)}` : "Sin signos vitales previos"}
                  {history[0] && ` · Última nota: ${relativeDay(history[0].note_date)}`}
                </p>
              </div>
              <button onClick={() => selectResident("")} className="min-h-[40px] rounded-xl border border-border px-3 text-xs font-bold text-foreground hover:bg-muted">Cambiar</button>
            </div>
            {(resident.allergies || resident.special_diet) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {resident.allergies && <span className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-[11px] font-bold text-destructive"><ShieldAlert size={12} /> Alergias: {resident.allergies}</span>}
                {resident.special_diet && <span className="flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"><Utensils size={12} /> Dieta: {resident.special_diet}</span>}
              </div>
            )}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`${progress} de 4 secciones`}>
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(progress / 4) * 100}%` }} />
            </div>
          </div>

          {draftRestored && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <span>📝 Recuperamos el borrador que dejaste sin guardar.</span>
              <button onClick={discardDraft} className="font-bold underline">Empezar de cero</button>
            </div>
          )}

          {justSaved ? (
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-500/40 dark:bg-emerald-500/10">
              <p className="text-4xl">✅</p>
              <p className="mt-2 text-lg font-black text-foreground">Nota de {resident.full_name} guardada</p>
              <p className="text-sm text-muted-foreground">{pendingCount > 0 ? `Quedan ${pendingCount} residentes sin nota.` : "¡Todos los residentes tienen nota! 🎉"}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {nextResident && (
                  <button onClick={() => selectResident(nextResident.id)} className="flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">
                    Siguiente: {nextResident.full_name.split(" ")[0]} <ArrowRight size={16} />
                  </button>
                )}
                <button onClick={() => setJustSaved(false)} className="min-h-[48px] rounded-xl border border-border px-5 text-sm font-bold text-foreground">Ver la nota</button>
              </div>
            </div>
          ) : (
            <>
              <SectionCard step={1} title="Signos vitales" icon={Activity} done={sections.vitals} hint="Solo los que tomaste. Te avisamos si algo está fuera de rango.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className={`col-span-2 sm:col-span-1 rounded-xl border-2 p-2.5 ${isVitalAbnormal('blood_pressure', entry.blood_pressure) ? "border-destructive bg-destructive/5" : "border-border bg-background focus-within:border-primary"}`}>
                    <span className="flex items-center justify-between text-[11px] font-bold uppercase text-muted-foreground">
                      Tensión arterial {isVitalAbnormal('blood_pressure', entry.blood_pressure) && <AlertTriangle size={12} className="text-destructive" />}
                    </span>
                    <span className="flex items-baseline gap-1">
                      <input inputMode="numeric" aria-label="Sistólica" value={bp[0] ?? ""} onChange={e => setBp(e.target.value, bp[1] ?? "")} placeholder="120"
                        className="w-full min-w-0 bg-transparent text-xl font-black outline-none placeholder:text-muted-foreground/40" />
                      <span className="text-xl font-black text-muted-foreground">/</span>
                      <input inputMode="numeric" aria-label="Diastólica" value={bp[1] ?? ""} onChange={e => setBp(bp[0] ?? "", e.target.value)} placeholder="80"
                        className="w-full min-w-0 bg-transparent text-xl font-black outline-none placeholder:text-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground">mmHg</span>
                    </span>
                    {lastVitals?.blood_pressure && <span className="block text-[10px] text-muted-foreground">Último: {lastVitals.blood_pressure}</span>}
                  </div>
                  <VitalField label="Frec. cardiaca" unit="lpm" field="heart_rate" placeholder="72" value={entry.heart_rate} onChange={v => set('heart_rate', v)} last={lastVitals?.heart_rate} />
                  <VitalField label="Temperatura" unit="°C" field="temperature" placeholder="36.5" value={entry.temperature} onChange={v => set('temperature', v)} last={lastVitals?.temperature} />
                  <VitalField label="SpO2" unit="%" field="spo2" placeholder="95" value={entry.spo2} onChange={v => set('spo2', v)} last={lastVitals?.spo2} />
                  <VitalField label="Glucemia" unit="mg/dl" field="glucose" placeholder="100" value={entry.glucose} onChange={v => set('glucose', v)} last={lastVitals?.glucose} />
                  <VitalField label="Peso" unit="kg" field="weight" placeholder="60" value={entry.weight} onChange={v => set('weight', v)} last={lastVitals?.weight} />
                </div>
                {alerts.length > 0 && (
                  <div role="alert" className="mt-3 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Fuera de rango: {alerts.join(" · ")}</p>
                      <p className="text-xs">Verifica la toma y avisa al profesional a cargo. La alerta quedará en la nota.</p>
                    </div>
                  </div>
                )}
              </SectionCard>

              <SectionCard step={2} title="Bienestar" icon={Heart} done={sections.wellbeing} hint="Toca para elegir.">
                <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">Estado de ánimo</p>
                <div className="mb-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {MOODS.map(m => (
                    <button key={m.value} onClick={() => set('mood', entry.mood === m.value ? "" : m.value)} aria-pressed={entry.mood === m.value}
                      className={`flex flex-col items-center rounded-xl border-2 py-2 transition active:scale-95 ${entry.mood === m.value ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-[11px] font-bold text-foreground">{m.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">¿Cuánto comió?</p>
                <div className="mb-4 grid grid-cols-5 gap-2">
                  {NUTRITION_STEPS.map(n => (
                    <button key={n} onClick={() => set('nutrition_pct', entry.nutrition_pct === n ? null : n)} aria-pressed={entry.nutrition_pct === n} className={chip(entry.nutrition_pct === n)}>
                      {n}%
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">Hidratación</p>
                    <div className="flex items-center gap-3">
                      <button aria-label="Menos vasos" onClick={() => set('hydration_glasses', Math.max(0, entry.hydration_glasses - 1))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-border active:scale-95"><Minus size={18} /></button>
                      <div className="flex-1 text-center">
                        <p className="text-2xl font-black text-foreground">{entry.hydration_glasses}</p>
                        <p className="text-[11px] text-muted-foreground">{entry.hydration_glasses === 1 ? "vaso" : "vasos"} 💧</p>
                      </div>
                      <button aria-label="Más vasos" onClick={() => set('hydration_glasses', Math.min(20, entry.hydration_glasses + 1))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-primary bg-primary/10 text-primary active:scale-95"><Plus size={18} /></button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">Eliminación</p>
                    <div className="flex flex-wrap gap-2">
                      {ELIMINATIONS.map(el => (
                        <button key={el} onClick={() => set('elimination', entry.elimination === el ? "" : el)} aria-pressed={entry.elimination === el} className={chip(entry.elimination === el)}>
                          {el}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard step={3} title="Novedades" icon={MessageSquareText} done={sections.observations} hint="Toca las frases o dicta con tu voz.">
                <div className="space-y-3 mb-3">
                  {QUICK_PHRASES.map(g => (
                    <div key={g.group}>
                      <p className="mb-1.5 text-[11px] font-bold uppercase text-muted-foreground">{g.group}</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
                        {g.phrases.map(p => {
                          const used = entry.observations.includes(p.text);
                          return (
                            <button key={p.label} onClick={() => addPhrase(p.text, p.warning)} disabled={used}
                              className={`shrink-0 min-h-[38px] rounded-full border px-3 text-xs font-bold transition active:scale-95 ${used ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : p.warning ? "border-destructive/40 text-destructive hover:bg-destructive/5" : "border-border text-foreground hover:border-primary hover:bg-primary/5"}`}>
                              {used ? "✓ " : "+ "}{p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <textarea value={entry.observations} onChange={e => set('observations', e.target.value)} rows={4}
                    placeholder="Escribe o dicta lo que pasó en el turno..."
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-14 text-sm" />
                  {dictation.supported && (
                    <button onClick={dictation.toggle} aria-label={dictation.listening ? "Detener dictado" : "Dictar"}
                      className={`absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full transition ${dictation.listening ? "bg-destructive text-white animate-pulse" : "bg-primary/10 text-primary"}`}>
                      {dictation.listening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                </div>
                {dictation.listening && <p className="mt-1 text-xs font-bold text-destructive">🎙️ Escuchando... habla con naturalidad.</p>}
                {warnings.map(w => (
                  <p key={w} className="mt-2 flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-xs font-bold text-destructive">
                    <AlertTriangle size={14} /> {w}
                    <button aria-label="Ocultar" onClick={() => setWarnings(prev => prev.filter(x => x !== w))} className="ml-auto"><X size={14} /></button>
                  </p>
                ))}
              </SectionCard>
            </>
          )}
        </>
      )}

      {/* Nota final */}
      {(mode === "turno" || (resident && !justSaved)) && (
        <SectionCard step={mode === "turno" ? 1 : 4} title={mode === "turno" ? "Nota consolidada del turno" : "Nota final"} icon={FileText} done={sections.note}
          hint={mode === "turno" ? "Resume las bitácoras guardadas de todos los residentes." : "Redáctala con IA, arma una nota rápida o escríbela tú."}>
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={generateAI} disabled={generating || (mode === "individual" && !residentId)}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-500 px-4 text-sm font-black text-white shadow-md transition active:scale-[0.98] disabled:opacity-50">
              {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {generating ? "Redactando..." : "Redactar con IA"}
            </button>
            {mode === "individual" && (
              <button onClick={quickNote} disabled={!hasContent}
                className="flex min-h-[52px] disabled:opacity-40 items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 text-sm font-bold text-primary transition active:scale-[0.98]">
                <Wand2 size={18} /> Nota rápida (sin internet)
              </button>
            )}
          </div>

          <div className="mb-2 flex items-center gap-2">
            <div className="flex rounded-lg bg-muted p-0.5 text-xs font-bold">
              <button onClick={() => setPreview(false)} className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${!preview ? "bg-card shadow" : "text-muted-foreground"}`}><Pencil size={12} /> Editar</button>
              <button onClick={() => setPreview(true)} disabled={!note} className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${preview ? "bg-card shadow" : "text-muted-foreground"}`}><Eye size={12} /> Vista previa</button>
            </div>
            {noteSource === "ai" && note && <span className="rounded-md bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">✨ IA · revisa antes de guardar</span>}
            {previousNote !== null && (
              <button onClick={() => { setNote(previousNote); setPreviousNote(null); setNoteSource("manual"); }} className="ml-auto flex items-center gap-1 text-xs font-bold text-primary">
                <Undo2 size={14} /> Deshacer
              </button>
            )}
          </div>

          <div ref={noteRef}>
            {preview && note ? (
              <div className="nursing-note-preview min-h-[160px] rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground [&_.note-gap]:h-2 [&_.note-quote]:border-l-4 [&_.note-quote]:border-primary/40 [&_.note-quote]:pl-3 [&_.note-quote]:text-muted-foreground [&_.note-title]:font-black"
                dangerouslySetInnerHTML={{ __html: noteToHtml(note) }} />
            ) : (
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={10}
                placeholder={mode === "individual" ? "Aquí aparecerá la nota. También puedes escribirla directamente." : "Toca “Redactar con IA” para resumir el turno."}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed" />
            )}
          </div>

          {note && (
            <>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Responsable</p>
                  <input placeholder="Nombre" value={responsibleName} onChange={e => setResponsibleName(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-input bg-background px-3 text-sm" />
                  <input placeholder="Cargo" value={responsibleRole} onChange={e => setResponsibleRole(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-input bg-background px-3 text-sm" />
                  {mode === "individual" && (hasVitals(entry) || hasWellbeing(entry)) && (
                    <label className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-foreground">
                      <input type="checkbox" checked={alsoLog} onChange={e => setAlsoLog(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                      <span><b>Registrar también en la Bitácora HB-F4</b><br />Así los signos y el bienestar alimentan las alertas y el Centro de Inteligencia Clínica.</span>
                    </label>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Firma digital</p>
                  <SignaturePad label="Firma" value={signature || undefined} onChange={setSignature} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ExportButtons contentRef={noteRef} title="Nota de Enfermería" fileName={`nota_enfermeria_${date}`} textContent={note}
                  signatureDataUrl={signature} responsibleName={responsibleName} responsibleRole={responsibleRole} />
                <ShareButtons title="Nota de Enfermería" text={note} />
                <button onClick={() => copyNote(note)} className="flex min-h-[40px] items-center gap-1 rounded-xl border border-border px-3 text-xs font-bold"><Copy size={14} /> Copiar</button>
              </div>
            </>
          )}
        </SectionCard>
      )}

      {/* Historial */}
      {(mode === "turno" || resident) && (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-base font-black text-foreground"><Calendar size={16} className="text-primary" /> Notas de los últimos 30 días</h3>
          {history.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aún no hay notas en este periodo.</p>}
          <div className="space-y-2">
            {history.map(h => {
              const open = expandedId === h.id;
              return (
                <div key={h.id} className="overflow-hidden rounded-xl border border-border">
                  <button onClick={() => setExpandedId(open ? null : h.id)} className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/50">
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-foreground">{h.note_date}</span>
                      <span className="text-muted-foreground">{relativeDay(h.note_date)}</span>
                      {h.shift && <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">{h.shift}</span>}
                      {h.is_ai_generated && <span className="rounded-md bg-violet-100 px-2 py-0.5 font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">IA</span>}
                    </span>
                    {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>
                  {!open && <p className="line-clamp-2 px-3 pb-3 text-sm text-muted-foreground">{h.note.replace(/[*#>]/g, "")}</p>}
                  {open && (
                    <div className="border-t border-border p-3">
                      <div ref={historyRef} className="mb-3 text-sm leading-relaxed text-foreground [&_.note-gap]:h-2 [&_.note-quote]:border-l-4 [&_.note-quote]:border-primary/40 [&_.note-quote]:pl-3 [&_.note-quote]:text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: noteToHtml(h.note) }} />
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => { setNote(h.note); setNoteSource("manual"); setPreview(false); setJustSaved(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className="min-h-[40px] rounded-xl border border-border px-3 text-xs font-bold">Usar como base</button>
                        <button onClick={() => copyNote(h.note)} className="flex min-h-[40px] items-center gap-1 rounded-xl border border-border px-3 text-xs font-bold"><Copy size={14} /> Copiar</button>
                        <ExportButtons contentRef={historyRef} title="Nota de Enfermería" fileName={`nota_enfermeria_${h.note_date}`} textContent={h.note} />
                        <ShareButtons title="Nota de Enfermería" text={h.note} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra fija para guardar (en un portal: la animación de entrada rompe position: fixed) */}
      {(mode === "turno" || (resident && !justSaved)) && createPortal(
        <div className="above-mobile-nav fixed inset-x-0 z-20 border-t border-border bg-card/95 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              {mode === "individual" ? (
                <>
                  <p className="truncate text-xs font-bold text-foreground">{resident?.full_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {alerts.length > 0 ? <span className="font-bold text-destructive">⚠️ {alerts.length} alerta{alerts.length > 1 ? "s" : ""} · </span> : null}
                    {alreadySaved ? "✓ Guardada" : note.trim() ? "Lista para guardar" : `${progress} de 4 pasos`}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{alreadySaved ? "✓ Guardada" : note.trim() ? "Lista para guardar" : "Redacta la nota del turno"}</p>
              )}
            </div>
            {!note.trim() && mode === "individual" && hasContent && (
              <button onClick={quickNote} aria-label="Armar nota rápida" className="flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-primary px-3 sm:px-4 text-sm font-bold text-primary">
                <Wand2 size={16} /> <span className="hidden sm:inline">Armar nota</span>
              </button>
            )}
            <button onClick={saveNote} disabled={!canSave}
              className="flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-6 text-sm font-black text-primary-foreground shadow-md disabled:opacity-40">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default NursingNotes;
