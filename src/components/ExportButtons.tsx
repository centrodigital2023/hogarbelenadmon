import { useState } from "react";
import { FileText, FileSpreadsheet, FileType, Loader2 } from "lucide-react";
import { exportPDF, exportWord, exportExcel } from "@/lib/export-service";

interface ExportButtonsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  title: string;
  fileName: string;
  data?: Record<string, any>[] | null;
  textContent?: string;
  signatureDataUrl?: string | null;
}

const ExportButtons = ({ contentRef, title, fileName, data, textContent, signatureDataUrl }: ExportButtonsProps) => {
  const [exporting, setExporting] = useState<string | null>(null);

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
    </div>
  );
};

export default ExportButtons;
