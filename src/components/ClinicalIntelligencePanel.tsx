import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, ChevronDown, ClipboardCheck, Loader2, RefreshCw, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildClinicalInsights,
  type ResidentInsight,
  type RiskLevel,
  type VitalRecord,
} from "@/lib/clinical-intelligence";

const LEVEL_STYLES: Record<RiskLevel, { dot: string; badge: string; label: string }> = {
  alto: { dot: "bg-destructive", badge: "bg-destructive/10 text-destructive", label: "Riesgo alto" },
  medio: { dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300", label: "Riesgo medio" },
  bajo: { dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", label: "Estable" },
};

const VISIBLE_BY_DEFAULT = 5;

/**
 * Centro de Inteligencia Clínica: prioriza a los residentes según escalas,
 * signos vitales, caídas, deterioro y peso. Todo se calcula en el dispositivo.
 */
const ClinicalIntelligencePanel = () => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<ResidentInsight[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sinceDate = since.toISOString().slice(0, 10);
    const [residents, assessments, logs, vitals, incidents] = await Promise.all([
      supabase.from("residents").select("id, full_name").in("status", ["prueba", "permanente"]).order("full_name"),
      supabase.from("geriatric_assessments").select("resident_id, test_key, score, assessment_date, created_at"),
      supabase
        .from("daily_logs")
        .select("resident_id, log_date, created_at, spo2, temperature, heart_rate, glucose, blood_pressure, weight")
        .gte("log_date", sinceDate),
      supabase
        .from("vital_signs")
        .select("resident_id, record_date, created_at, spo2, temperature, heart_rate, glucose, blood_pressure, weight")
        .gte("record_date", sinceDate),
      supabase.from("incidents").select("resident_id, incident_type, incident_datetime").gte("incident_datetime", since.toISOString()),
    ]);

    if (residents.error || assessments.error) {
      setError(true);
      setLoading(false);
      return;
    }

    const vitalRecords: VitalRecord[] = [
      ...(logs.data ?? []).map((l) => ({ ...l, date: l.created_at || l.log_date })),
      ...(vitals.data ?? []).map((v) => ({ ...v, date: v.created_at || v.record_date })),
    ];

    setInsights(
      buildClinicalInsights(residents.data ?? [], {
        assessments: assessments.data ?? [],
        vitals: vitalRecords,
        incidents: (incidents.data ?? []).filter((i) => i.resident_id),
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const list = insights ?? [];
    return {
      alto: list.filter((i) => i.level === "alto").length,
      medio: list.filter((i) => i.level === "medio").length,
      deterioros: list.reduce((n, i) => n + i.deteriorations.length, 0),
      pendientes: list.filter((i) => i.pending.length > 0).length,
    };
  }, [insights]);

  if (loading && !insights) {
    return (
      <section className="mb-6 rounded-2xl border border-border bg-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 size={18} className="animate-spin text-primary" />
        Analizando a los residentes…
      </section>
    );
  }

  if (error || !insights) {
    return (
      <section className="mb-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground flex items-center justify-between gap-3">
        No se pudo cargar el análisis clínico.
        <button onClick={load} className="text-xs font-bold text-primary hover:underline">Reintentar</button>
      </section>
    );
  }

  if (insights.length === 0) return null;

  const visible = showAll ? insights : insights.slice(0, VISIBLE_BY_DEFAULT);

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card overflow-hidden" aria-labelledby="cic-title">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h3 id="cic-title" className="text-sm font-black text-foreground flex items-center gap-2">
            <Brain size={18} className="text-primary" />
            Centro de Inteligencia Clínica
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prioridades de hoy según escalas, signos vitales, caídas, peso y evolución.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Actualizar análisis"
          className="p-2 rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 pb-4">
        {[
          { label: "Riesgo alto", value: summary.alto, className: "text-destructive" },
          { label: "Riesgo medio", value: summary.medio, className: "text-amber-600 dark:text-amber-400" },
          { label: "Deterioros", value: summary.deterioros, className: "text-foreground" },
          { label: "Por reevaluar", value: summary.pendientes, className: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-muted/60 px-3 py-2">
            <p className={`text-xl font-black ${s.className}`}>{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {visible.map((insight) => {
          const style = LEVEL_STYLES[insight.level];
          const open = openId === insight.resident.id;
          return (
            <li key={insight.resident.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : insight.resident.id)}
                aria-expanded={open}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted/40 min-h-[56px]"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot}`} aria-hidden />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-foreground truncate">{insight.resident.full_name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {insight.reasons[0] ?? "Sin alertas activas"}
                    {insight.reasons.length > 1 ? ` · +${insight.reasons.length - 1} más` : ""}
                  </span>
                </span>
                <span className={`hidden sm:inline text-[10px] font-black uppercase rounded-full px-2 py-0.5 ${style.badge}`}>
                  {style.label}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="px-5 pb-4 pl-10 space-y-3 animate-fade-in">
                  {insight.reasons.length > 0 && (
                    <ul className="space-y-1">
                      {insight.reasons.map((r) => (
                        <li key={r} className="text-xs text-foreground flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                  {insight.deteriorations.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <TrendingDown size={14} className="text-destructive" />
                      Revise el plan de cuidado: hay escalas que empeoraron desde la valoración anterior.
                    </p>
                  )}
                  {insight.pending.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <ClipboardCheck size={14} className="text-primary shrink-0 mt-0.5" />
                      <span>
                        Por reevaluar: {insight.pending.map((p) => p.testName.split(" (")[0]).join(", ")}
                      </span>
                    </p>
                  )}
                  <button
                    onClick={() => navigate(`/?modulo=2&residente=${insight.resident.id}`)}
                    className="text-xs font-black uppercase tracking-wider text-primary hover:underline"
                  >
                    Abrir valoración →
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {insights.length > VISIBLE_BY_DEFAULT && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full border-t border-border py-3 text-xs font-bold text-primary hover:bg-muted/40"
        >
          {showAll ? "Ver menos" : `Ver los ${insights.length} residentes`}
        </button>
      )}
    </section>
  );
};

export default ClinicalIntelligencePanel;
