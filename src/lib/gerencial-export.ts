/**
 * SERVICIO DE EXPORTACIÓN MÓDULOS GERENCIALES
 * Genera PDF, Word y Excel para todos los módulos HB-G (HB-G01 a HB-G06)
 * Con historial de hasta 180 días
 */

import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  PageNumber,
  HeadingLevel,
  VerticalAlign,
  Color,
} from "docx";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ─── CONSTANTES DE MARCA ───
export const BRAND = {
  name: "HOGAR BELÉN BUESACO S.A.S.",
  slogan: "Juntos, cuidamos mejor - Centro de Protección al Adulto Mayor",
  phone: "3117301245",
  email: "hogarbelen2022@gmail.com",
  web: "www.hogarbelen.org",
  social: "@hogarbelenbuesaco",
  nit: "NIT: 901.904.984-0",
  colorHex: "C8102E",
  colorRGB: [200, 16, 46] as [number, number, number],
};

// ─── INFORMACIÓN DE MÓDULOS ───
export const MODULE_INFO: Record<string, {title: string; subtitle: string}> = {
  'HB-G01': { title: 'HB-G01: Plan de Gestión Integral de Residuos (PEGIR)', subtitle: 'Clasificación, almacenamiento y disposición final' },
  'HB-G02': { title: 'HB-G02: Control Integrado de Plagas', subtitle: 'Fumigaciones y monitoreo' },
  'HB-G03': { title: 'HB-G03: Plan de Gestión de RESPEL', subtitle: 'Residuos Peligrosos' },
  'HB-G04': { title: 'HB-G04: Plan de Saneamiento', subtitle: 'Limpieza y desinfección' },
  'HB-G05': { title: 'HB-G05: Plan de Emergencias', subtitle: 'Protocolos de respuesta' },
  'HB-G06': { title: 'HB-G06: Tablero de Control Gerencial', subtitle: 'Indicadores consolidados' },
};

// ─── ESTILOS CSS ───
export const CORPORATE_STYLES = `
  body {
    font-family: 'Arial', sans-serif;
    color: #333;
    line-height: 1.4;
    margin: 0;
    padding: 0;
  }
  .container {
    padding: 2cm;
    max-width: 210mm;
  }
  .header {
    border-bottom: 3px solid #C8102E;
    margin-bottom: 20px;
    padding-bottom: 15px;
  }
  .header-title {
    font-size: 14pt;
    font-weight: bold;
    color: #C8102E;
    text-transform: uppercase;
    margin: 0 0 5px 0;
  }
  .header-subtitle {
    font-size: 10pt;
    color: #666;
    margin: 0;
  }
  .section-title {
    font-size: 12pt;
    font-weight: bold;
    color: #333;
    margin-top: 15px;
    margin-bottom: 10px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 5px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10pt;
  }
  .data-table th {
    background-color: #C8102E;
    color: white;
    padding: 8px;
    text-align: left;
    font-weight: bold;
  }
  .data-table td {
    padding: 8px;
    border-bottom: 1px solid #ddd;
  }
  .data-table tr:nth-child(even) {
    background-color: #f9f9f9;
  }
  .footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
    font-size: 9pt;
    color: #666;
    text-align: center;
  }
  .footer-line {
    margin: 3px 0;
  }
`;

// ─── TIPOS ───
export interface GerencialRecord {
  id: string;
  module_id: string;
  period_month?: number;
  period_year?: number;
  period_quarter?: number;
  responsible?: string;
  created_by?: string;
  created_at?: string;
  data?: Record<string, any>;
  observations?: string;
  [key: string]: any;
}

export interface HistoryExportOptions {
  moduleId: string;
  moduleName: string;
  records: GerencialRecord[];
  dateRange: { start: Date; end: Date };
}

// ─── FUNCIONES AUXILIARES ───

/**
 * Formatea fecha a string legible
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Calcula rango de fechas de últimos N días
 */
export const getLast180Days = (): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 180);
  return { start, end };
};

/**
 * Estructura datos para tabla
 */
export const formatTableData = (record: GerencialRecord): Record<string, string> => {
  return {
    fecha: record.created_at ? formatDate(record.created_at) : 'N/A',
    responsable: record.responsible || record.created_by || 'N/A',
    periodo: record.period_month 
      ? `${record.period_month}/${record.period_year}` 
      : record.period_quarter 
      ? `Q${record.period_quarter}/${record.period_year}`
      : 'N/A',
    observaciones: record.observations?.substring(0, 100) || '-',
  };
};

// ─── EXPORTAR A PDF ───
export const exportGerencialPDF = async (options: HistoryExportOptions): Promise<void> => {
  const { moduleId, moduleName, records, dateRange } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // ─── ENCABEZADO ───
  doc.setFontSize(14);
  doc.setTextColor(200, 16, 46); // Color corporativo
  doc.text(MODULE_INFO[moduleId]?.title || moduleName, margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(MODULE_INFO[moduleId]?.subtitle || '', margin, yPosition);
  yPosition += 8;

  // ─── INFORMACIÓN CORPORATIVA ───
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(BRAND.name, margin, yPosition);
  yPosition += 4;
  doc.text(`${BRAND.nit} | ${BRAND.phone} | ${BRAND.email}`, margin, yPosition);
  yPosition += 8;

  // ─── LÍNEA DIVISORIA ───
  doc.setDrawColor(200, 16, 46);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // ─── RANGO DE FECHAS ───
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Rango de fechas: ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Total de registros: ${records.length}`, margin, yPosition);
  yPosition += 10;

  // ─── TABLA DE DATOS ───
  if (records.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Historial de Registros:', margin, yPosition);
    yPosition += 6;

    const tableData = records.map(r => [
      formatDate(r.created_at || new Date()),
      r.responsible || r.created_by || 'N/A',
      r.period_month ? `${r.period_month}/${r.period_year}` : (r.period_quarter ? `Q${r.period_quarter}/${r.period_year}` : 'N/A'),
      r.observations?.substring(0, 50) || '-',
    ]);

    (doc as any).autoTable({
      head: [['Fecha', 'Responsable', 'Período', 'Observaciones']],
      body: tableData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [200, 16, 46],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── FOOTER ───
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generado automáticamente', margin, pageHeight - 10);
  doc.text(`${new Date().toLocaleString('es-CO')}`, margin, pageHeight - 5);

  // Guardar
  doc.save(`${moduleId}_historial_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─── EXPORTAR A WORD ───
export const exportGerencialWord = async (options: HistoryExportOptions): Promise<void> => {
  const { moduleId, moduleName, records, dateRange } = options;

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ text: 'Fecha', bold: true })],
          shading: { fill: 'C8102E', color: 'auto' },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Responsable', bold: true })],
          shading: { fill: 'C8102E', color: 'auto' },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Período', bold: true })],
          shading: { fill: 'C8102E', color: 'auto' },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
        }),
        new TableCell({
          children: [new Paragraph({ text: 'Observaciones', bold: true })],
          shading: { fill: 'C8102E', color: 'auto' },
          margins: { top: 60, bottom: 60, left: 60, right: 60 },
        }),
      ],
    }),
    ...records.map(
      r =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph(
                  formatDate(r.created_at || new Date())
                ),
              ],
              margins: { top: 40, bottom: 40, left: 40, right: 40 },
            }),
            new TableCell({
              children: [
                new Paragraph(r.responsible || r.created_by || 'N/A'),
              ],
              margins: { top: 40, bottom: 40, left: 40, right: 40 },
            }),
            new TableCell({
              children: [
                new Paragraph(
                  r.period_month
                    ? `${r.period_month}/${r.period_year}`
                    : r.period_quarter
                    ? `Q${r.period_quarter}/${r.period_year}`
                    : 'N/A'
                ),
              ],
              margins: { top: 40, bottom: 40, left: 40, right: 40 },
            }),
            new TableCell({
              children: [
                new Paragraph(r.observations?.substring(0, 100) || '-'),
              ],
              margins: { top: 40, bottom: 40, left: 40, right: 40 },
            }),
          ],
        })
    ),
  ];

  const sections = [
    {
      children: [
        new Paragraph({
          text: MODULE_INFO[moduleId]?.title || moduleName,
          heading: HeadingLevel.HEADING_1,
          thematicBreak: false,
          bold: true,
          size: 28,
          color: 'C8102E',
        }),
        new Paragraph({
          text: MODULE_INFO[moduleId]?.subtitle || '',
          heading: HeadingLevel.HEADING_2,
          size: 20,
          color: '666666',
          marginBottom: 200,
        }),
        new Paragraph({
          text: BRAND.name,
          size: 16,
          bold: true,
          marginBottom: 100,
        }),
        new Paragraph({
          text: `${BRAND.nit} | ${BRAND.phone} | ${BRAND.email}`,
          size: 16,
          color: '666666',
          marginBottom: 300,
        }),
        new Paragraph({
          text: `Rango de fechas: ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}`,
          marginBottom: 100,
        }),
        new Paragraph({
          text: `Total de registros: ${records.length}`,
          marginBottom: 200,
        }),
        new Paragraph({
          text: 'Historial de Registros:',
          heading: HeadingLevel.HEADING_3,
          bold: true,
          marginBottom: 100,
        }),
        new Table({
          rows: tableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        }),
        new Paragraph({
          text: `\nDocumento generado: ${new Date().toLocaleString('es-CO')}`,
          size: 14,
          color: '999999',
          marginTop: 300,
        }),
      ],
    },
  ];

  const doc = new Document({
    sections,
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${moduleId}_historial_${new Date().toISOString().split('T')[0]}.docx`);
};

// ─── EXPORTAR A EXCEL ───
export const exportGerencialExcel = (options: HistoryExportOptions): void => {
  const { moduleId, moduleName, records, dateRange } = options;

  // Hoja 1: Datos del historial
  const historialData = records.map(r => ({
    'Fecha': formatDate(r.created_at || new Date()),
    'Responsable': r.responsible || r.created_by || 'N/A',
    'Período': r.period_month
      ? `${r.period_month}/${r.period_year}`
      : r.period_quarter
      ? `Q${r.period_quarter}/${r.period_year}`
      : 'N/A',
    'Observaciones': r.observations || '-',
  }));

  // Hoja 2: Resumen
  const summaryData = [
    { Campo: 'Módulo', Valor: MODULE_INFO[moduleId]?.title || moduleName },
    { Campo: 'Fecha Inicio', Valor: formatDate(dateRange.start) },
    { Campo: 'Fecha Fin', Valor: formatDate(dateRange.end) },
    { Campo: 'Total Registros', Valor: records.length },
    { Campo: 'Responsables Únicos', Valor: new Set(records.map(r => r.responsible || r.created_by)).size },
  ];

  // Hoja 3: Información corporativa
  const brandData = [
    { Concepto: 'Institución', Valor: BRAND.name },
    { Concepto: 'NIT', Valor: BRAND.nit },
    { Concepto: 'Teléfono', Valor: BRAND.phone },
    { Concepto: 'Email', Valor: BRAND.email },
    { Concepto: 'Web', Valor: BRAND.web },
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historialData), 'Historial');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Resumen');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(brandData), 'Información');

  // Ajustar ancho de columnas
  const wscols = [
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
    { wch: 40 },
  ];
  wb.Sheets['Historial']['!cols'] = wscols;

  // Guardar
  XLSX.writeFile(wb, `${moduleId}_historial_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ─── FUNCIÓN COMBINADA DE EXPORTACIÓN ───
export const exportGerencialHistory = async (
  format: 'pdf' | 'word' | 'excel',
  options: HistoryExportOptions
): Promise<void> => {
  try {
    switch (format) {
      case 'pdf':
        await exportGerencialPDF(options);
        break;
      case 'word':
        await exportGerencialWord(options);
        break;
      case 'excel':
        exportGerencialExcel(options);
        break;
    }
  } catch (error) {
    console.error(`Error exporting to ${format}:`, error);
    throw error;
  }
};
