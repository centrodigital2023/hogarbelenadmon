import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, Header, Footer, ImageRun, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, PageNumber, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

// ─── Brand Constants ───
export const BRAND = {
  name: "HOGAR BELÉN BUESACO S.A.S.",
  slogan: "Juntos, cuidamos mejor",
  phone: "3117301245",
  email: "hogarbelen2022@gmail.com",
  web: "www.hogarbelen.org",
  social: "@hogarbelenbuesaco",
  nit: "NIT: 901.904.984-0",
  colorHex: "C8102E",
  colorRGB: [200, 16, 46] as [number, number, number],
  footerText: "Cel: 3117301245 | Email: hogarbelen2022@gmail.com | Web: www.hogarbelen.org | Redes: @hogarbelenbuesaco",
};

// ─── Helpers ───
let cachedLogoDataUrl: string | null = null;
let cachedLogoBuffer: ArrayBuffer | null = null;
let cachedDynamicLogoUrl: string | null = null;
let logoLookupDone = false;

async function getDynamicLogoUrl(): Promise<string | null> {
  if (logoLookupDone) return cachedDynamicLogoUrl;
  logoLookupDone = true;
  try {
    const { data } = await (supabase as any).from("system_settings").select("value").eq("key", "logo_url").maybeSingle();
    if (data?.value && typeof data.value === "string") {
      cachedDynamicLogoUrl = data.value;
    }
  } catch { /* fallback to bundled asset */ }
  return cachedDynamicLogoUrl;
}

async function getLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  const dynamicUrl = await getDynamicLogoUrl();
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      cachedLogoDataUrl = c.toDataURL("image/png");
      resolve(cachedLogoDataUrl);
    };
    img.onerror = () => {
      // Fallback to bundled logo
      const fb = new Image();
      fb.onload = () => {
        const c = document.createElement("canvas");
        c.width = fb.naturalWidth;
        c.height = fb.naturalHeight;
        c.getContext("2d")!.drawImage(fb, 0, 0);
        cachedLogoDataUrl = c.toDataURL("image/png");
        resolve(cachedLogoDataUrl);
      };
      fb.onerror = () => resolve("");
      fb.src = logoImg;
    };
    img.src = dynamicUrl || logoImg;
  });
}

async function getLogoBuffer(): Promise<ArrayBuffer> {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  const dynamicUrl = await getDynamicLogoUrl();
  try {
    const resp = await fetch(dynamicUrl || logoImg);
    cachedLogoBuffer = await resp.arrayBuffer();
    return cachedLogoBuffer;
  } catch {
    const resp = await fetch(logoImg);
    cachedLogoBuffer = await resp.arrayBuffer();
    return cachedLogoBuffer;
  }
}

function formatDate(): string {
  return new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(): string {
  return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

// Strip markdown chars for plain rendering / split into segments with bold/italic flags
type Segment = { text: string; bold?: boolean; italic?: boolean; heading?: 1 | 2 | 3 };
function parseMarkdownLine(line: string): Segment[] {
  const segments: Segment[] = [];
  // Heading detection
  const h = line.match(/^(#{1,3})\s+(.*)$/);
  if (h) return [{ text: h[2], bold: true, heading: h[1].length as 1 | 2 | 3 }];

  // Inline bold/italic
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) segments.push({ text: line.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) segments.push({ text: tok.slice(2, -2), bold: true });
    else segments.push({ text: tok.slice(1, -1), italic: true });
    last = m.index + tok.length;
  }
  if (last < line.length) segments.push({ text: line.slice(last) });
  return segments.length ? segments : [{ text: line }];
}

// ─── PDF EXPORT ───
// El PDF SIEMPRE se genera a partir del MISMO contenido textual del Word
// (no es una captura visual de la plataforma). Garantiza paridad 1:1 con el .docx.
export async function exportPDF(opts: {
  contentRef?: React.RefObject<HTMLDivElement>;
  title: string;
  fileName: string;
  textContent?: string;
  signatureDataUrl?: string | null;
  responsibleName?: string;
  responsibleRole?: string;
}) {
  const pdf = new jsPDF("p", "mm", "letter");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 20; // 2 cm margins per institutional standard
  const contentW = pageW - margin * 2;
  const headerH = 28;
  const footerH = 20;
  const [r, g, b] = BRAND.colorRGB;

  const logoDataUrl = await getLogoDataUrl();

  const drawHeader = (page: number) => {
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, pageW, headerH, "F");
    if (logoDataUrl) {
      try { pdf.addImage(logoDataUrl, "PNG", margin, 2, 24, 24); } catch {}
    }
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(BRAND.name, margin + 28, 12);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "italic");
    pdf.text(BRAND.slogan, margin + 28, 19);
    if (page === 0) {
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(formatDate(), pageW - margin, 25, { align: "right" });
    }
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(0.4);
    pdf.line(margin, headerH + 1, pageW - margin, headerH + 1);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    const y = pageH - footerH;
    pdf.setFillColor(r, g, b);
    pdf.rect(0, y, pageW, footerH, "F");
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(255, 255, 255);
    if (opts.responsibleName) {
      pdf.text(`Registrado por: ${opts.responsibleName}${opts.responsibleRole ? ` (${opts.responsibleRole})` : ""} | Fecha: ${new Date().toLocaleDateString("es-CO")} | Hora: ${formatTime()}`, pageW / 2, y + 5, { align: "center" });
    }
    pdf.text(BRAND.footerText, pageW / 2, y + 9, { align: "center" });
    pdf.text(BRAND.nit, pageW / 2, y + 13, { align: "center" });
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageW / 2, y + 17, { align: "center" });
  };

  // Garantía: si no hay textContent explícito, usar el innerText del contenedor
  // (nunca una captura visual). Así PDF == versión textual del Word.
  const sourceText = opts.textContent || opts.contentRef?.current?.innerText || opts.title;

  {
    drawHeader(0);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(r, g, b);
    pdf.text(opts.title, margin, headerH + 10);
    let y = headerH + 18;
    const maxY = pageH - footerH - 8;
    let pageCount = 1;

    const writeSegments = (segments: Segment[]) => {
      const head = segments[0]?.heading;
      if (head) {
        const size = head === 1 ? 13 : head === 2 ? 11 : 10;
        pdf.setFontSize(size);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(r, g, b);
        const lines = pdf.splitTextToSize(segments[0].text, contentW);
        for (const ln of lines) {
          if (y > maxY) { drawFooter(pageCount, 0); pdf.addPage(); pageCount++; drawHeader(pageCount - 1); y = headerH + 10; }
          pdf.text(ln, margin, y);
          y += size === 13 ? 7 : size === 11 ? 6 : 5;
        }
        y += 1;
        return;
      }
      pdf.setFontSize(10);
      pdf.setTextColor(40, 40, 40);
      let cursorX = margin;
      const lineH = 5;
      for (const seg of segments) {
        const style = seg.bold && seg.italic ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
        pdf.setFont("helvetica", style);
        const words = seg.text.split(/(\s+)/);
        for (const w of words) {
          if (!w) continue;
          const wWidth = pdf.getTextWidth(w);
          if (cursorX + wWidth > pageW - margin) {
            y += lineH;
            cursorX = margin;
            if (y > maxY) { drawFooter(pageCount, 0); pdf.addPage(); pageCount++; drawHeader(pageCount - 1); y = headerH + 10; }
          }
          pdf.text(w, cursorX, y);
          cursorX += wWidth;
        }
      }
      y += lineH + 1;
    };

    for (const rawLine of sourceText.split("\n")) {
      if (!rawLine.trim()) { y += 3; continue; }
      const segments = parseMarkdownLine(rawLine);
      writeSegments(segments);
    }

    if (opts.signatureDataUrl) {
      if (y + 28 > maxY) { pdf.addPage(); pageCount++; drawHeader(pageCount - 1); y = headerH + 10; }
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(40, 40, 40);
      pdf.text("Firma del Responsable:", margin, y + 4);
      try { pdf.addImage(opts.signatureDataUrl, "PNG", margin, y + 6, 40, 20); } catch {}
      y += 32;
    }

    if (opts.responsibleName) {
      if (y + 10 > maxY) { pdf.addPage(); pageCount++; drawHeader(pageCount - 1); y = headerH + 10; }
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(r, g, b);
      pdf.text(`Firmado por: ${opts.responsibleName}${opts.responsibleRole ? ` — ${opts.responsibleRole}` : ""}`, margin, y + 4);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Fecha: ${new Date().toLocaleDateString("es-CO")} | Hora: ${formatTime()}`, margin, y + 9);
    }

    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      drawFooter(i, total);
    }
  }

  pdf.save(`${opts.fileName}.pdf`);
}

// ─── WORD EXPORT ───
export async function exportWord(opts: {
  title: string;
  fileName: string;
  textContent?: string;
  data?: Record<string, any>[] | null;
  signatureDataUrl?: string | null;
  responsibleName?: string;
  responsibleRole?: string;
}) {
  const logoBuffer = await getLogoBuffer();
  const content = opts.textContent || "";

  const headerChildren: (Paragraph)[] = [
    new Paragraph({ children: [new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 80 }, type: "png", altText: { title: "Logo", description: "Logo Hogar Belén", name: "logo" } })] }),
    new Paragraph({ children: [new TextRun({ text: BRAND.name, bold: true, size: 28, color: BRAND.colorHex, font: "Arial" })], alignment: AlignmentType.LEFT }),
    new Paragraph({ children: [new TextRun({ text: BRAND.slogan, italics: true, size: 20, color: "333333", font: "Arial" })], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND.colorHex, space: 4 } } }),
  ];

  const footerChildren: Paragraph[] = [];
  if (opts.responsibleName) {
    footerChildren.push(new Paragraph({
      children: [new TextRun({ text: `Registrado por: ${opts.responsibleName}${opts.responsibleRole ? ` (${opts.responsibleRole})` : ""} | Fecha: ${new Date().toLocaleDateString("es-CO")} | Hora: ${formatTime()}`, size: 14, color: "555555", font: "Arial", bold: true })],
      alignment: AlignmentType.CENTER,
    }));
  }
  footerChildren.push(
    new Paragraph({ children: [new TextRun({ text: BRAND.footerText, size: 14, color: "666666", font: "Arial" })], alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: BRAND.colorHex, space: 4 } } }),
    new Paragraph({ children: [
      new TextRun({ text: BRAND.nit + "  |  ", size: 12, color: "999999", font: "Arial" }),
      new TextRun({ text: "Página ", size: 12, color: "999999", font: "Arial" }),
      new TextRun({ children: [PageNumber.CURRENT], size: 12, color: "999999", font: "Arial" }),
      new TextRun({ text: " de ", size: 12, color: "999999", font: "Arial" }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 12, color: "999999", font: "Arial" }),
    ], alignment: AlignmentType.CENTER }),
  );

  const bodyChildren: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: opts.title, bold: true, size: 28, color: BRAND.colorHex, font: "Arial" })], heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `Fecha: ${formatDate()}`, size: 20, color: "666666", font: "Arial" })], spacing: { after: 300 } }),
  ];

  if (opts.data && opts.data.length > 0) {
    const keys = Object.keys(opts.data[0]);
    const headerRow = new TableRow({
      children: keys.map(k => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 20, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
        shading: { fill: BRAND.colorHex, type: "clear" as any },
        width: { size: Math.floor(9360 / keys.length), type: WidthType.DXA },
      })),
    });
    const dataRows = opts.data.map((row, i) => new TableRow({
      children: keys.map(k => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(row[k] ?? ""), size: 20, font: "Arial" })], spacing: { before: 40, after: 40 } })],
        shading: i % 2 === 0 ? { fill: "F2F2F2", type: "clear" as any } : undefined,
        width: { size: Math.floor(9360 / keys.length), type: WidthType.DXA },
      })),
    }));
    bodyChildren.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
    bodyChildren.push(new Table({ width: { size: 9360, type: WidthType.DXA }, rows: [headerRow, ...dataRows] }));
  } else if (content) {
    content.split("\n").forEach(line => {
      if (!line.trim()) {
        bodyChildren.push(new Paragraph({ children: [new TextRun({ text: "", size: 22, font: "Arial" })], spacing: { after: 80 } }));
        return;
      }
      const segments = parseMarkdownLine(line);
      const head = segments[0]?.heading;
      if (head) {
        const size = head === 1 ? 28 : head === 2 ? 24 : 22;
        bodyChildren.push(new Paragraph({
          children: [new TextRun({ text: segments[0].text, bold: true, size, color: BRAND.colorHex, font: "Arial" })],
          heading: head === 1 ? HeadingLevel.HEADING_1 : head === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 120 },
        }));
        return;
      }
      bodyChildren.push(new Paragraph({
        children: segments.map(seg => new TextRun({ text: seg.text, bold: seg.bold, italics: seg.italic, size: 22, font: "Arial", color: seg.bold ? "1A1A1A" : "333333" })),
        spacing: { after: 120, line: 300 },
      }));
    });
  }

  // Signature
  if (opts.signatureDataUrl) {
    bodyChildren.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
    bodyChildren.push(new Paragraph({
      children: [new TextRun({ text: "Firma del Responsable:", bold: true, size: 18, color: "333333", font: "Arial" })],
      border: { bottom: { style: BorderStyle.DOTTED, size: 2, color: "999999", space: 4 } },
    }));
    try {
      const sigResp = await fetch(opts.signatureDataUrl);
      const sigBuf = await sigResp.arrayBuffer();
      bodyChildren.push(new Paragraph({
        children: [new ImageRun({ data: sigBuf, transformation: { width: 150, height: 60 }, type: "png", altText: { title: "Firma", description: "Firma digital", name: "firma" } })],
      }));
    } catch {}
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [{
      headers: { default: new Header({ children: headerChildren }) },
      footers: { default: new Footer({ children: footerChildren }) },
      properties: {
        page: {
          margin: { top: 1800, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: bodyChildren as any,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${opts.fileName}.docx`);
}

// ─── EXCEL EXPORT ───
export async function exportExcel(opts: {
  title: string;
  fileName: string;
  data: Record<string, any>[];
}) {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = BRAND.name;
  workbook.created = new Date();

  // Metadata sheet
  const meta = workbook.addWorksheet("Información");
  meta.getColumn(1).width = 40;
  meta.getColumn(2).width = 50;
  const titleRow = meta.addRow([BRAND.name]);
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: "FF" + BRAND.colorHex } };
  meta.addRow([BRAND.slogan]);
  meta.addRow([]);
  meta.addRow(["Informe:", opts.title]);
  meta.addRow(["Fecha:", formatDate()]);
  meta.addRow([]);
  meta.addRow([BRAND.footerText]);
  meta.addRow([BRAND.nit]);

  // Data sheet
  if (!opts.data || opts.data.length === 0) {
    saveAsExcel(workbook, opts.fileName);
    return;
  }

  const sheet = workbook.addWorksheet("Datos");
  const keys = Object.keys(opts.data[0]);

  // Header row
  const headerRow = sheet.addRow(keys);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + BRAND.colorHex } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  });
  headerRow.height = 24;

  // Data rows with alternating colors
  opts.data.forEach((row, i) => {
    const r = sheet.addRow(keys.map(k => row[k] ?? ""));
    r.eachCell((cell) => {
      cell.border = thinBorder();
      cell.alignment = { vertical: "middle", wrapText: true };
      if (i % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
      }
    });
  });

  // Auto width
  keys.forEach((_, i) => {
    const col = sheet.getColumn(i + 1);
    let maxLen = keys[i].length;
    opts.data.forEach(row => {
      const val = String(row[keys[i]] ?? "");
      if (val.length > maxLen) maxLen = val.length;
    });
    col.width = Math.min(Math.max(maxLen + 4, 12), 50);
  });

  saveAsExcel(workbook, opts.fileName);
}

function thinBorder(): any {
  const side = { style: "thin" as const, color: { argb: "FF000000" } };
  return { top: side, bottom: side, left: side, right: side };
}

async function saveAsExcel(workbook: any, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${fileName}.xlsx`);
}
