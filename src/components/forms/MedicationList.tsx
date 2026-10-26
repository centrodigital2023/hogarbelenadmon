import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveResidents } from "@/hooks/useActiveResidents";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import { Section, Field, ResidentSelect, ChoiceChips, Notice, inputCls } from "@/components/forms/ui";
import { AlertTriangle, Pencil, Plus, Power, X } from "lucide-react";
import type { Row } from "@/integrations/supabase/tables";
import { todayLocal, blankToNull } from "@/lib/form-helpers";
import { daysToExpiry } from "@/lib/form-rules";

interface Props { onBack: () => void; }

const ROUTES = ["Oral", "Sublingual", "Gotas", "Tópica", "Inhalada", "Subcutánea", "Intramuscular", "Oftálmica"];
const SCHEDULES = ["8:00", "8:00 - 20:00", "8:00 - 14:00 - 20:00", "6:00 - 14:00 - 22:00", "20:00", "Si es necesario"];

const emptyForm = () => ({
  medication_name: "", concentration: "", dose: "", route: "Oral", schedule: "",
  prescription_date: todayLocal(), expiry_date: "", notes: "",
});
type MedForm = ReturnType<typeof emptyForm>;

/** Words of the medication name that appear in the resident's allergy notes. */
const allergyMatch = (name: string, allergies: string | null) => {
  if (!allergies || !name.trim()) return null;
  const a = allergies.toLowerCase();
  return name.toLowerCase().split(/[\s,/-]+/).find(w => w.length >= 4 && a.includes(w)) ?? null;
};

const MedicationList = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const [residentId, setResidentId] = useState("");
  const [medications, setMedications] = useState<Row<"medications">[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MedForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (rid: string) => {
    const { data } = await supabase.from("medications").select("*").eq("resident_id", rid)
      .order("is_active", { ascending: false }).order("medication_name");
    setMedications(data ?? []);
  }, []);

  useEffect(() => { if (residentId) load(residentId); else setMedications([]); }, [residentId, load]);

  const resident = residents.find(r => r.id === residentId);
  const today = todayLocal();
  const allergy = allergyMatch(form.medication_name, resident?.allergies ?? null);
  const duplicate = !editingId && medications.find(m => m.is_active && m.medication_name.trim().toLowerCase() === form.medication_name.trim().toLowerCase());
  const missing = [
    ...(form.medication_name.trim() ? [] : ["nombre del medicamento"]),
    ...(form.dose.trim() ? [] : ["dosis"]),
    ...(form.schedule.trim() ? [] : ["horario"]),
    ...(form.expiry_date && form.prescription_date && form.expiry_date < form.prescription_date ? ["vencimiento posterior a la fórmula"] : []),
  ];

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(emptyForm()); };

  const startEdit = (m: Row<"medications">) => {
    setForm({
      medication_name: m.medication_name, concentration: m.concentration ?? "", dose: m.dose ?? "", route: m.route ?? "Oral",
      schedule: m.schedule ?? "", prescription_date: m.prescription_date ?? "", expiry_date: m.expiry_date ?? "", notes: m.notes ?? "",
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !residentId || missing.length) return;
    setSaving(true);
    const payload = {
      medication_name: form.medication_name.trim(), concentration: blankToNull(form.concentration.trim()),
      dose: form.dose.trim(), route: form.route, schedule: form.schedule.trim(),
      prescription_date: blankToNull(form.prescription_date), expiry_date: blankToNull(form.expiry_date),
      notes: blankToNull(form.notes.trim()),
    };
    const { error } = editingId
      ? await supabase.from("medications").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingId)
      : await supabase.from("medications").insert({ ...payload, resident_id: residentId, created_by: user.id });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: editingId ? "Medicamento actualizado ✅" : "Medicamento agregado ✅", description: `${payload.medication_name} · ${payload.dose} · ${payload.schedule}` });
      closeForm();
      load(residentId);
    }
    setSaving(false);
  };

  const toggleActive = async (m: Row<"medications">) => {
    const { error } = await supabase.from("medications").update({ is_active: !m.is_active, updated_at: new Date().toISOString() }).eq("id", m.id);
    if (error) toast({ title: "No se pudo cambiar", description: error.message, variant: "destructive" });
    else { toast({ title: m.is_active ? `${m.medication_name} suspendido` : `${m.medication_name} reactivado` }); load(residentId); }
  };

  const active = medications.filter(m => m.is_active);
  const getTextContent = () => [
    `HB-F14: Medicamentos — ${resident?.full_name ?? ""}`,
    `Alergias: ${resident?.allergies || "Ninguna conocida"}`,
    ...medications.map(m => `${m.is_active ? "•" : "(suspendido)"} ${m.medication_name} ${m.concentration ?? ""} — ${m.dose ?? ""} — ${m.route ?? ""} — ${m.schedule ?? ""}`),
  ].join("\n");
  const getMedData = () => medications.map(m => ({
    Medicamento: m.medication_name, Concentración: m.concentration, Dosis: m.dose, Vía: m.route,
    Horario: m.schedule, Vence: m.expiry_date, Estado: m.is_active ? "Activo" : "Suspendido",
  }));

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F14: Medicamentos" subtitle="Fórmula vigente de cada residente" onBack={onBack} />
      <div ref={contentRef}>
        <Section>
          <Field label="Residente" required>
            <ResidentSelect residents={residents} loading={loading} value={residentId} onChange={id => { setResidentId(id); closeForm(); }} />
          </Field>
          {resident && (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <span><strong>EPS:</strong> {resident.eps || "Sin registrar"}</span>
              <span className={resident.allergies?.trim() ? "font-bold text-destructive" : ""}>
                <strong>Alergias:</strong> {resident.allergies?.trim() || "Ninguna conocida"}
              </span>
            </div>
          )}
        </Section>

        {residentId && !showForm && (
          <button type="button" onClick={() => setShowForm(true)}
            className="mb-4 flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm">
            <Plus size={18} /> Agregar medicamento
          </button>
        )}

        {showForm && (
          <Section title={editingId ? "Editar medicamento" : "Nuevo medicamento"}
            actions={<button type="button" onClick={closeForm} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"><X size={18} /></button>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Medicamento" required>
                <input value={form.medication_name} onChange={e => setForm(p => ({ ...p, medication_name: e.target.value }))} placeholder="Ej.: Losartán" className={inputCls} autoFocus />
              </Field>
              <Field label="Concentración">
                <input value={form.concentration} onChange={e => setForm(p => ({ ...p, concentration: e.target.value }))} placeholder="Ej.: 50 mg" className={inputCls} />
              </Field>
              <Field label="Dosis" required>
                <input value={form.dose} onChange={e => setForm(p => ({ ...p, dose: e.target.value }))} placeholder="Ej.: 1 tableta" className={inputCls} />
              </Field>
              <Field label="Horario" required hint="Escribe las horas (8:00 - 20:00) para que HB-F15 avise cuál dosis toca.">
                <input value={form.schedule} onChange={e => setForm(p => ({ ...p, schedule: e.target.value }))} placeholder="Ej.: 8:00 - 20:00" className={inputCls} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SCHEDULES.map(s => (
                    <button key={s} type="button" onClick={() => setForm(p => ({ ...p, schedule: s }))}
                      className={`min-h-[32px] rounded-lg border px-2 text-[11px] font-bold ${form.schedule === s ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{s}</button>
                  ))}
                </div>
              </Field>
              <div className="sm:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Vía</span>
                <ChoiceChips size="sm" options={ROUTES.map(v => ({ value: v, label: v }))} value={form.route} onChange={v => setForm(p => ({ ...p, route: v }))} />
              </div>
              <Field label="Fecha de la fórmula">
                <input type="date" value={form.prescription_date} max={today} onChange={e => setForm(p => ({ ...p, prescription_date: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Vence">
                <input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Indicaciones" className="sm:col-span-2">
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ej.: con alimentos, no triturar" className={inputCls} />
              </Field>
            </div>
            {allergy && (
              <div className="mt-3"><Notice tone="danger"><AlertTriangle size={14} className="mr-1 inline" />Atención: “{allergy}” aparece en las alergias del residente ({resident?.allergies}). Confirme con el médico antes de guardar.</Notice></div>
            )}
            {duplicate && (
              <div className="mt-3"><Notice tone="warning">Ya hay un {duplicate.medication_name} activo ({duplicate.dose}, {duplicate.schedule}). Si cambió la dosis, edite ese en vez de crear otro.</Notice></div>
            )}
            <ActionButtons inline onFinish={handleSave} saving={saving} missing={missing} label={editingId ? "Guardar cambios" : "Agregar a la fórmula"} />
          </Section>
        )}

        {residentId && (
          <div className="mb-6 space-y-3">
            <p className="text-sm font-bold text-foreground">{active.length} activo{active.length === 1 ? "" : "s"}{medications.length > active.length ? ` · ${medications.length - active.length} suspendido(s)` : ""}</p>
            {medications.map(m => {
              const expiry = daysToExpiry(m.expiry_date, today);
              return (
                <div key={m.id} className={`rounded-2xl border-2 bg-card p-4 ${m.is_active ? "border-border" : "border-dashed border-muted opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-black text-foreground">{m.medication_name} {m.concentration}</p>
                      <p className="text-sm text-muted-foreground">{[m.dose, m.route, m.schedule].filter(Boolean).join(" · ")}</p>
                      {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                      {m.is_active && expiry !== null && expiry <= 30 && (
                        <p className={`mt-1 text-xs font-bold ${expiry < 0 ? "text-destructive" : "text-amber-700"}`}>
                          {expiry < 0 ? `Vencido hace ${-expiry} días` : `Vence en ${expiry} días`}: pida la renovación de la fórmula
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => startEdit(m)} aria-label={`Editar ${m.medication_name}`} className="flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-primary/10"><Pencil size={16} /></button>
                      <button type="button" onClick={() => toggleActive(m)} aria-label={m.is_active ? "Suspender" : "Reactivar"}
                        className={`flex h-10 items-center gap-1 rounded-xl px-2 text-xs font-bold ${m.is_active ? "text-muted-foreground hover:bg-muted" : "text-emerald-700 hover:bg-emerald-500/10"}`}>
                        <Power size={14} /> {m.is_active ? "Suspender" : "Reactivar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {medications.length === 0 && <Notice>Sin medicamentos registrados. Toque “Agregar medicamento” para empezar la fórmula.</Notice>}
          </div>
        )}
      </div>
      {residentId && medications.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ExportButtons contentRef={contentRef} title={`HB-F14 Medicamentos ${resident?.full_name ?? ""}`} fileName={`medicamentos_${resident?.full_name ?? ""}`} data={getMedData()} textContent={getTextContent()} />
          <ShareButtons title={`HB-F14 Medicamentos ${resident?.full_name ?? ""}`} text={getTextContent()} />
        </div>
      )}
    </div>
  );
};

export default MedicationList;
