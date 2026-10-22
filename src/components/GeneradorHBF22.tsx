/**
 * COMPONENTE: Análisis clínico HB-F22
 * Correlaciona las escalas aplicadas al residente y muestra al instante
 * perfil, alertas y plan de cuidado, con exportación PDF / Word / Excel.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  HeartPulse,
  Loader2,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TESTS_GERIATRICOS } from "@/data/tests-geriatricos";
import {
  buildHBF22Report,
  NOT_ASSESSED,
  type AssessmentResults,
  type HBF22Report,
  type RiskAlert,
} from "@/lib/hb-f22-report";
import { exportHBF22Excel, exportHBF22PDF, exportHBF22Word } from "@/lib/hb-f22-export";

interface GeneradorHBF22Props {
  residentId: string;
  residentName: string;
  residentAge?: number;
  residentGender?: string;
  residentDocId?: string;
  assessmentResults: AssessmentResults;
  professionalName: string;
  professionalRole: string;
  professionalNit?: string;
  onReportGenerated?: (report: HBF22Report) => void;
}

type ExportFormat = "pdf" | "word" | "excel";

const LEVEL_STYLES: Record<RiskAlert["level"], { label: string; className: string }> = {
  HIGH: { label: "Alto", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  MODERATE: { label: "Moderado", className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  LOW: { label: "Bajo", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
};

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

// The report summary marks key findings with **bold**; render them as <strong>
const renderSummary = (text: string) =>
  text.split(/(\*\*.+?\*\*)/g).map((part, i) =>
    part.startsWith("**") ? (
      <strong key={i} className="text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );

const stripEmoji = (text: string) =>
  text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*/gu, "").trim();

export const GeneradorHBF22 = ({
  residentId,
  residentName,
  residentAge,
  residentGender,
  residentDocId,
  assessmentResults,
  professionalName,
  professionalRole,
  professionalNit,
  onReportGenerated,
}: GeneradorHBF22Props) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [openPlan, setOpenPlan] = useState<number | null>(0);

  const completedScales = Object.keys(assessmentResults).length;
  const totalScales = Object.keys(TESTS_GERIATRICOS).length;

  // The analysis is deterministic, so it is recomputed instantly whenever scales change
  const report = useMemo(() => {
    if (completedScales === 0) return null;
    return buildHBF22Report(
      { id: residentId, fullName: residentName, documentId: residentDocId || "", age: residentAge, gender: residentGender },
      assessmentResults,
      { name: professionalName, role: professionalRole, nit: professionalNit }
    );
  }, [
    assessmentResults,
    completedScales,
    professionalName,
    professionalNit,
    professionalRole,
    residentAge,
    residentDocId,
    residentGender,
    residentId,
    residentName,
  ]);

  const handleExport = async (format: ExportFormat) => {
    if (!report) return;
    const fileName = `HBF22_${residentName.replace(/\s/g, "_")}`;
    setExporting(format);
    try {
      if (format === "pdf") await exportHBF22PDF(report, fileName);
      if (format === "word") await exportHBF22Word(report, fileName);
      if (format === "excel") await exportHBF22Excel(report, fileName);
      onReportGenerated?.(report);
      toast({ title: "Informe descargado", description: `HB-F22 de ${residentName} en ${format.toUpperCase()}.` });
    } catch (error) {
      console.error(`Error exportando ${format}:`, error);
      toast({ title: "Error", description: `No se pudo exportar a ${format.toUpperCase()}.`, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  if (!report) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <Stethoscope className="mx-auto mb-2 text-muted-foreground" size={28} />
        <p className="text-sm font-bold text-foreground">Aún no hay escalas aplicadas</p>
        <p className="text-xs text-muted-foreground mt-1">
          Aplique la primera escala y el análisis clínico aparecerá aquí automáticamente.
        </p>
      </div>
    );
  }

  const highAlerts = report.riskAlerts.filter((a) => a.level === "HIGH").length;

  return (
    <div className="space-y-4">
      {/* Progreso de escalas */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1.5">
          <span>Escalas aplicadas</span>
          <span>
            {completedScales} de {totalScales}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(100, (completedScales / totalScales) * 100)}%` }}
          />
        </div>
      </div>

      {/* Perfil clínico */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Dependencia (ABVD)", value: report.correlations.dependencyProfile, icon: <HeartPulse size={16} /> },
          { label: "Fragilidad", value: report.correlations.fragilityStatus, icon: <ShieldCheck size={16} /> },
          {
            label: "Alertas de riesgo alto",
            value: highAlerts === 0 ? "Ninguna" : String(highAlerts),
            icon: <AlertTriangle size={16} />,
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {item.icon}
              {item.label}
            </p>
            <p
              className={`mt-1 text-sm font-black ${
                item.value === NOT_ASSESSED ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Resumen ejecutivo */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Resumen ejecutivo</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{renderSummary(report.summary)}</p>
      </div>

      {/* Alertas */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Alertas detectadas ({report.riskAlerts.length})
        </p>
        {report.riskAlerts.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            Sin alertas en las escalas aplicadas. ¡Buen trabajo de cuidado!
          </div>
        ) : (
          report.riskAlerts.map((alert, idx) => (
            <div key={idx} className={`rounded-xl border p-3 ${LEVEL_STYLES[alert.level].className}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-black">{stripEmoji(alert.message)}</p>
                <span className="shrink-0 rounded-full bg-background/70 px-2 py-0.5 text-[9px] font-black uppercase">
                  {LEVEL_STYLES[alert.level].label} · {alert.scale}
                  {alert.currentValue !== undefined ? ` ${alert.currentValue}` : ""}
                </span>
              </div>
              {alert.recommendation && <p className="mt-1 text-[11px] text-foreground/80">{alert.recommendation}</p>}
            </div>
          ))
        )}
      </div>

      {/* Plan de cuidado */}
      {report.carePlan.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Plan de cuidado sugerido ({report.carePlan.length})
          </p>
          {report.carePlan.map((plan, idx) => {
            const open = openPlan === idx;
            return (
              <div key={plan.title} className="rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpenPlan(open ? null : idx)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left min-h-[48px]"
                >
                  <span>
                    <span className="block text-xs font-black text-foreground">{plan.title}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      Prioridad {PRIORITY_LABEL[plan.priority] ?? plan.priority} · {plan.scales.join(", ")}
                    </span>
                  </span>
                  <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="border-t border-border px-3 pb-3 pt-2">
                    <p className="text-[11px] text-muted-foreground mb-2">{plan.description}</p>
                    <ul className="space-y-1">
                      {plan.interventions.map((item) => (
                        <li key={item} className="flex gap-2 text-[11px] text-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Exportación */}
      <div className="grid grid-cols-3 gap-2">
        {(["pdf", "word", "excel"] as const).map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => handleExport(format)}
            disabled={exporting !== null}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-foreground hover:border-primary hover:text-primary disabled:opacity-50 min-h-[44px]"
          >
            {exporting === format ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {format === "word" ? "Word" : format.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Análisis automático basado en los puntos de corte validados de cada escala. Apoya, no reemplaza, el criterio
        clínico del profesional.
      </p>
    </div>
  );
};

export default GeneradorHBF22;
