import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SignaturePad from "@/components/SignaturePad";
import { Sparkles, Loader2, Calendar, BarChart3, Users, HeartPulse, AlertTriangle, Pill, Pencil, Save } from "lucide-react";

interface Props { onBack: () => void; }

const NursingReport = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(weekAgo);
  const [dateTo, setDateTo] = useState(today);
  const [reportType, setReportType] = useState("semanal");
  const [report, setReport] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleRole, setResponsibleRole] = useState("");

  const generateReport = async () => {
    if (!user) return;
    setGenerating(true);
    setReport("");
    setStats(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-nursing-report", {
        body: { dateFrom, dateTo, reportType },
      });
      if (error) throw error;
      if (data?.report) {
        setReport(data.report);
        setStats(data.stats);
        setEditing(false);
      } else {
        toast({ title: "Sin datos", description: "No se encontraron registros para el período seleccionado.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Error generando informe", variant: "destructive" });
    }
    setGenerating(false);
  };

  const setPresetRange = (type: string) => {
    const now = new Date();
    setReportType(type);
    if (type === "semanal") {
      setDateFrom(new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0]);
      setDateTo(now.toISOString().split("T")[0]);
    } else if (type === "mensual") {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
      setDateTo(now.toISOString().split("T")[0]);
    }
  };

  const getReportText = () => {
    const header = `HOGAR BELÉN - JUNTOS CUIDAMOS MEJOR\nInforme de Enfermería\n${dateFrom} a ${dateTo}\n\n`;
    return header + report;
  };

  const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
    <div className={`flex items-center gap-3 p-4 rounded-xl border border-border bg-${color}/5`}>
      <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center`}>
        <Icon size={18} className={`text-${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-bold uppercase">{label}</p>
        <p className="text-lg font-black text-foreground">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <FormHeader title="📊 Informe de Enfermería con IA" subtitle="Generación automática de informes periódicos completos" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap gap-3 mb-4">
          {["semanal", "mensual", "personalizado"].map((t) => (
            <button key={t} onClick={() => setPresetRange(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors min-h-[40px] touch-manipulation ${
                reportType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>
              {t === "semanal" ? "📅 Semanal" : t === "mensual" ? "📆 Mensual" : "🔧 Personalizado"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setReportType("personalizado"); }}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setReportType("personalizado"); }}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
        </div>

        <button onClick={generateReport} disabled={generating}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px] touch-manipulation">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? "Generando informe..." : "Generar Informe con IA"}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard icon={Users} label="Residentes" value={stats.totalResidents} color="primary" />
          <StatCard icon={Calendar} label="Bitácoras" value={stats.totalLogs} color="primary" />
          <StatCard icon={HeartPulse} label="Signos Vitales" value={stats.totalVitals} color="primary" />
          <StatCard icon={AlertTriangle} label="Incidentes" value={stats.totalIncidents} color="destructive" />
          <StatCard icon={Pill} label="Citas Médicas" value={stats.totalAppointments} color="primary" />
          <StatCard icon={BarChart3} label="Nutrición Prom." value={`${stats.avgNutrition}%`} color="primary" />
        </div>
      )}

      {report && (
        <div className="space-y-4 animate-fade-in">
          <div ref={contentRef} className="bg-card border border-border rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-black text-foreground">Informe Generado</h3>
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors touch-manipulation px-3 py-2 rounded-lg hover:bg-primary/5"
              >
                {editing ? <><Save size={14} /> Finalizar edición</> : <><Pencil size={14} /> Editar informe</>}
              </button>
            </div>

            {editing ? (
              <textarea
                value={report}
                onChange={e => setReport(e.target.value)}
                className="w-full min-h-[400px] p-4 rounded-xl border border-input bg-background text-sm font-mono leading-relaxed resize-y focus:ring-2 focus:ring-ring focus:outline-none"
                autoFocus
              />
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {report.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-black text-foreground mt-6 mb-3">{line.replace("# ", "")}</h1>;
                  if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-foreground mt-5 mb-2">{line.replace("## ", "")}</h2>;
                  if (line.startsWith("### ")) return <h3 key={i} className="text-base font-bold text-foreground mt-4 mb-2">{line.replace("### ", "")}</h3>;
                  if (line.startsWith("- ")) return <p key={i} className="text-sm text-muted-foreground ml-4 mb-1">• {line.replace("- ", "")}</p>;
                  if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-sm font-bold text-foreground mb-1">{line.replace(/\*\*/g, "")}</p>;
                  if (line.startsWith("---")) return <hr key={i} className="my-4 border-border" />;
                  if (line.trim() === "") return <div key={i} className="h-2" />;
                  return <p key={i} className="text-sm text-foreground/80 leading-relaxed mb-2">{line.replace(/\*\*(.*?)\*\*/g, "$1")}</p>;
                })}
              </div>
            )}
          </div>

          {/* Responsable + Firma */}
          <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <input
                placeholder="Nombre del responsable"
                value={responsibleName}
                onChange={e => setResponsibleName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm"
              />
              <input
                placeholder="Cargo / Rol"
                value={responsibleRole}
                onChange={e => setResponsibleRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Firma digital</p>
              <SignaturePad label="Firma" value={signature || undefined} onChange={setSignature} />
            </div>
          </div>

          {/* Export & Share — always available for re-export after editing */}
          <div className="flex flex-wrap items-center gap-3">
            <ExportButtons
              contentRef={contentRef}
              title={`Informe Enfermería ${dateFrom} a ${dateTo}`}
              fileName={`informe_enfermeria_${dateFrom}_${dateTo}`}
              textContent={getReportText()}
              signatureDataUrl={signature}
              responsibleName={responsibleName}
              responsibleRole={responsibleRole}
            />
            <ShareButtons title={`Informe Enfermería ${dateFrom} a ${dateTo}`} text={getReportText()} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NursingReport;
