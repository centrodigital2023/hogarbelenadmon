import { useState, useCallback } from "react";
import { FileText, FileSpreadsheet, FileType, Loader2, HardDrive, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  title: string;
  fileName: string;
  data?: Record<string, any>[] | null;
  textContent?: string;
  signatureDataUrl?: string | null;
  showDrive?: boolean;
  responsibleName?: string;
  responsibleRole?: string;
}

type ExportStatus = null | "loading" | "success" | "error";

const ExportButtons = ({ contentRef, title, fileName, data, textContent, signatureDataUrl, showDrive = true, responsibleName, responsibleRole }: ExportButtonsProps) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, ExportStatus>>({});
  const { toast } = useToast();

  const setButtonStatus = useCallback((key: string, s: ExportStatus) => {
    setStatus(prev => ({ ...prev, [key]: s }));
    if (s === "success" || s === "error") {
      setTimeout(() => setStatus(prev => ({ ...prev, [key]: null })), 2500);
    }
  }, []);

  const handleExport = useCallback(async (key: string, fn: () => Promise<void>) => {
    if (exporting) return;
    setExporting(key);
    setButtonStatus(key, "loading");
    try {
      await fn();
      setButtonStatus(key, "success");
      toast({ title: "✅ Exportado", description: `${fileName}.${key} generado correctamente` });
    } catch (e: any) {
      console.error(`Export ${key} error:`, e);
      setButtonStatus(key, "error");
      toast({ title: "Error al exportar", description: e?.message || "Intente de nuevo", variant: "destructive" });
    } finally {
      setExporting(null);
    }
  }, [exporting, fileName, toast, setButtonStatus]);

  const handlePDF = () => handleExport("pdf", async () => {
    const { exportPDF } = await import("@/lib/export-service");
    await exportPDF({ contentRef, title, fileName, textContent, signatureDataUrl, responsibleName, responsibleRole });
  });

  const handleWord = () => handleExport("docx", async () => {
    const { exportWord } = await import("@/lib/export-service");
    const fullText = textContent || contentRef.current?.innerText || "";
    await exportWord({ title, fileName, textContent: fullText, data, signatureDataUrl, responsibleName, responsibleRole });
  });

  const handleExcel = () => {
    if (!data || data.length === 0) return;
    handleExport("xlsx", async () => {
      const { exportExcel } = await import("@/lib/export-service");
      await exportExcel({ title, fileName, data: data! });
    });
  };

  const handleDrive = () => handleExport("drive", async () => {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF("p", "mm", "letter");
    const content = textContent || contentRef.current?.innerText || title;
    const lines = pdf.splitTextToSize(content, 180);
    pdf.setFontSize(10);
    pdf.text(lines, 15, 20);
    const blob = pdf.output("blob");
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const fileBase64 = btoa(binary);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();

    const resp = await fetch(`${supabaseUrl}/functions/v1/upload-drive`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ fileBase64, fileName: `${fileName}.pdf`, mimeType: "application/pdf" }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error || "Error al subir");
    toast({ title: "✅ Subido a Google Drive", description: `"${result.file?.name}" guardado` });
    if (result.file?.webViewLink) window.open(result.file.webViewLink, "_blank");
  });

  const getIcon = (key: string, DefaultIcon: typeof FileText) => {
    const s = status[key];
    if (s === "loading") return <Loader2 size={14} className="animate-spin" />;
    if (s === "success") return <CheckCircle2 size={14} />;
    if (s === "error") return <AlertCircle size={14} />;
    return <DefaultIcon size={14} />;
  };

  const btnBase = "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-40 min-h-[44px] active:scale-[0.97] touch-manipulation select-none";

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={handlePDF} disabled={!!exporting}
        className={`${btnBase} bg-destructive/10 text-destructive hover:bg-destructive/20 hover:shadow-sm`}>
        {getIcon("pdf", FileText)} PDF
      </button>
      <button onClick={handleWord} disabled={!!exporting}
        className={`${btnBase} bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-sm`}>
        {getIcon("docx", FileType)} Word
      </button>
      {data && (
        <button onClick={handleExcel} disabled={!!exporting}
          className={`${btnBase} bg-cat-nutritional/10 text-cat-nutritional hover:bg-cat-nutritional/20 hover:shadow-sm`}>
          {getIcon("xlsx", FileSpreadsheet)} Excel
        </button>
      )}
      {showDrive && (
        <button onClick={handleDrive} disabled={!!exporting}
          className={`${btnBase} bg-accent text-accent-foreground hover:bg-accent/80 hover:shadow-sm`}>
          {getIcon("drive", HardDrive)} Drive
        </button>
      )}
    </div>
  );
};

export default ExportButtons;
