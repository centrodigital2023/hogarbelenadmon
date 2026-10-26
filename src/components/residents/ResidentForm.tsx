import { useState } from "react";
import { Save, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { formatAge, parseDateOnly } from "@/lib/resident-age";
import { errorMessage } from "@/lib/errors";
import { STATUS_LABELS, type ResidentRecord } from "./types";

type Status = Database["public"]["Enums"]["resident_status"];

const FIELDS = [
  "full_name", "document_id", "birth_date", "birth_place", "gender", "blood_type", "spiritual_preference",
  "eps", "allergies", "special_diet", "treating_doctor_name", "treating_doctor_phone",
  "emergency_contact_1_name", "emergency_contact_1_phone", "emergency_contact_1_relation",
  "emergency_contact_2_name", "emergency_contact_2_phone", "emergency_contact_2_relation",
  "responsible_family_name", "responsible_family_document", "responsible_family_phone", "notes",
] as const;
type Field = typeof FIELDS[number];
type FormState = Record<Field, string> & { status: Status };


const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const toForm = (r?: ResidentRecord | null): FormState => ({
  ...Object.fromEntries(FIELDS.map((f) => [f, (r?.[f] as string | null) ?? ""])) as Record<Field, string>,
  gender: r?.gender || "M",
  status: (r?.status as Status) || "prueba",
});

const input = "mt-1 w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20";
const labelCls = "text-[10px] font-bold text-muted-foreground uppercase tracking-wider";

interface Props {
  resident?: ResidentRecord | null;
  onSaved: (id: string) => void;
  onCancel: () => void;
}

/** Ficha completa del residente: crear o editar todos los datos, con edad calculada en vivo. */
const ResidentForm = ({ resident, onSaved, onCancel }: Props) => {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => toForm(resident));
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FormState, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const birth = parseDateOnly(form.birth_date);
  const birthError = form.birth_date && (!birth || birth > new Date()) ? "La fecha de nacimiento no es válida" : null;

  const text = (k: Field, label: string, opts: { type?: string; placeholder?: string; full?: boolean } = {}) => (
    <div className={opts.full ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <label className={labelCls} htmlFor={`rf-${k}`}>{label}</label>
      <input id={`rf-${k}`} type={opts.type ?? "text"} value={form[k]} placeholder={opts.placeholder}
        inputMode={opts.type === "tel" ? "tel" : undefined}
        onChange={(e) => set(k, e.target.value)} className={input} required={k === "full_name"} />
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (birthError) return;
    setSaving(true);
    const payload = Object.fromEntries(FIELDS.map((f) => [f, form[f].trim() || null])) as Record<Field, string | null>;
    try {
      if (resident) {
        const { error } = await supabase.from("residents").update({ ...payload, full_name: form.full_name.trim(), status: form.status }).eq("id", resident.id);
        if (error) throw error;
        toast({ title: "✅ Ficha actualizada", description: form.full_name });
        onSaved(resident.id);
      } else {
        const today = new Date();
        const trialEnd = new Date(today);
        trialEnd.setDate(trialEnd.getDate() + 15);
        const { data, error } = await supabase.from("residents").insert({
          ...payload, full_name: form.full_name.trim(),
          admission_date: localIso(today), trial_end_date: localIso(trialEnd),
        }).select("id").single();
        if (error) throw error;
        toast({ title: "✅ Residente registrado", description: "Ahora puede subir sus documentos para completar la ficha con IA." });
        onSaved(data.id);
      }
    } catch (err) {
      toast({ title: "No se pudo guardar", description: errorMessage(err), variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 sm:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-foreground">{resident ? "✏️ Editar ficha" : "➕ Nuevo residente"}</h3>
        <button type="button" onClick={onCancel} className="p-2 text-muted-foreground hover:text-foreground rounded-lg" aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>

      <section>
        <h4 className="text-xs font-black text-foreground mb-2">Datos personales</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {text("full_name", "Nombre completo *", { full: true })}
          {text("document_id", "Documento (cédula)")}
          <div>
            <label className={labelCls} htmlFor="rf-birth_date">Fecha de nacimiento</label>
            <input id="rf-birth_date" type="date" value={form.birth_date} max={localIso(new Date())}
              onChange={(e) => set("birth_date", e.target.value)} className={input} />
            <p className={`text-[11px] mt-1 font-semibold ${birthError ? "text-destructive" : "text-primary"}`}>
              {birthError ?? (form.birth_date ? `Edad: ${formatAge(form.birth_date)} (se actualiza sola)` : "La edad se calcula automáticamente")}
            </p>
          </div>
          {text("birth_place", "Lugar de nacimiento")}
          <div>
            <label className={labelCls} htmlFor="rf-gender">Género</label>
            <select id="rf-gender" value={form.gender} onChange={(e) => set("gender", e.target.value)} className={input}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="rf-blood">Tipo de sangre</label>
            <select id="rf-blood" value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)} className={input}>
              <option value="">Sin registrar</option>
              {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          {text("spiritual_preference", "Preferencia espiritual")}
          {resident && (
            <div>
              <label className={labelCls} htmlFor="rf-status">Estado</label>
              <select id="rf-status" value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
        </div>
      </section>

      <section>
        <h4 className="text-xs font-black text-foreground mb-2">Salud y alimentación</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {text("eps", "EPS")}
          {text("allergies", "Alergias", { placeholder: "Ej: Penicilina, o 'Niega alergias'" })}
          {text("special_diet", "Dieta especial", { placeholder: "Ej: Hiposódica, blanda" })}
          {text("treating_doctor_name", "Médico tratante")}
          {text("treating_doctor_phone", "Teléfono del médico", { type: "tel" })}
        </div>
      </section>

      <section>
        <h4 className="text-xs font-black text-foreground mb-2">Contactos de emergencia</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {text("emergency_contact_1_name", "Contacto 1 · Nombre")}
          {text("emergency_contact_1_phone", "Contacto 1 · Teléfono", { type: "tel" })}
          {text("emergency_contact_1_relation", "Contacto 1 · Parentesco")}
          {text("emergency_contact_2_name", "Contacto 2 · Nombre")}
          {text("emergency_contact_2_phone", "Contacto 2 · Teléfono", { type: "tel" })}
          {text("emergency_contact_2_relation", "Contacto 2 · Parentesco")}
        </div>
      </section>

      <section>
        <h4 className="text-xs font-black text-foreground mb-2">Familiar responsable</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {text("responsible_family_name", "Nombre")}
          {text("responsible_family_document", "Documento")}
          {text("responsible_family_phone", "Teléfono", { type: "tel" })}
        </div>
      </section>

      <div>
        <label className={labelCls} htmlFor="rf-notes">Observaciones (diagnósticos, higiene, seguridad)</label>
        <textarea id="rf-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)}
          className={`${input} min-h-[90px] resize-y`} />
      </div>

      <button type="submit" disabled={saving || !!birthError}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase hover:opacity-90 min-h-[48px] disabled:opacity-50">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {resident ? "Guardar cambios" : "Registrar residente"}
      </button>
    </form>
  );
};

export default ResidentForm;
