import { useState } from "react";
import { FileText, FileSpreadsheet, FileType, Loader2, HardDrive } from "lucide-react";
import { exportPDF, exportWord, exportExcel } from "@/lib/export-service";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  title: string;
  fileName: string;
  data?: Record<string, any>[] | null;
  textContent?: string;
  signatureDataUrl?: string | null;
  showDrive?: boolean;
}

const ExportButtons = ({ contentRef, title, fileName, data, textContent, signatureDataUrl, showDrive = true }: ExportButtonsProps) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePDF = async () => {
    setExporting("pdf");
    try {
      await exportPDF({ contentRef, title, fileName, textContent, signatureDataUrl });
    } catch (e) { console.error(e); }
    setExporting(null);
  };

  const handleWord = async () => {
    setExporting("docx");
    try {
      const fullText = textContent || contentRef.current?.innerText || "";
      await exportWord({ title, fileName, textContent: fullText, data, signatureDataUrl });
    } catch (e) { console.error(e); }
    setExporting(null);
  };

  const handleExcel = async () => {
    if (!data || data.length === 0) return;
    setExporting("xlsx");
    try {
      await exportExcel({ title, fileName, data });
    } catch (e) { console.error(e); }
    setExporting(null);
  };

  const handleDrive = async () => {
    setExporting("drive");
    try {
      // Generate PDF blob for Drive upload
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      // Re-use exportPDF logic but capture blob instead of saving
      const pdf = new jsPDF("p", "mm", "letter");
      const content = textContent || contentRef.current?.innerText || title;
      const lines = pdf.splitTextToSize(content, 180);
      pdf.setFontSize(10);
      pdf.text(lines, 15, 20);
      const blob = pdf.output("blob");

      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileBase64 = btoa(binary);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch(`${supabaseUrl}/functions/v1/upload-drive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          fileBase64,
          fileName: `${fileName}.pdf`,
          mimeType: "application/pdf",
        }),
      });

      const result = await resp.json();
      if (result.success) {
        toast({ title: "✅ Subido a Google Drive", description: `"${result.file?.name}" guardado` });
        if (result.file?.webViewLink) window.open(result.file.webViewLink, "_blank");
      } else {
        throw new Error(result.error || "Error");
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error al subir a Drive", description: e.message, variant: "destructive" });
    }
    setExporting(null);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={handlePDF} disabled={!!exporting}
        className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-4 py-2 rounded-xl text-xs font-bold hover:bg-destructive/20 transition-colors disabled:opacity-40 min-h-[40px]">
        {exporting === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        PDF
      </button>
      <button onClick={handleWord} disabled={!!exporting}
        className="flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-40 min-h-[40px]">
        {exporting === "docx" ? <Loader2 size={14} className="animate-spin" /> : <FileType size={14} />}
        Word
      </button>
      {data && (
        <button onClick={handleExcel} disabled={!!exporting}
          className="flex items-center gap-1.5 bg-cat-nutritional/10 text-cat-nutritional px-4 py-2 rounded-xl text-xs font-bold hover:bg-cat-nutritional/20 transition-colors disabled:opacity-40 min-h-[40px]">
          {exporting === "xlsx" ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          Excel
        </button>
      )}
      {showDrive && (
        <button onClick={handleDrive} disabled={!!exporting}
          className="flex items-center gap-1.5 bg-yellow-600/10 text-yellow-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-600/20 transition-colors disabled:opacity-40 min-h-[40px]">
          {exporting === "drive" ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
          Google Drive
        </button>
      )}
    </div>
  );
};

export default ExportButtons;
