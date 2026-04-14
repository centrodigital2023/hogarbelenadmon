import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, Header, Footer, ImageRun, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, PageNumber, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import logoImg from "@/assets/logo.png";

// ─── Brand Constants ───
export const BRAND = {
  name: "HOGAR BELÉN BUESACO S.A.S.",
  slogan: "Juntos, cuidamos mejor",
  phone: "3117015258",
  email: "hogarbelen2022@gmail.com",
  web: "www.hogarbelen.org",
  social: "@hogarbelenbuesaco",
  nit: "NIT: 901.904.984-0",
  colorHex: "C8102E",
  colorRGB: [200, 16, 46] as [number, number, number],
  footerText: "Cel: 3117015258 | Email: hogarbelen2022@gmail.com | Web: www.hogarbelen.org | Redes: @hogarbelenbuesaco",
};

// ─── Helpers ───
let cachedLogoDataUrl: string | null = null;
let cachedLogoBuffer: ArrayBuffer | null = null;

async function getLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
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
    img.onerror = () => resolve("");
    img.src = logoImg;
  });
}

async function getLogoBuffer(): Promise<ArrayBuffer> {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  const resp = await fetch(logoImg);
  cachedLogoBuffer = await resp.arrayBuffer();
  return cachedLogoBuffer;
}

function formatDate(): string {
  return new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// ─── PDF EXPORT ───
export async function exportPDF(opts: {
  contentRef?: React.RefObject<HTMLDivElement>;
  title: string;
  fileName: string;
  textContent?: string;
  signatureDataUrl?: string | null;
}) {
  const { default: html2canvas } = await import("html2canvas");
  const pdf = new jsPDF("p", "mm", "letter");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  const headerH = 28;
  const footerH = 18;
  const [r, g, b] = BRAND.colorRGB;

  const logoDataUrl = await getLogoDataUrl();

  const drawHeader = (page: number) => {
    // Red band
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, pageW, headerH, "F");
    // Logo
    if (logoDataUrl) {
      try { pdf.addImage(logoDataUrl, "PNG", margin, 2, 24, 24); } catch {}
    }
    // Title
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(BRAND.name, margin + 28, 12);
    // Slogan
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "italic");
    pdf.text(BRAND.slogan, margin + 28, 19);
    // Date on first page
    if (page === 0) {
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(formatDate(), pageW - margin, 25, { align: "right" });
    }
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    const y = pageH - footerH;
    // Red wave band
    pdf.setFillColor(r, g, b);
    pdf.rect(0, y, pageW, footerH, "F");
    // Contact info
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(255, 255, 255);
    pdf.text(BRAND.footerText, pageW / 2, y + 6, { align: "center" });
    pdf.text(BRAND.nit, pageW / 2, y + 10, { align: "center" });
    pdf.text(`Página ${pageNum} de ${totalPages}`, pageW / 2, y + 14, { align: "center" });
  };

  // Render content
  if (opts.contentRef?.current) {
    const canvas = await html2canvas(opts.contentRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const imgW = canvas.width;
    const imgH = canvas.height;
    const ratio = contentW / imgW;
    const maxContentH = pageH - headerH - footerH - 10;

    if (imgH * ratio <= maxContentH) {
      drawHeader(0);
      pdf.addImage(imgData, "PNG", margin, headerH + 4, contentW, imgH * ratio);
      if (opts.signatureDataUrl) {
        try { pdf.addImage(opts.signatureDataUrl, "PNG", margin, headerH + 4 + imgH * ratio + 4, 40, 20); } catch {}
      }
      drawFooter(1, 1);
    } else {
      let yOffset = 0;
      let page = 0;
      const pages: string[] = [];
      while (yOffset < imgH) {
        if (page > 0) pdf.addPage();
        drawHeader(page);
        const sliceH = Math.min(maxContentH / ratio, imgH - yOffset);
        const tc = document.createElement("canvas");
        tc.width = imgW;
        tc.height = sliceH;
        tc.getContext("2d")!.drawImage(canvas, 0, yOffset, imgW, sliceH, 0, 0, imgW, sliceH);
        pdf.addImage(tc.toDataURL("image/png"), "PNG", margin, headerH + 4, contentW, sliceH * ratio);
        yOffset += sliceH;
        page++;
        pages.push("x");
      }
      // Add signature on last page
      if (opts.signatureDataUrl) {
        try { pdf.addImage(opts.signatureDataUrl, "PNG", margin, headerH + 4 + (imgH - Math.floor(yOffset - (maxContentH / ratio))) * ratio + 4, 40, 20); } catch {}
      }
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        drawFooter(i, total);
      }
    }
  } else if (opts.textContent) {
    // Text-based PDF
    drawHeader(0);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(200, 16, 46);
    pdf.text(opts.title, margin, headerH + 10);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    const lines = pdf.splitTextToSize(opts.textContent, contentW);
    let y = headerH + 18;
    const maxY = pageH - footerH - 5;
    let pageCount = 1;
    for (const line of lines) {
      if (y > maxY) {
        drawFooter(pageCount, 0);
        pdf.addPage();
        pageCount++;
        drawHeader(pageCount - 1);
        y = headerH + 10;
      }
      pdf.text(line, margin, y);
      y += 4.5;
    }
    if (opts.signatureDataUrl) {
      if (y + 24 > maxY) { pdf.addPage(); pageCount++; drawHeader(pageCount - 1); y = headerH + 10; }
      pdf.setFontSize(8);
      pdf.text("Firma del Responsable:", margin, y + 4);
      try { pdf.addImage(opts.signatureDataUrl, "PNG", margin, y + 6, 40, 20); } catch {}
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
}) {
  const logoBuffer = await getLogoBuffer();
  const content = opts.textContent || "";

  const headerChildren: (Paragraph)[] = [
    new Paragraph({
      children: [
        new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 80 }, type: "png", altText: { title: "Logo", description: "Logo Hogar Belén", name: "logo" } }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: BRAND.name, bold: true, size: 28, color: BRAND.colorHex, font: "Arial" }),
      ],
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: BRAND.slogan, italics: true, size: 20, color: "555555", font: "Arial" }),
      ],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND.colorHex, space: 4 } },
    }),
  ];

  const footerChildren: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: BRAND.footerText, size: 14, color: "666666", font: "Arial" }),
      ],
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: BRAND.colorHex, space: 4 } },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: BRAND.nit + "  |  ", size: 12, color: "999999", font: "Arial" }),
        new TextRun({ text: "Página ", size: 12, color: "999999", font: "Arial" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 12, color: "999999", font: "Arial" }),
        new TextRun({ text: " de ", size: 12, color: "999999", font: "Arial" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 12, color: "999999", font: "Arial" }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  ];

  const bodyChildren: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: opts.title, bold: true, size: 28, color: BRAND.colorHex, font: "Arial" })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Fecha: ${formatDate()}`, size: 20, color: "666666", font: "Arial" })],
      spacing: { after: 300 },
    }),
  ];

  // Build table if data provided
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
    const table = new Table({
      width: { size: 9360, type: WidthType.DXA },
      rows: [headerRow, ...dataRows],
    });
    bodyChildren.push(table as any);
  } else if (content) {
    content.split("\n").filter(l => l.trim()).forEach(line => {
      bodyChildren.push(new Paragraph({
        children: [new TextRun({ text: line, size: 22, font: "Arial" })],
        spacing: { after: 120, line: 276 },
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
      children: bodyChildren,
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
