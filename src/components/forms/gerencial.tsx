import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SignaturePad from "@/components/SignaturePad";
import { Section, Field, Notice, inputCls } from "@/components/forms/ui";
import { MONTHS_ES } from "@/lib/form-helpers";

/**
 * Pieces shared by the managerial forms HB-G01 to HB-G05: the period bar
 * (with a warning when the period was already filed), the responsible name
 * prefilled from the profile, and the two signatures that are now saved.
 */

export type PeriodKind = "month" | "quarter" | "semester";
type GerencialTable = "waste_management" | "pest_control" | "hazardous_waste" | "sanitation_records" | "emergency_plans";

const PERIOD_COLUMN: Record<PeriodKind, "period_month" | "period_quarter" | "period_semester"> = {
  month: "period_month", quarter: "period_quarter", semester: "period_semester",
};

const periodOptions = (kind: PeriodKind) =>
  kind === "month" ? MONTHS_ES.map((m, i) => ({ value: i + 1, label: m }))
  : kind === "quarter" ? ["Ene – Mar", "Abr – Jun", "Jul – Sep", "Oct – Dic"].map((m, i) => ({ value: i + 1, label: `Trimestre ${i + 1} (${m})` }))
  : [{ value: 1, label: "1er semestre (Ene – Jun)" }, { value: 2, label: "2do semestre (Jul – Dic)" }];

export const PeriodBar = ({ kind, table, period, year, onPeriod, onYear, responsible, onResponsible }: {
  kind: PeriodKind; table: GerencialTable; period: number; year: number;
  onPeriod: (p: number) => void; onYear: (y: number) => void;
  responsible?: string; onResponsible?: (name: string) => void;
}) => {
  const [existing, setExisting] = useState(0);
  const thisYear = new Date().getFullYear();

  useEffect(() => {
    let active = true;
    // The dynamic table name keeps the typed client from narrowing the filter columns
    const query = supabase.from(table).select("id", { count: "exact", head: true }) as unknown as {
      eq: (c: string, v: number) => { eq: (c: string, v: number) => Promise<{ count: number | null }> };
    };
    query.eq(PERIOD_COLUMN[kind], period).eq("period_year", year).then(({ count }) => { if (active) setExisting(count ?? 0); });
    return () => { active = false; };
  }, [table, kind, period, year]);

  return (
    <Section>
      <div className={`grid gap-4 ${onResponsible ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <div className="grid grid-cols-[1fr_auto] gap-3 sm:col-span-2 sm:grid-cols-2">
          <Field label={kind === "month" ? "Mes" : kind === "quarter" ? "Trimestre" : "Semestre"}>
            <select value={period} onChange={e => onPeriod(+e.target.value)} className={inputCls}>
              {periodOptions(kind).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Año">
            <select value={year} onChange={e => onYear(+e.target.value)} className={inputCls}>
              {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>
        {onResponsible && (
          <Field label="Responsable" required>
            <input value={responsible ?? ""} onChange={e => onResponsible(e.target.value)} className={inputCls} />
          </Field>
        )}
      </div>
      {existing > 0 && (
        <div className="mt-3"><Notice tone="warning">
          Este periodo ya tiene {existing === 1 ? "un registro" : `${existing} registros`}. Puede consultarlo en el historial al final; si guarda, se agrega uno nuevo.
        </Notice></div>
      )}
    </Section>
  );
};

/** Responsible name that starts with the signed-in user's name. */
export const useResponsible = () => {
  const { profile } = useAuth();
  const [responsible, setResponsible] = useState("");
  useEffect(() => {
    if (profile?.full_name) setResponsible(r => r || profile.full_name);
  }, [profile?.full_name]);
  return [responsible, setResponsible] as const;
};

export type GerencialSigs = { responsible: string | null; coordinator: string | null };
export const emptySigs = (): GerencialSigs => ({ responsible: null, coordinator: null });

export const GerencialSignatures = ({ value, onChange }: { value: GerencialSigs; onChange: (v: GerencialSigs) => void }) => (
  <Section title="Firmas" hint="La firma del responsable es obligatoria; el Vo.Bo. del coordinador puede agregarse después.">
    <div className="flex flex-wrap justify-center gap-6">
      <SignaturePad label="Responsable" value={value.responsible ?? undefined} onChange={v => onChange({ ...value, responsible: v })} />
      <SignaturePad label="Vo.Bo. Coordinador" value={value.coordinator ?? undefined} onChange={v => onChange({ ...value, coordinator: v })} />
    </div>
  </Section>
);

const FIELD_LABELS: Record<string, string> = {
  fecha: "Fecha", empresa: "Empresa", tipo: "Tipo", cantidad: "Cantidad (kg)", manifiesto: "N° manifiesto",
  recibido: "Recibido por", certificado: "N° certificado", area: "Área", producto: "Producto",
  concentracion: "Concentración", responsable: "Responsable", plaga: "Plaga", nivel: "Nivel",
  accion: "Acción tomada", verificado: "Verificado por", descripcion: "Descripción", recipiente: "Recipiente",
  personal: "Personal involucrado", reporte_arl: "Reporte ARL", nombre: "Nombre", cargo: "Cargo", rol: "Rol",
  tiempo_evacuacion: "Tiempo evacuación (min)", participacion: "Participantes", observaciones: "Observaciones",
  evaluador: "Evaluador", procedencia: "Procedencia", cloro: "Cloro residual (mg/L)", bacteriologico: "Bacteriológico",
};

/** Friendly placeholder for a row field stored under a short key. */
export const fieldLabel = (key: string) =>
  FIELD_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");

/** Rows where at least one field other than the defaults was filled in. */
export const filledRows = <T extends Record<string, unknown>>(rows: T[], ignore: string[] = []) =>
  rows.filter(r => Object.entries(r).some(([k, v]) => !ignore.includes(k) && typeof v === "string" && v.trim() !== ""));
