import { useState } from "react";
import { ArrowLeft, Pencil, Cake, Phone, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResidentForm from "./ResidentForm";
import { STATUS_LABELS } from "./types";
import ResidentDocuments from "./ResidentDocuments";
import { CATEGORY_ICONS, SEVERITY_STYLES } from "@/components/attention-styles";
import { useAttentionNavigation } from "@/hooks/useAttentionNavigation";
import { formatAge, nextBirthday } from "@/lib/resident-age";
import { profileCompleteness, type AttentionItem, type AttentionResident } from "@/lib/resident-attention";
import type { ResidentRecord } from "./types";

interface Props {
  resident: ResidentRecord;
  attention: AttentionItem[];
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onChanged: () => void;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className={`text-sm ${value ? "text-foreground" : "text-muted-foreground/60 italic"}`}>{value || "Sin registrar"}</p>
  </div>
);

const FORM_LINKS = [
  { label: "HB-F1 Checklist de admisión", modulo: "1", form: "HB-F1" },
  { label: "HB-F22 Historia de vida", modulo: "1", form: "HB-F22" },
  { label: "Valoración geriátrica", modulo: "2" },
  { label: "HB-F14 Medicamentos", modulo: "5", form: "HB-F14" },
  { label: "HB-F17 Citas médicas", modulo: "6", form: "HB-F17" },
  { label: "HB-F10 Atención psicosocial", modulo: "4", form: "HB-F10" },
  { label: "Kit de higiene", modulo: "1", form: "HYGIENE-KIT" },
  { label: "HB-F20 Incidentes y caídas", modulo: "8", form: "HB-F20" },
];

/** Hoja de vida del residente: datos, documentos con IA y pendientes en un solo lugar. */
const ResidentProfile = ({ resident: r, attention, canEdit, canDelete, onBack, onChanged }: Props) => {
  const [editing, setEditing] = useState(false);
  const goTo = useAttentionNavigation();
  const completeness = profileCompleteness(r as unknown as AttentionResident);
  const bday = nextBirthday(r.birth_date);
  const link = (modulo: string, form?: string) => goTo({ modulo, form, residente: r.id });

  if (editing) {
    return <ResidentForm resident={r} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground min-h-[40px]">
        <ArrowLeft size={16} /> Todos los residentes
      </button>

      {/* Encabezado */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black shrink-0">
          {initials(r.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-foreground">{r.full_name}</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{formatAge(r.birth_date)}</span>
            {" · "}{r.document_id ? `CC ${r.document_id}` : "Sin documento"}{" · "}{STATUS_LABELS[r.status] ?? r.status}
          </p>
          {bday && bday.days <= 7 && (
            <p className="text-xs font-bold text-cat-mood mt-1 flex items-center gap-1">
              <Cake size={13} /> {bday.days === 0 ? `¡Hoy cumple ${bday.turning} años!` : `Cumple ${bday.turning} años en ${bday.days} día(s)`}
            </p>
          )}
          <div className="mt-3 max-w-xs">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1"><span>Ficha completa</span><span>{completeness}%</span></div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${completeness === 100 ? "bg-cat-nutritional" : completeness >= 60 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${completeness}%` }} />
            </div>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => setEditing(true)}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase min-h-[48px]">
            <Pencil size={15} /> Editar ficha
          </button>
        )}
      </div>

      <Tabs defaultValue={attention.some((a) => a.severity !== "baja") ? "pendientes" : "documentos"}>
        <TabsList className="w-full grid grid-cols-3 h-auto rounded-xl">
          <TabsTrigger value="documentos" className="py-2 text-xs font-bold">Documentos e IA</TabsTrigger>
          <TabsTrigger value="ficha" className="py-2 text-xs font-bold">Ficha</TabsTrigger>
          <TabsTrigger value="pendientes" className="py-2 text-xs font-bold">
            Pendientes {attention.length > 0 && <span className="ml-1 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px]">{attention.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="mt-4">
          <ResidentDocuments resident={r} canDelete={canDelete} onChanged={onChanged} />
        </TabsContent>

        <TabsContent value="ficha" className="mt-4 space-y-4">
          <section className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Fecha de nacimiento" value={r.birth_date} />
            <Field label="Edad" value={formatAge(r.birth_date)} />
            <Field label="Lugar de nacimiento" value={r.birth_place} />
            <Field label="Género" value={r.gender === "F" ? "Femenino" : r.gender === "M" ? "Masculino" : null} />
            <Field label="Tipo de sangre" value={r.blood_type} />
            <Field label="Ingreso" value={r.admission_date} />
            <Field label="EPS" value={r.eps} />
            <Field label="Alergias" value={r.allergies} />
            <Field label="Dieta especial" value={r.special_diet} />
            <Field label="Médico tratante" value={[r.treating_doctor_name, r.treating_doctor_phone].filter(Boolean).join(" · ")} />
            <Field label="Preferencia espiritual" value={r.spiritual_preference} />
            <Field label="Familiar responsable" value={[r.responsible_family_name, r.responsible_family_phone].filter(Boolean).join(" · ")} />
          </section>
          <section className="bg-card border border-border rounded-2xl p-5 space-y-2">
            <h4 className="text-xs font-black text-foreground">Contactos de emergencia</h4>
            {[1, 2].map((n) => {
              const name = r[`emergency_contact_${n}_name` as keyof ResidentRecord] as string | null;
              const phone = r[`emergency_contact_${n}_phone` as keyof ResidentRecord] as string | null;
              const rel = r[`emergency_contact_${n}_relation` as keyof ResidentRecord] as string | null;
              if (!name && !phone) return <p key={n} className="text-xs text-muted-foreground italic">Contacto {n}: sin registrar</p>;
              return (
                <div key={n} className="flex items-center justify-between gap-2">
                  <p className="text-sm text-foreground">{name}{rel ? ` (${rel})` : ""}</p>
                  {phone && <a href={`tel:${phone}`} className="flex items-center gap-1 text-xs font-bold text-primary"><Phone size={13} />{phone}</a>}
                </div>
              );
            })}
          </section>
          {r.notes && (
            <section className="bg-card border border-border rounded-2xl p-5">
              <h4 className="text-xs font-black text-foreground mb-1">Observaciones</h4>
              <p className="text-sm text-foreground whitespace-pre-line">{r.notes}</p>
            </section>
          )}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FORM_LINKS.map((f) => (
              <button key={f.label} onClick={() => link(f.modulo, f.form)}
                className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground hover:border-primary min-h-[48px]">
                {f.label} <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            ))}
          </section>
        </TabsContent>

        <TabsContent value="pendientes" className="mt-4 space-y-2">
          {attention.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">🎉 Todo al día para {r.full_name}.</p>}
          {attention.map((item) => {
            const Icon = CATEGORY_ICONS[item.category];
            const style = SEVERITY_STYLES[item.severity];
            const isHere = item.target.modulo === "residentes";
            return (
              <button key={item.id} onClick={() => !isHere && goTo(item.target)} disabled={isHere}
                className="w-full flex items-start gap-3 bg-card border border-border rounded-xl p-3 text-left enabled:hover:border-primary">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.chip}`}><Icon size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{item.title}</span>
                    <span className={`text-[10px] font-bold px-1.5 rounded ${style.chip}`}>{style.label}</span>
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">{item.detail}</span>
                </span>
                {!isHere && <ChevronRight size={14} className="text-muted-foreground mt-2" />}
              </button>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResidentProfile;
