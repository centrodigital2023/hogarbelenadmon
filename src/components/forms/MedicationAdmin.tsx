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
import SignaturePad from "@/components/SignaturePad";
import FormHistory from "@/components/FormHistory";
import { Section, Field, ResidentSelect, ChoiceChips, Notice, inputCls } from "@/components/forms/ui";
import { AlertTriangle, CheckCircle2, Clock, Pill, ShieldCheck } from "lucide-react";
import type { Row } from "@/integrations/supabase/tables";
import { todayLocal, timeLocal } from "@/lib/form-helpers";
import { FIVE_RIGHTS, fiveRightsDone, scheduleTimes, nearestDose, daysToExpiry, type FiveRightsKey } from "@/lib/form-rules";

interface Props { onBack: () => void; }

type Decision = "dado" | "no_dado";
interface AdminRecord extends Record<FiveRightsKey, boolean> {
  decision: Decision | null;
  dose_given: string;
  skip_reason: string;
  notes: string;
}
interface TodayDose { medication_id: string; admin_datetime: string | null; was_administered: boolean | null; skip_reason: string | null }
interface AdminDraft { residentId: string; records: Record<string, AdminRecord> }

const SKIP_REASONS = ["Rechazó", "Dormido", "En ayunas", "Hospitalizado", "Sin existencias", "Orden médica"];
const DECISIONS = [
  { value: "dado" as const, label: "✅ Administrado" },
  { value: "no_dado" as const, label: "⛔ No administrado" },
];

const blankRecord = (dose = ""): AdminRecord => ({
  decision: null, dose_given: dose, skip_reason: "", notes: "",
  check_patient: false, check_medication: false, check_dose: false, check_route: false, check_time: false,
});

const hourOf = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" }) : "");

const MedicationAdmin = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const [form, setForm] = useState<AdminDraft>({ residentId: "", records: {} });
  const [medications, setMedications] = useState<Row<"medications">[]>([]);
  const [todayDoses, setTodayDoses] = useState<TodayDose[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draft = useFormDraft("administracion-medicamentos", form, setForm, d => !Object.values(d.records).some(r => r.decision));
  const { residentId, records } = form;

  const loadToday = useCallback(async (rid: string) => {
    const start = new Date(`${todayLocal()}T00:00:00`).toISOString();
    const { data } = await supabase.from("medication_admin")
      .select("medication_id, admin_datetime, was_administered, skip_reason")
      .eq("resident_id", rid).gte("admin_datetime", start).order("admin_datetime");
    setTodayDoses(data ?? []);
  }, []);

  useEffect(() => {
    if (!residentId) { setMedications([]); setTodayDoses([]); return; }
    supabase.from("medications").select("*").eq("resident_id", residentId).eq("is_active", true).order("medication_name")
      .then(({ data }) => setMedications(data ?? []));
    loadToday(residentId);
  }, [residentId, loadToday]);

  const resident = residents.find(r => r.id === residentId);
  const now = timeLocal();
  const today = todayLocal();

  const recordFor = (med: Row<"medications">) => records[med.id] ?? blankRecord(med.dose ?? "");
  const update = (med: Row<"medications">, patch: Partial<AdminRecord>) =>
    setForm(f => ({ ...f, records: { ...f.records, [med.id]: { ...(f.records[med.id] ?? blankRecord(med.dose ?? "")), ...patch } } }));

  const decided = medications.filter(m => records[m.id]?.decision);
  const missing = [
    ...(residentId ? [] : ["residente"]),
    ...(residentId && decided.length === 0 ? ["marcar al menos un medicamento"] : []),
    ...decided.filter(m => records[m.id].decision === "dado" && !fiveRightsDone(records[m.id])).map(m => `5 correctos de ${m.medication_name}`),
    ...decided.filter(m => records[m.id].decision === "no_dado" && !records[m.id].skip_reason.trim()).map(m => `motivo de ${m.medication_name}`),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { error } = await supabase.from("medication_admin").insert(decided.map(m => {
      const r = records[m.id];
      const given = r.decision === "dado";
      return {
        medication_id: m.id, resident_id: residentId, administered_by: user.id,
        was_administered: given, dose_given: given ? r.dose_given.trim() || m.dose : null, route: m.route,
        check_patient: r.check_patient, check_medication: r.check_medication, check_dose: r.check_dose,
        check_route: r.check_route, check_time: r.check_time,
        skip_reason: given ? null : r.skip_reason.trim(), notes: r.notes.trim() || null, signature,
      };
    }));
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      const notGiven = decided.filter(m => records[m.id].decision === "no_dado").length;
      toast({
        title: "Administración registrada ✅",
        description: `${decided.length - notGiven} administrado${decided.length - notGiven === 1 ? "" : "s"}${notGiven ? ` · ${notGiven} no administrado${notGiven === 1 ? "" : "s"} (informe al médico si se repite)` : ""}`,
      });
      draft.clear();
      setForm(f => ({ ...f, records: {} }));
      setSignature(null);
      loadToday(residentId);
    }
    setSaving(false);
  };

  const summary = [
    `HB-F15 Administración de medicamentos — ${resident?.full_name ?? ""} — ${today} ${now}`,
    ...decided.map(m => {
      const r = records[m.id];
      return r.decision === "dado"
        ? `✅ ${m.medication_name} ${r.dose_given || m.dose || ""} (${m.route ?? ""}) — 5 correctos verificados`
        : `⛔ ${m.medication_name}: no administrado — ${r.skip_reason}`;
    }),
  ].join("\n");

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F15: Administración de Medicamentos" subtitle="Verifique los 5 correctos antes de cada dosis" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(f => ({ ...f, records: {} })); }} />
      <div ref={contentRef}>
        <Section>
          <Field label="Residente" required>
            <ResidentSelect residents={residents} loading={loading} value={residentId}
              onChange={id => setForm({ residentId: id, records: {} })} />
          </Field>
          {resident?.allergies?.trim() && (
            <div className="mt-3"><Notice tone="danger"><span className="flex items-center gap-2 font-bold"><AlertTriangle size={16} /> Alergias: {resident.allergies}</span></Notice></div>
          )}
        </Section>

        {residentId && medications.length === 0 && (
          <Notice tone="info">Este residente no tiene medicamentos activos. Agréguelos en HB-F14 Medicamentos.</Notice>
        )}

        <div className="space-y-3">
          {medications.map(med => {
            const r = recordFor(med);
            const times = scheduleTimes(med.schedule);
            const due = nearestDose(times, now);
            const given = todayDoses.filter(d => d.medication_id === med.id);
            const expiry = daysToExpiry(med.expiry_date, today);
            const allChecked = fiveRightsDone(r);
            return (
              <div key={med.id} className={`rounded-2xl border-2 bg-card p-4 transition ${
                r.decision === "dado" ? (allChecked ? "border-emerald-500/40" : "border-amber-400") : r.decision === "no_dado" ? "border-destructive/40" : "border-border"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-base font-black text-foreground"><Pill size={16} className="text-primary" />{med.medication_name} {med.concentration}</p>
                    <p className="text-sm text-muted-foreground">{[med.dose, med.route, med.schedule].filter(Boolean).join(" · ")}</p>
                  </div>
                  {due && (
                    <span className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary"><Clock size={13} /> Toca {due}</span>
                  )}
                </div>
                {given.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> Hoy: {given.map(d => `${hourOf(d.admin_datetime)} ${d.was_administered ? "administrado" : `no dado (${d.skip_reason ?? ""})`}`).join(" · ")}
                  </p>
                )}
                {expiry !== null && expiry <= 15 && (
                  <p className={`mt-1 text-xs font-bold ${expiry < 0 ? "text-destructive" : "text-amber-700"}`}>
                    <AlertTriangle size={13} className="mr-1 inline" />{expiry < 0 ? `Vencido hace ${-expiry} días: no lo administre` : `Vence en ${expiry} días`}
                  </p>
                )}

                <div className="mt-3"><ChoiceChips options={DECISIONS} value={r.decision} onChange={v => update(med, { decision: r.decision === v ? null : v })} /></div>

                {r.decision === "dado" && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {FIVE_RIGHTS.map(c => (
                        <button key={c.key} type="button" onClick={() => update(med, { [c.key]: !r[c.key] })}
                          aria-pressed={r[c.key]}
                          className={`min-h-[40px] rounded-xl border-2 px-3 text-xs font-bold transition ${r[c.key] ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-border text-foreground"}`}>
                          {r[c.key] ? "✓ " : ""}{c.label}
                        </button>
                      ))}
                      {!allChecked && (
                        <button type="button" onClick={() => update(med, Object.fromEntries(FIVE_RIGHTS.map(c => [c.key, true])))}
                          className="flex min-h-[40px] items-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground">
                          <ShieldCheck size={14} /> Verifiqué los 5
                        </button>
                      )}
                    </div>
                    <Field label="Dosis administrada">
                      <input value={r.dose_given} onChange={e => update(med, { dose_given: e.target.value })} className={inputCls} />
                    </Field>
                  </div>
                )}
                {r.decision === "no_dado" && (
                  <div className="mt-3">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">Motivo</span>
                    <ChoiceChips size="sm" options={SKIP_REASONS.map(v => ({ value: v, label: v }))}
                      value={SKIP_REASONS.includes(r.skip_reason) ? r.skip_reason : null} onChange={v => update(med, { skip_reason: v })} />
                    <input value={r.skip_reason} onChange={e => update(med, { skip_reason: e.target.value })} placeholder="u otro motivo…" className={inputCls} />
                  </div>
                )}
                {r.decision && (
                  <input value={r.notes} onChange={e => update(med, { notes: e.target.value })} placeholder="Observación (opcional)" className={`${inputCls} mt-2`} />
                )}
              </div>
            );
          })}
        </div>

        {medications.length > 0 && (
          <Section title="Firma de quien administra" className="mt-5">
            <SignaturePad label="Enfermera responsable" value={signature || undefined} onChange={setSignature} />
          </Section>
        )}
      </div>

      {medications.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ExportButtons contentRef={contentRef} title={`HB-F15 Medicamentos ${resident?.full_name ?? ""}`} fileName={`medicamentos_admin_${resident?.full_name ?? ""}`} textContent={summary} signatureDataUrl={signature} />
          <ShareButtons title={`HB-F15 Medicamentos ${resident?.full_name ?? ""}`} text={summary} />
        </div>
      )}
      <FormHistory tableName="medication_admin" title="Historial Administración" fileName="hist_administracion_medicamentos"
        selectClause="*, residents(full_name), medications(medication_name)" dateColumn="admin_datetime"
        columns={[
          { key: "admin_datetime", label: "Fecha y hora", render: (v) => v ? new Date(String(v)).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "-" },
          { key: "residents", label: "Residente", render: (_v, row) => row.residents?.full_name || "-" },
          { key: "medications", label: "Medicamento", render: (v) => (v as { medication_name?: string } | null)?.medication_name || "-" },
          { key: "dose_given", label: "Dosis" },
          { key: "was_administered", label: "Dado", render: (v) => v ? "✅" : "⛔" },
          { key: "skip_reason", label: "Motivo" },
        ]} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} count={decided.length} draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default MedicationAdmin;
