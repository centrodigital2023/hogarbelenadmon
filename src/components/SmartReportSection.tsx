import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, History, ChevronDown, ChevronUp } from "lucide-react";
import ExportButtons from "./ExportButtons";
import ShareButtons from "./ShareButtons";
import SignaturePad from "./SignaturePad";

interface SmartReportSectionProps {
  module: string;
  formTitle: string;
  residentId?: string;
  residentName?: string;
  formData?: Record<string, any>;
  contentRef: React.RefObject<HTMLDivElement>;
}

interface HistoryEntry {
  id: string;
  date: string;
  report: string;
  signature: string | null;
}

const SmartReportSection = ({ module, formTitle, residentId, residentName, formData, contentRef }: SmartReportSectionProps) => {
  const { toast } = useToast();
  const [report, setReport] = useState("");
  const [generating, setGenerating] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`report-history-${module}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Error", description: "Sesión expirada", variant: "destructive" }); return; }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-module-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ module, formTitle, residentId, formData }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Error desconocido" }));
        toast({ title: "Error IA", description: err.error || `Error ${resp.status}`, variant: "destructive" });
        return;
      }

      const { report: aiReport } = await resp.json();
      if (aiReport) {
        setReport(aiReport);
        setShowReport(true);
        toast({ title: "✨ Informe generado con IA" });
      }
    } catch (e) {
      toast({ title: "Error", description: "No se pudo generar el informe", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const saveToHistory = () => {
    if (!report) return;
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString("es-CO"),
      report,
      signature,
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(`report-history-${module}`, JSON.stringify(updated));
    toast({ title: "Guardado en historial" });
  };

  const getReportText = () => {
    const header = `HOGAR BELÉN - JUNTOS CUIDAMOS MEJOR\n${formTitle}\n${residentName ? `Residente: ${residentName}` : ""}\nFecha: ${new Date().toLocaleDateString("es-CO")}\n\n`;
    return header + report;
  };

  return (
    <div className="space-y-4 mt-6">
      {/* AI Generate Button */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={generateReport} disabled={generating}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-destructive text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-40 min-h-[48px]">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "Generando con IA..." : "Generar Informe Inteligente IA"}
        </button>

        <button onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 bg-muted text-muted-foreground px-4 py-3 rounded-xl text-xs font-bold hover:bg-accent transition-colors min-h-[48px]">
          <History size={14} /> Historial ({history.length})
          {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Generated Report Preview */}
      {showReport && report && (
        <div className="space-y-4">
          <div ref={reportRef} className="bg-card border-2 border-primary/20 rounded-2xl p-6">
            <div className="text-center mb-4 pb-3 border-b border-border">
              <h3 className="text-sm font-black text-primary uppercase">Hogar Belén - Juntos Cuidamos Mejor</h3>
              <p className="text-xs text-muted-foreground">{formTitle} {residentName ? `• ${residentName}` : ""}</p>
              <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap text-xs leading-relaxed">
              {report}
            </div>

            {/* Digital Signature */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Firma digital del responsable</p>
                  <SignaturePad label="Firma" value={signature || undefined} onChange={setSignature} />
                </div>
                {signature && (
                  <div className="text-center">
                    <img src={signature} alt="Firma" className="h-16 mx-auto border rounded-lg" />
                    <p className="text-[9px] text-muted-foreground mt-1">Firma registrada ✓</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Export & Share */}
          <div className="flex flex-wrap items-center gap-3">
            <ExportButtons contentRef={reportRef} title={`${formTitle} ${residentName || ""}`} fileName={`${module}_${residentName || "informe"}_${new Date().toISOString().split("T")[0]}`} textContent={getReportText()} />
            <ShareButtons title={`${formTitle} ${residentName || ""}`} text={getReportText()} />
            <button onClick={saveToHistory}
              className="flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors min-h-[40px]">
              Guardar en historial
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="bg-muted/50 border border-border rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase">Últimos informes generados</p>
          {history.map(h => (
            <div key={h.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground">{h.date}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setReport(h.report); setSignature(h.signature); setShowReport(true); }}
                    className="text-[10px] font-bold text-primary hover:underline">Cargar</button>
                  <button onClick={() => {
                    const updated = history.filter(x => x.id !== h.id);
                    setHistory(updated);
                    localStorage.setItem(`report-history-${module}`, JSON.stringify(updated));
                  }} className="text-[10px] font-bold text-destructive hover:underline">Eliminar</button>
                </div>
              </div>
              <p className="text-xs text-foreground line-clamp-2">{h.report.substring(0, 150)}...</p>
              {h.signature && <p className="text-[9px] text-muted-foreground mt-1">✓ Con firma digital</p>}
            </div>
          ))}
        </div>
      )}
      {showHistory && history.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No hay informes en el historial de este módulo.</p>
      )}
    </div>
  );
};

export default SmartReportSection;
