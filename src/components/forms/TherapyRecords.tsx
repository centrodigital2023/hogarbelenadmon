import { useCallback, useEffect, useRef, useState } from "react";
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
import { Section, Field, ChoiceChips, inputCls } from "@/components/forms/ui";
import { CheckCircle2 } from "lucide-react";
import { ROLE_LABELS } from "@/hooks/usePermissions";
import { todayLocal, mondayOf, addDays } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

const DAYS = [
  { key: "attended_monday", label: "Lun", offset: 0 },
  { key: "attended_wednesday", label: "Mié", offset: 2 },
  { key: "attended_friday", label: "Vie", offset: 4 },
] as const;
type DayKey = (typeof DAYS)[number]["key"];

const TYPES = ["Fisioterapia", "Cognitiva", "Ocupacional"];
const EVOLUTION = [
  { value: "M", label: "M · Mantiene" },
  { value: "I", label: "I · Mejora" },
  { value: "D", label: "D · Deterioro" },
  { value: "P", label: "P · Pasiva" },
];

interface Entry extends Record<DayKey, boolean> { therapy_type: string; evolution_code: string; observations: string }
interface TherapyDraft { weekStart: string; entries: Record<string, Entry>; responsibleName: string; responsibleRole: string }

const blankEntry = (): Entry => ({ attended_monday: false, attended_wednesday: false, attended_friday: false, therapy_type: "", evolution_code: "", observations: "" });
const entryHasData = (e?: Entry) => !!e && (e.attended_monday || e.attended_wednesday || e.attended_friday || !!e.therapy_type || !!e.evolution_code || !!e.observations.trim());

const shortDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

const TherapyRecords = ({ onBack }: Props) => {
  const { user, profile, roles } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const defaultRole = roles.includes("terapeuta") ? "Terapeuta" : roles[0] ? ROLE_LABELS[roles[0]] : "Terapeuta";
  const newDraft = useCallback((): TherapyDraft => ({ weekStart: mondayOf(todayLocal()), entries: {}, responsibleName: "", responsibleRole: "" }), []);
  const [form, setForm] = useState<TherapyDraft>(newDraft);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedThisWeek, setSavedThisWeek] = useState<Set<string>>(new Set());
  const draft = useFormDraft("terapias", form, setForm, d => !Object.values(d.entries).some(entryHasData));
  const responsibleName = form.responsibleName || profile?.full_name || "";
  const responsibleRole = form.responsibleRole || defaultRole;

  const loadWeek = useCallback(async (week: string) => {
    const { data } = await supabase.from("therapy_records").select("resident_id").eq("week_start", week);
    setSavedThisWeek(new Set((data ?? []).map(r => r.resident_id)));
  }, []);
  useEffect(() => { loadWeek(form.weekStart); }, [form.weekStart, loadWeek]);

  const update = (rid: string, patch: Partial<Entry>) =>
    setForm(f => ({ ...f, entries: { ...f.entries, [rid]: { ...(f.entries[rid] ?? blankEntry()), ...patch } } }));

  const markDayForAll = (day: DayKey) => {
    const allMarked = residents.every(r => form.entries[r.id]?.[day]);
    setForm(f => ({
      ...f,
      entries: Object.fromEntries(residents.map(r => [r.id, { ...(f.entries[r.id] ?? blankEntry()), [day]: !allMarked }])),
    }));
  };

  const filled = Object.entries(form.entries).filter(([, e]) => entryHasData(e));
  const missing = [
    ...(filled.length ? [] : ["asistencia de al menos un residente"]),
    ...(responsibleName.trim() ? [] : ["nombre del terapeuta"]),
    ...(signature ? [] : ["firma"]),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { error } = await supabase.from("therapy_records").insert(filled.map(([rid, e]) => ({
      resident_id: rid, created_by: user.id, week_start: form.weekStart,
      therapy_type: e.therapy_type || null,
      attended_monday: e.attended_monday, attended_wednesday: e.attended_wednesday, attended_friday: e.attended_friday,
      // The database only accepts M, I, D or P; an unanswered evolution is stored empty (NULL)
      evolution_code: e.evolution_code || null,
      observations: e.observations.trim() || null,
      signature, responsible_id: user.id, responsible_name: responsibleName.trim(), responsible_role: responsibleRole,
    })));
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      const deteriorated = filled.filter(([, e]) => e.evolution_code === "D").length;
      toast({
        title: "Terapias registradas con firma ✅",
        description: `${filled.length} residente${filled.length > 1 ? "s" : ""}${deteriorated ? ` · ${deteriorated} con deterioro: coméntelo con enfermería y la familia` : ""}`,
      });
      draft.clear();
      setForm(f => ({ ...f, entries: {} }));
      setSignature(null);
      loadWeek(form.weekStart);
    }
    setSaving(false);
  };

  const summary = [
    `HB-F9 Terapias — semana del ${shortDate(form.weekStart)} al ${shortDate(addDays(form.weekStart, 4))}`,
    ...filled.map(([rid, e]) => {
      const name = residents.find(r => r.id === rid)?.full_name ?? "";
      const days = DAYS.filter(d => e[d.key]).map(d => d.label).join(", ") || "sin asistencia";
      return `${name}: ${e.therapy_type || "terapia"} · ${days}${e.evolution_code ? ` · evolución ${e.evolution_code}` : ""}${e.observations ? ` · ${e.observations}` : ""}`;
    }),
    `Responsable: ${responsibleName} (${responsibleRole})`,
  ].join("\n");

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F9: Terapias" subtitle="Asistencia semanal y evolución de cada residente" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(newDraft()); }} />
      <div ref={contentRef}>
        <Section>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Semana" className="w-full max-w-xs" hint={`Lunes ${shortDate(form.weekStart)} a viernes ${shortDate(addDays(form.weekStart, 4))}`}>
              <input type="date" value={form.weekStart} onChange={e => e.target.value && setForm(f => ({ ...f, weekStart: mondayOf(e.target.value) }))} className={inputCls} />
            </Field>
            <div className="pb-6">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">Marcar a todos</span>
              <div className="mt-1 flex gap-2">
                {DAYS.map(d => (
                  <button key={d.key} type="button" onClick={() => markDayForAll(d.key)}
                    className="min-h-[40px] rounded-xl bg-muted px-3 text-xs font-bold text-foreground hover:bg-accent">{d.label} ✓</button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {loading && <p className="p-4 text-sm text-muted-foreground">Cargando residentes…</p>}
        <div className="mb-5 space-y-3">
          {residents.map(r => {
            const e = form.entries[r.id] ?? blankEntry();
            return (
              <div key={r.id} className={`rounded-2xl border-2 bg-card p-4 ${entryHasData(e) ? "border-primary/40" : "border-border"}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{r.full_name}</p>
                  {savedThisWeek.has(r.id) && <span className="flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Ya registrado esta semana</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d.key} type="button" aria-pressed={e[d.key]} onClick={() => update(r.id, { [d.key]: !e[d.key] })}
                      className={`min-h-[48px] min-w-[72px] rounded-xl border-2 px-3 text-sm font-black transition ${e[d.key] ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-border text-muted-foreground"}`}>
                      {e[d.key] ? "✓ " : ""}{d.label}
                      <span className="block text-[10px] font-medium">{shortDate(addDays(form.weekStart, d.offset))}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Tipo</span>
                    <ChoiceChips size="sm" options={TYPES.map(t => ({ value: t, label: t }))} value={e.therapy_type}
                      onChange={v => update(r.id, { therapy_type: e.therapy_type === v ? "" : v })} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Evolución</span>
                    <ChoiceChips size="sm" options={EVOLUTION} value={e.evolution_code}
                      onChange={v => update(r.id, { evolution_code: e.evolution_code === v ? "" : v })} />
                  </div>
                </div>
                <input value={e.observations} onChange={ev => update(r.id, { observations: ev.target.value })}
                  placeholder="Observación (opcional)" className={`${inputCls} mt-3`} />
              </div>
            );
          })}
        </div>

        <Section title="Responsable y firma">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" required>
              <input value={responsibleName} onChange={e => setForm(f => ({ ...f, responsibleName: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Cargo">
              <input value={responsibleRole} onChange={e => setForm(f => ({ ...f, responsibleRole: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <SignaturePad label="Firma del terapeuta" value={signature || undefined} onChange={setSignature} />
        </Section>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title="HB-F9 Terapias" fileName={`terapias_${form.weekStart}`} textContent={summary}
          signatureDataUrl={signature} responsibleName={responsibleName} responsibleRole={responsibleRole} />
        <ShareButtons title="HB-F9 Terapias" text={summary} />
        <FormHistory tableName="therapy_records" title="Historial de Terapias" fileName="hist_terapias"
          selectClause="*, residents(full_name)" dateColumn="week_start"
          columns={[
            { key: "week_start", label: "Semana del" },
            { key: "residents", label: "Residente", render: (_v, row) => row.residents?.full_name || "-" },
            { key: "therapy_type", label: "Tipo" },
            { key: "attended_monday", label: "Lun", render: (v) => v ? "✅" : "—" },
            { key: "attended_wednesday", label: "Mié", render: (v) => v ? "✅" : "—" },
            { key: "attended_friday", label: "Vie", render: (v) => v ? "✅" : "—" },
            { key: "evolution_code", label: "Evol." },
            { key: "responsible_name", label: "Responsable" },
          ]} />
      </div>
      <SmartReportSection module="bienestar" formTitle="HB-F9: Terapias" formData={form.entries} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} count={filled.length} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default TherapyRecords;
