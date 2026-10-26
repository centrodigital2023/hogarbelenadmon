import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import FormHistory from "@/components/FormHistory";
import VitalInputs, { emptyVitals, hasVitals, vitalColumns, vitalTypos, type VitalValues } from "@/components/forms/VitalInputs";
import { Section, Field, inputCls } from "@/components/forms/ui";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { vitalIssues, weightChange } from "@/lib/vital-signs";
import { todayLocal, relativeDay } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

interface Entry extends VitalValues { notes: string }
interface LastReading {
  record_date: string | null; blood_pressure: string | null; spo2: number | null; temperature: number | null;
  glucose: number | null; heart_rate: number | null; weight: number | null;
}
interface VitalsDraft { recordDate: string; entries: Record<string, Entry> }

const emptyEntry = (): Entry => ({ ...emptyVitals(), notes: "" });
const newDraft = (): VitalsDraft => ({ recordDate: todayLocal(), entries: {} });
const entryHasData = (e?: Entry) => !!e && (hasVitals(e) || e.notes.trim() !== "");

const VitalSigns = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const [form, setForm] = useState<VitalsDraft>(newDraft);
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState<Record<string, LastReading>>({});
  const [savedOnDate, setSavedOnDate] = useState<Set<string>>(new Set());
  const draft = useFormDraft("signos-vitales", form, setForm, d => !Object.values(d.entries).some(entryHasData));

  const loadHistory = useCallback(async (date: string) => {
    const { data } = await supabase.from("vital_signs")
      .select("resident_id, record_date, blood_pressure, spo2, temperature, glucose, heart_rate, weight")
      .order("record_date", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    const latest: Record<string, LastReading> = {};
    const today = new Set<string>();
    for (const row of data ?? []) {
      if (row.record_date === date) today.add(row.resident_id);
      else if (!latest[row.resident_id] && (row.record_date ?? "") < date) latest[row.resident_id] = row;
    }
    setLast(latest);
    setSavedOnDate(today);
  }, []);

  useEffect(() => { loadHistory(form.recordDate); }, [form.recordDate, loadHistory]);

  const update = (rid: string, key: keyof Entry, val: string) =>
    setForm(f => ({ ...f, entries: { ...f.entries, [rid]: { ...(f.entries[rid] ?? emptyEntry()), [key]: val } } }));

  const filled = useMemo(() => Object.entries(form.entries).filter(([, e]) => entryHasData(e)), [form.entries]);
  const typoResidents = filled.filter(([, e]) => vitalTypos(e).length > 0)
    .map(([rid]) => residents.find(r => r.id === rid)?.full_name.split(" ")[0] ?? "residente");
  const missing = [
    ...(filled.length ? [] : ["los signos de al menos un residente"]),
    ...(typoResidents.length ? [`revisar valores de ${typoResidents.join(", ")}`] : []),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { error } = await supabase.from("vital_signs").insert(filled.map(([rid, e]) => ({
      resident_id: rid, created_by: user.id, record_date: form.recordDate,
      ...vitalColumns(e), notes: e.notes.trim() || null,
    })));
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      const alerts = filled.filter(([, e]) => vitalIssues(e).length > 0).length;
      toast({
        title: "Signos vitales guardados ✅",
        description: `${filled.length} residente${filled.length > 1 ? "s" : ""}${alerts ? ` · ${alerts} con valores de alerta: avise a enfermería` : ""}`,
      });
      draft.clear();
      setForm(f => ({ ...f, entries: {} }));
      loadHistory(form.recordDate);
    }
    setSaving(false);
  };

  const getTextContent = () => [
    `HB-F16: Signos Vitales — ${form.recordDate}`,
    ...filled.map(([rid, e]) => {
      const r = residents.find(res => res.id === rid);
      const parts = [
        e.blood_pressure && `TA ${e.blood_pressure}`, e.heart_rate && `FC ${e.heart_rate}`, e.spo2 && `SpO2 ${e.spo2}%`,
        e.temperature && `T ${e.temperature}°C`, e.glucose && `Gluc ${e.glucose}`, e.weight && `Peso ${e.weight} kg`,
      ].filter(Boolean).join(", ");
      return `${r?.full_name}: ${parts}${e.notes ? ` — ${e.notes}` : ""}`;
    }),
  ].join("\n");

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F16: Signos Vitales" subtitle="Escribe solo lo que mediste; lo vacío no se guarda" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(newDraft()); }} />
      <div ref={contentRef}>
        <Section>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Fecha" className="w-full max-w-xs">
              <input type="date" value={form.recordDate} max={todayLocal()}
                onChange={e => setForm(f => ({ ...f, recordDate: e.target.value }))} className={inputCls} />
            </Field>
            <p className="pb-2 text-sm font-bold text-foreground">
              {savedOnDate.size} de {residents.length} con registro {form.recordDate === todayLocal() ? "hoy" : "ese día"}
            </p>
          </div>
        </Section>

        {loading && <p className="p-4 text-sm text-muted-foreground">Cargando residentes…</p>}
        <div className="mb-6 space-y-3">
          {residents.map(r => {
            const e = form.entries[r.id] ?? emptyEntry();
            const issues = vitalIssues(e);
            const prev = last[r.id];
            const change = weightChange(e.weight, prev?.weight);
            const bigChange = change !== null && Math.abs(change) >= 0.05;
            return (
              <div key={r.id} className={`rounded-2xl border-2 bg-card p-4 transition ${issues.length ? "border-destructive/40" : entryHasData(e) ? "border-primary/40" : "border-border"}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-foreground">{r.full_name}</p>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {savedOnDate.has(r.id) && <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14} /> Ya registrado</span>}
                    {issues.length > 0 && <span className="flex items-center gap-1 text-destructive"><AlertTriangle size={14} /> {issues.join(" · ")}</span>}
                  </div>
                </div>
                {prev && (
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    Última toma ({relativeDay(prev.record_date ?? "", form.recordDate)}):{" "}
                    {[prev.blood_pressure && `TA ${prev.blood_pressure}`, prev.heart_rate && `FC ${prev.heart_rate}`, prev.spo2 && `SpO2 ${prev.spo2}%`,
                      prev.temperature && `${prev.temperature}°C`, prev.glucose && `Gluc ${prev.glucose}`, prev.weight && `${prev.weight} kg`].filter(Boolean).join(" · ") || "sin datos"}
                  </p>
                )}
                <VitalInputs idPrefix={`vs-${r.id}`} value={e} onChange={(k, v) => update(r.id, k, v)} />
                {bigChange && (
                  <p className={`mt-2 flex items-center gap-1 text-xs font-bold ${change! < 0 ? "text-destructive" : "text-amber-700"}`}>
                    {change! < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {change! < 0 ? "Bajó" : "Subió"} {Math.abs(Math.round(change! * 100))}% de peso desde la última toma ({prev?.weight} kg). Avise a nutrición.
                  </p>
                )}
                <input value={e.notes} onChange={ev => update(r.id, "notes", ev.target.value)} placeholder="Nota (opcional): toma en reposo, brazo izquierdo…"
                  className={`${inputCls} mt-2`} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title={`HB-F16 Signos Vitales ${form.recordDate}`} fileName={`signos_vitales_${form.recordDate}`} textContent={getTextContent()} />
        <ShareButtons title={`HB-F16 Signos Vitales ${form.recordDate}`} text={getTextContent()} />
        <FormHistory tableName="vital_signs" title="Historial Signos Vitales" fileName="hist_signos_vitales"
          selectClause="*, residents(full_name)" dateColumn="record_date"
          columns={[
            { key: "record_date", label: "Fecha" },
            { key: "residents", label: "Residente", render: (_v, row) => row.residents?.full_name || "-" },
            { key: "blood_pressure", label: "T.A." }, { key: "heart_rate", label: "FC" }, { key: "spo2", label: "SpO2" },
            { key: "temperature", label: "Temp" }, { key: "glucose", label: "Gluc" }, { key: "weight", label: "Peso" },
            { key: "notes", label: "Notas" },
          ]} />
      </div>
      <SmartReportSection module="salud" formTitle="HB-F16: Signos Vitales" formData={form.entries} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} count={filled.length} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default VitalSigns;
