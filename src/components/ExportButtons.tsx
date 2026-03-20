import { useState } from "react";
import { FileText, FileSpreadsheet, File, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

interface ExportButtonsProps {
  contentRef: React.RefObject<HTMLDivElement>;
  title: string;
  fileName: string;
  data?: Record<string, any>[] | null;
}

const BRAND = {
  name: 'Hogar Belén',
  slogan: 'Juntos, Cuidamos Mejor',
  phone: '3117301245',
  email: 'hogarbelen2022@gmail.com',
  web: 'www.hogarbelen.org',
  social: '@hogarbelenbuesaco',
};

const ExportButtons = ({ contentRef, title, fileName, data }: ExportButtonsProps) => {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportPDF = async () => {
    if (!contentRef.current) return;
    setExporting('pdf');
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Header
      pdf.setFillColor(220, 38, 38);
      pdf.rect(0, 0, pageW, 18, 'F');
      pdf.setFillColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text(BRAND.name, margin, 12);
      pdf.setFontSize(8);
      pdf.text(BRAND.slogan, pageW - margin, 12, { align: 'right' });

      // Content
      const contentW = pageW - margin * 2;
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = contentW / imgW;
      const scaledH = imgH * ratio;
      const maxContentH = pageH - 50;

      if (scaledH <= maxContentH) {
        pdf.addImage(imgData, 'PNG', margin, 25, contentW, scaledH);
      } else {
        let yOffset = 0;
        let page = 0;
        while (yOffset < imgH) {
          if (page > 0) {
            pdf.addPage();
            pdf.setFillColor(220, 38, 38);
            pdf.rect(0, 0, pageW, 12, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.text(BRAND.name, margin, 8);
          }
          const sliceH = Math.min((maxContentH / ratio), imgH - yOffset);
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = imgW;
          tempCanvas.height = sliceH;
          const ctx = tempCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, yOffset, imgW, sliceH, 0, 0, imgW, sliceH);
          pdf.addImage(tempCanvas.toDataURL('image/png'), 'PNG', margin, page === 0 ? 25 : 18, contentW, sliceH * ratio);
          yOffset += sliceH;
          page++;
        }
      }

      // Footer on last page
      const footerY = pageH - 10;
      pdf.setFillColor(220, 38, 38);
      pdf.rect(0, footerY - 5, pageW, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.text(`${BRAND.phone} | ${BRAND.email} | ${BRAND.web} | ${BRAND.social}`, pageW / 2, footerY, { align: 'center' });

      pdf.save(`${fileName}.pdf`);
    } catch (e) { console.error(e); }
    setExporting(null);
  };

  const exportExcel = async () => {
    if (!data || data.length === 0) return;
    setExporting('xlsx');
    try {
      let csv = '\uFEFF'; // BOM for UTF-8
      const headers = Object.keys(data[0]);
      csv += headers.join(',') + '\n';
      data.forEach(row => {
        csv += headers.map(h => {
          const val = row[h] ?? '';
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    setExporting(null);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={exportPDF} disabled={!!exporting}
        className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-4 py-2 rounded-xl text-xs font-bold hover:bg-destructive/20 transition-colors disabled:opacity-40 min-h-[40px]">
        {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        PDF
      </button>
      {data && (
        <button onClick={exportExcel} disabled={!!exporting}
          className="flex items-center gap-1.5 bg-cat-nutritional/10 text-cat-nutritional px-4 py-2 rounded-xl text-xs font-bold hover:bg-cat-nutritional/20 transition-colors disabled:opacity-40 min-h-[40px]">
          {exporting === 'xlsx' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          Excel
        </button>
      )}
    </div>
  );
};

export default ExportButtons;
