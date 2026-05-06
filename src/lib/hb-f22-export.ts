/**
 * SERVICIO DE EXPORTACIÓN HBF22
 * Genera PDF, Word y Excel del Informe Inteligente HBF22
 * Con estilos CSS corporativos unificados
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
  Footer,
  ImageRun,
  PageNumber,
  HeadingLevel,
  VerticalAlign,
  Color,
} from "docx";
import { saveAs } from "file-saver";
import { HBF22Report, RiskAlert, CareRecommendation, ScaleScore } from "./hb-f22-report";
import logoImg from "@/assets/logo.png";

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
  footerText: "Cel: 3117301245 | Email: hogarbelen2022@gmail.com | Web: www.hogarbelen.org",
};

// ─── ESTILOS CSS CORPORATIVOS ───
export const CORPORATE_STYLES = `
/* Estilos Globales */
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

/* Encabezado */
.header {
  border-bottom: 3px solid #C8102E;
  margin-bottom: 20px;
  padding-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-logo {
  width: 70px;
  height: 70px;
  object-fit: contain;
}

.header-text h1 {
  font-size: 14pt;
  font-weight: bold;
  color: #C8102E;
  margin: 0;
  text-transform: uppercase;
  line-height: 1.2;
}

.header-text p {
  font-size: 10pt;
  font-style: italic;
  color: #555;
  margin: 5px 0 0 0;
}

/* Títulos y Secciones */
.report-title {
  text-align: center;
  font-size: 13pt;
  font-weight: bold;
  margin: 25px 0;
  border-top: 2px double #ccc;
  border-bottom: 2px double #ccc;
  padding: 8px 0;
  color: #C8102E;
}

.section-header {
  font-size: 11pt;
  font-weight: bold;
  color: #000;
  text-transform: uppercase;
  margin-top: 20px;
  margin-bottom: 10px;
  border-left: 4px solid #C8102E;
  padding-left: 10px;
}

.subsection-header {
  font-size: 10.5pt;
  font-weight: bold;
  color: #C8102E;
  margin-top: 12px;
  margin-bottom: 6px;
  padding-left: 5px;
}

.content-block {
  margin-left: 12px;
  margin-bottom: 10px;
  font-size: 10.5pt;
  line-height: 1.5;
}

/* Tablas */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
  font-size: 10pt;
}

th {
  background-color: #C8102E;
  color: white;
  padding: 8px;
  text-align: left;
  font-weight: bold;
  border: 1px solid #999;
}

td {
  padding: 6px 8px;
  border: 1px solid #ddd;
  vertical-align: top;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

tr:hover {
  background-color: #f0f0f0;
}

/* Alertas y Estados */
.alert {
  margin: 12px 0;
  padding: 10px;
  border-left: 4px solid;
  border-radius: 2px;
  font-size: 10.5pt;
}

.alert-high {
  border-left-color: #C8102E;
  background-color: #ffe0e0;
  color: #C8102E;
  font-weight: bold;
}

.alert-moderate {
  border-left-color: #D4A017;
  background-color: #fff3cd;
  color: #856404;
  font-weight: bold;
}

.alert-low {
  border-left-color: #28a745;
  background-color: #d4edda;
  color: #155724;
}

.badge {
  display: inline-block;
  padding: 2px 6px;
  margin-right: 5px;
  font-size: 9pt;
  font-weight: bold;
  border-radius: 3px;
}

.badge-critical {
  background-color: #C8102E;
  color: white;
}

.badge-high {
  background-color: #dc3545;
  color: white;
}

.badge-medium {
  background-color: #ffc107;
  color: #000;
}

.badge-low {
  background-color: #28a745;
  color: white;
}

/* Plan de Cuidado */
.care-plan-item {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background-color: #fafafa;
}

.interventions-list {
  margin-left: 20px;
  margin-top: 8px;
}

.interventions-list li {
  margin-bottom: 4px;
  font-size: 10pt;
}

/* Datos del Residente */
.resident-info {
  background-color: #f5f5f5;
  padding: 10px;
  margin: 15px 0;
  border: 1px solid #ddd;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 10pt;
}

.resident-info-item {
  display: flex;
  gap: 10px;
}

.resident-info-item strong {
  width: 100px;
  color: #C8102E;
}

/* Escala de Evaluación */
.scale-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin: 15px 0;
}

.scale-card {
  border: 1px solid #ddd;
  padding: 10px;
  background-color: #fff;
  border-radius: 3px;
}

.scale-name {
  font-weight: bold;
  color: #C8102E;
  margin-bottom: 5px;
}

.scale-score {
  font-size: 14pt;
  font-weight: bold;
  color: #333;
}

.scale-category {
  font-size: 9pt;
  color: #666;
  margin-top: 3px;
}

/* Firma */
.signature-area {
  margin-top: 40px;
  border-top: 2px solid #C8102E;
  padding-top: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.signature-box {
  text-align: center;
  font-size: 10pt;
}

.signature-line {
  border-top: 1px solid #333;
  margin-top: 30px;
  height: 20px;
  margin-bottom: 5px;
}

/* Pie de Página */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  border-top: 2px solid #C8102E;
  padding: 8px 20px;
  font-size: 8pt;
  color: #666;
  text-align: center;
  background-color: #fafafa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-break {
  page-break-after: always;
}

@page {
  size: letter;
  margin: 2cm;
  @bottom-center {
    content: "Página " counter(page) " de " counter(pages);
  }
}

@media print {
  body {
    margin: 0;
    padding: 0;
  }
  .container {
    padding: 0;
  }
}
`;

// ─── HELPERS ───
let cachedLogoDataUrl: string | null = null;

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

function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

// ─── CONSTRUCCIÓN HTML ───

/**
 * Genera HTML completo del informe HBF22
 */
// HTML entity escape to prevent stored XSS via DB-sourced strings
const escHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function buildHBF22HTML(report: HBF22Report): string {
  const { resident: rRaw, professional: pRaw, scales: sRaw, summary: summaryRaw, riskAlerts: aRaw, carePlan: cpRaw, correlations: corrRaw } = report;
  // Sanitize all DB-sourced text fields
  const resident = {
    ...rRaw,
    fullName: escHtml(rRaw.fullName),
    documentId: rRaw.documentId ? escHtml(rRaw.documentId) : rRaw.documentId,
    dateOfBirth: rRaw.dateOfBirth ? escHtml(rRaw.dateOfBirth) : rRaw.dateOfBirth,
    gender: rRaw.gender,
    age: rRaw.age,
  };
  const professional = {
    ...pRaw,
    name: escHtml(pRaw.name),
    role: escHtml(pRaw.role),
    nit: pRaw.nit ? escHtml(pRaw.nit) : pRaw.nit,
  };
  const summary = escHtml(summaryRaw);
  const scales = sRaw.map((s) => ({ ...s, name: escHtml(s.name), category: escHtml(s.category) }));
  const riskAlerts = aRaw.map((a) => ({
    ...a,
    message: escHtml(a.message),
    scale: escHtml(a.scale),
    recommendation: a.recommendation ? escHtml(a.recommendation) : a.recommendation,
    currentValue: typeof a.currentValue === "string" ? escHtml(a.currentValue) : a.currentValue,
  }));
  const carePlan = cpRaw.map((p) => ({
    ...p,
    title: escHtml(p.title),
    description: escHtml(p.description),
    scales: p.scales.map((x) => escHtml(x)),
    interventions: p.interventions.map((x) => escHtml(x)),
  }));
  const correlations = {
    ...corrRaw,
    dependencyProfile: escHtml(corrRaw.dependencyProfile),
    fragilityStatus: escHtml(corrRaw.fragilityStatus),
    riskFactors: corrRaw.riskFactors.map((x) => escHtml(x)),
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>INFORME HBF22 - ${resident.fullName}</title>
  <style>
    ${CORPORATE_STYLES}
  </style>
</head>
<body>
  <div class="container">
    <!-- ENCABEZADO -->
    <header class="header">
      <img src="${logoImg}" class="header-logo" alt="Logo Hogar Belén">
      <div class="header-text">
        <h1>${BRAND.name}</h1>
        <p>${BRAND.slogan}</p>
      </div>
    </header>

    <!-- TÍTULO DEL INFORME -->
    <div class="report-title">
      INFORME DE VALORACIÓN GERIÁTRICA INTEGRAL (HB-F22)<br>
      INFORME INTELIGENTE CON ANÁLISIS DE CORRELACIONES
    </div>

    <!-- INFORMACIÓN DEL RESIDENTE -->
    <div class="section-header">INFORMACIÓN DEL RESIDENTE</div>
    <div class="resident-info">
      <div class="resident-info-item">
        <strong>Nombre:</strong>
        <span>${resident.fullName}</span>
      </div>
      <div class="resident-info-item">
        <strong>Documento:</strong>
        <span>${resident.documentId || "No especificado"}</span>
      </div>
      <div class="resident-info-item">
        <strong>Fecha de Nacimiento:</strong>
        <span>${resident.dateOfBirth || "No especificado"}</span>
      </div>
      <div class="resident-info-item">
        <strong>Edad:</strong>
        <span>${resident.age ? resident.age + " años" : "No especificada"}</span>
      </div>
      <div class="resident-info-item">
        <strong>Sexo:</strong>
        <span>${resident.gender === "M" ? "Masculino" : resident.gender === "F" ? "Femenino" : "No especificado"}</span>
      </div>
      <div class="resident-info-item">
        <strong>Fecha de Evaluación:</strong>
        <span>${formatDate(new Date(report.generatedDate))}</span>
      </div>
    </div>

    <!-- INFORMACIÓN DEL PROFESIONAL -->
    <div class="section-header">PROFESIONAL RESPONSABLE</div>
    <div class="content-block">
      <strong>${professional.name}</strong><br>
      ${professional.role}<br>
      ${professional.nit ? professional.nit : ""}
    </div>

    <!-- RESUMEN EJECUTIVO -->
    <div class="section-header">1. RESUMEN EJECUTIVO</div>
    <div class="content-block">
      ${summary}
    </div>

    <!-- ESTADO FUNCIONAL Y DEPENDENCIA -->
    <div class="section-header">2. ESTADO FUNCIONAL Y DEPENDENCIA</div>
    <div class="content-block">
      <div class="subsection-header">Perfil de Dependencia: <span style="color: #C8102E;">${correlations.dependencyProfile}</span></div>
      <div class="subsection-header">Estado de Fragilidad: <span style="color: #C8102E;">${correlations.fragilityStatus}</span></div>
      <div class="subsection-header">Factores de Riesgo Identificados:</div>
      <ul>
        ${correlations.riskFactors.map((rf) => `<li>${rf}</li>`).join("")}
      </ul>
    </div>

    <!-- EVALUACIÓN DE ESCALAS -->
    <div class="section-header">3. RESULTADOS DE EVALUACIÓN (${scales.length} ESCALAS)</div>
    <table>
      <thead>
        <tr>
          <th>Escala</th>
          <th>Puntuación</th>
          <th>Máximo</th>
          <th>Porcentaje</th>
          <th>Categoría</th>
        </tr>
      </thead>
      <tbody>
        ${scales
          .map(
            (scale) => `
          <tr>
            <td><strong>${scale.name}</strong></td>
            <td>${scale.score}</td>
            <td>${scale.maxScore}</td>
            <td>${((scale.score / scale.maxScore) * 100).toFixed(1)}%</td>
            <td>${scale.category}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <!-- RIESGOS Y ALERTAS -->
    <div class="section-header">4. RIESGOS Y ALERTAS DETECTADAS (${riskAlerts.length})</div>
    ${
      riskAlerts.length > 0
        ? riskAlerts
            .map(
              (alert) => `
        <div class="alert alert-${alert.level === "HIGH" ? "high" : alert.level === "MODERATE" ? "moderate" : "low"}">
          <strong>${alert.message}</strong><br>
          Escala: ${alert.scale}${alert.currentValue !== undefined ? ` | Valor Actual: ${alert.currentValue}` : ""}<br>
          <em>${alert.recommendation || ""}</em>
        </div>
      `
            )
            .join("")
        : '<div class="content-block">Sin alertas críticas detectadas.</div>'
    }

    <!-- PLAN DE CUIDADO -->
    <div class="page-break"></div>
    <div class="section-header">5. PLAN DE CUIDADO INTEGRAL (${carePlan.length} PROGRAMAS)</div>
    ${carePlan
      .map(
        (plan) => `
      <div class="care-plan-item">
        <div style="display: flex; gap: 10px; align-items: baseline;">
          <span class="badge badge-${plan.priority === "CRITICAL" ? "critical" : plan.priority === "HIGH" ? "high" : plan.priority === "MEDIUM" ? "medium" : "low"}">
            ${plan.priority}
          </span>
          <h3 style="margin: 0; color: #C8102E;">${plan.title}</h3>
        </div>
        <p style="margin: 8px 0; font-size: 10pt; color: #555;">${plan.description}</p>
        <div class="subsection-header">Escalas Involucradas:</div>
        <p style="margin: 5px 0; font-size: 10pt;">${plan.scales.join(", ")}</p>
        <div class="subsection-header">Intervenciones Recomendadas:</div>
        <ul class="interventions-list">
          ${plan.interventions.map((inter) => `<li>${inter}</li>`).join("")}
        </ul>
      </div>
    `
      )
      .join("")}

    <!-- CORRELACIONES CLÍNICAS -->
    <div class="page-break"></div>
    <div class="section-header">6. ANÁLISIS DE CORRELACIONES CLÍNICAS</div>
    <div class="content-block">
      <div class="subsection-header">Interdependencias Detectadas:</div>
      ${
        correlations.riskFactors.length > 0
          ? `
        <p>La valoración integral evidencia múltiples factores interconectados que requieren abordaje multidisciplinario:</p>
        <ul>
          ${correlations.riskFactors.map((factor) => `<li><strong>${factor}:</strong> Requiere intervención específica con seguimiento.</li>`).join("")}
        </ul>
      `
          : "<p>Perfil de bajo riesgo con buen nivel funcional.</p>"
      }
    </div>

    <!-- FIRMA -->
    <div class="signature-area">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>${professional.name}</strong></div>
        <div>${professional.role}</div>
        ${professional.nit ? `<div>${professional.nit}</div>` : ""}
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div><strong>Fecha de Firma</strong></div>
        <div>${formatDate()}</div>
      </div>
    </div>

    <!-- PIE DE PÁGINA -->
    <footer class="footer">
      <div>${BRAND.footerText}</div>
      <div>${BRAND.nit}</div>
    </footer>
  </div>
</body>
</html>
  `;

  return htmlContent;
}

// ─── EXPORTACIÓN A PDF ───

/**
 * Exporta el informe HBF22 a PDF
 */
export async function exportHBF22PDF(report: HBF22Report, fileName: string = "Informe_HBF22") {
  const pdf = new jsPDF("p", "mm", "letter");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const [r, g, b] = BRAND.colorRGB;

  const logoDataUrl = await getLogoDataUrl();

  let pageNum = 1;

  const drawHeader = () => {
    // Fondo rojo
    pdf.setFillColor(r, g, b);
    pdf.rect(0, 0, pageW, 35, "F");

    // Logo
    if (logoDataUrl) {
      try {
        pdf.addImage(logoDataUrl, "PNG", margin, 3, 20, 20);
      } catch {}
    }

    // Texto encabezado
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(BRAND.name, margin + 25, 10);

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");
    pdf.text(BRAND.slogan, margin + 25, 18);

    // Línea separadora
    pdf.setDrawColor(r, g, b);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 37, pageW - margin, 37);
  };

  const drawFooter = () => {
    const y = pageH - 15;
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(BRAND.footerText, pageW / 2, y, { align: "center" });
    pdf.text(`${BRAND.nit} | Página ${pageNum}`, pageW / 2, y + 5, { align: "center" });
  };

  // PÁGINA 1: ENCABEZADO Y RESUMEN
  drawHeader();
  let y = 45;

  // Título del informe
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(r, g, b);
  pdf.text("INFORME DE VALORACIÓN GERIÁTRICA INTEGRAL (HB-F22)", pageW / 2, y, { align: "center" });
  y += 10;

  // Información del residente
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  const residentInfo = [
    [`Nombre: ${report.resident.fullName}`, `Documento: ${report.resident.documentId || "N/A"}`],
    [
      `Edad: ${report.resident.age || "N/A"} años`,
      `Fecha Evaluación: ${formatDate(new Date(report.generatedDate))}`,
    ],
    [`Profesional: ${report.professional.name}`, `Rol: ${report.professional.role}`],
  ];

  residentInfo.forEach((row) => {
    pdf.text(row[0], margin, y);
    pdf.text(row[1], margin + contentW / 2, y);
    y += 6;
  });

  y += 5;

  // Resumen ejecutivo
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(r, g, b);
  pdf.text("RESUMEN EJECUTIVO", margin, y);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  const summaryLines = pdf.splitTextToSize(report.summary, contentW);
  summaryLines.forEach((line: string) => {
    if (y > pageH - 25) {
      drawFooter();
      pdf.addPage();
      pageNum++;
      drawHeader();
      y = 45;
    }
    pdf.text(line, margin, y);
    y += 5;
  });

  y += 10;

  // Estado funcional
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(r, g, b);
  pdf.text("PERFIL CLÍNICO", margin, y);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(50, 50, 50);
  pdf.text(`Dependencia: ${report.correlations.dependencyProfile}`, margin, y);
  y += 5;
  pdf.text(`Fragilidad: ${report.correlations.fragilityStatus}`, margin, y);
  y += 10;

  // Tabla de escalas (PAGE BREAK si es necesario)
  if (y > pageH - 80) {
    drawFooter();
    pdf.addPage();
    pageNum++;
    drawHeader();
    y = 45;
  }

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(r, g, b);
  pdf.text("RESULTADOS DE EVALUACIÓN", margin, y);
  y += 8;

  // Tabla simplificada
  pdf.setFontSize(8);
  const tableStartY = y;
  const colWidths = [contentW * 0.3, contentW * 0.2, contentW * 0.2, contentW * 0.3];

  // Headers
  pdf.setFillColor(r, g, b);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Escala", margin, y + 3);
  pdf.text("Puntuación", margin + colWidths[0], y + 3);
  pdf.text("Máximo", margin + colWidths[0] + colWidths[1], y + 3);
  pdf.text("Categoría", margin + colWidths[0] + colWidths[1] + colWidths[2], y + 3);
  y += 6;

  // Datos
  pdf.setTextColor(50, 50, 50);
  pdf.setFillColor(240, 240, 240);
  report.scales.forEach((scale, idx) => {
    if (y > pageH - 25) {
      drawFooter();
      pdf.addPage();
      pageNum++;
      drawHeader();
      y = 45;
    }

    if (idx % 2 === 0) {
      pdf.rect(margin - 1, y - 3, contentW + 2, 5, "F");
    }

    pdf.setTextColor(50, 50, 50);
    pdf.text(scale.name, margin, y);
    pdf.text(scale.score.toString(), margin + colWidths[0], y);
    pdf.text(scale.maxScore.toString(), margin + colWidths[0] + colWidths[1], y);
    pdf.text(scale.category, margin + colWidths[0] + colWidths[1] + colWidths[2], y);
    y += 5;
  });

  y += 8;

  // Alertas
  if (y > pageH - 40) {
    drawFooter();
    pdf.addPage();
    pageNum++;
    drawHeader();
    y = 45;
  }

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(r, g, b);
  pdf.text(`ALERTAS Y RIESGOS (${report.riskAlerts.length})`, margin, y);
  y += 7;

  pdf.setFontSize(8);
  report.riskAlerts.forEach((alert) => {
    if (y > pageH - 25) {
      drawFooter();
      pdf.addPage();
      pageNum++;
      drawHeader();
      y = 45;
    }

    const color = alert.level === "HIGH" ? [200, 16, 46] : [212, 160, 23];
    pdf.setTextColor(...color);
    pdf.setFont("helvetica", "bold");
    pdf.text(`[${alert.level}] ${alert.message}`, margin, y);
    y += 4;

    pdf.setTextColor(50, 50, 50);
    pdf.setFont("helvetica", "normal");
    const recLines = pdf.splitTextToSize(
      alert.recommendation || "Sin recomendación",
      contentW - 5
    );
    recLines.forEach((line: string) => {
      if (y > pageH - 25) {
        drawFooter();
        pdf.addPage();
        pageNum++;
        drawHeader();
        y = 45;
      }
      pdf.text(line, margin + 5, y);
      y += 3;
    });
    y += 2;
  });

  // PLAN DE CUIDADO (nueva página)
  drawFooter();
  pdf.addPage();
  pageNum++;
  drawHeader();
  y = 45;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(r, g, b);
  pdf.text(`PLAN DE CUIDADO INTEGRAL (${report.carePlan.length} PROGRAMAS)`, margin, y);
  y += 8;

  pdf.setFontSize(8);
  report.carePlan.forEach((plan) => {
    if (y > pageH - 30) {
      drawFooter();
      pdf.addPage();
      pageNum++;
      drawHeader();
      y = 45;
    }

    // Título del plan
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(r, g, b);
    pdf.text(`${plan.title} [${plan.priority}]`, margin, y);
    y += 4;

    // Descripción
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(50, 50, 50);
    const descLines = pdf.splitTextToSize(plan.description, contentW - 5);
    descLines.forEach((line: string) => {
      if (y > pageH - 30) {
        drawFooter();
        pdf.addPage();
        pageNum++;
        drawHeader();
        y = 45;
      }
      pdf.text(line, margin + 5, y);
      y += 3;
    });
    y += 2;

    // Intervenciones (primeras 3)
    plan.interventions.slice(0, 3).forEach((inter) => {
      if (y > pageH - 30) {
        drawFooter();
        pdf.addPage();
        pageNum++;
        drawHeader();
        y = 45;
      }
      pdf.text(`• ${inter}`, margin + 10, y);
      y += 3;
    });

    if (plan.interventions.length > 3) {
      pdf.text(`+ ${plan.interventions.length - 3} intervenciones más`, margin + 10, y);
      y += 3;
    }

    y += 3;
  });

  // Firma
  drawFooter();

  pdf.save(`${fileName}.pdf`);
}

// ─── EXPORTACIÓN A WORD ───

/**
 * Exporta el informe HBF22 a Word
 */
export async function exportHBF22Word(report: HBF22Report, fileName: string = "Informe_HBF22") {
  const { resident, professional, scales, summary, riskAlerts, carePlan, correlations } = report;

  const bodyContent: (Paragraph | Table)[] = [];

  // Título
  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: "INFORME DE VALORACIÓN GERIÁTRICA INTEGRAL (HB-F22)", bold: true, size: 28, color: BRAND.colorHex, font: "Arial" })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: "INFORME INTELIGENTE CON ANÁLISIS DE CORRELACIONES", italic: true, size: 22, color: "666666", font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Información del residente
  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: "INFORMACIÓN DEL RESIDENTE", bold: true, size: 24, color: BRAND.colorHex, font: "Arial" })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
    })
  );

  const residentTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Nombre", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
            shading: { fill: BRAND.colorHex, type: "clear" as any },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: resident.fullName, font: "Arial" })], spacing: { before: 40, after: 40 } })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Documento", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
            shading: { fill: BRAND.colorHex, type: "clear" as any },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: resident.documentId || "N/A", font: "Arial" })], spacing: { before: 40, after: 40 } })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Edad", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
            shading: { fill: BRAND.colorHex, type: "clear" as any },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: (resident.age || "N/A") + " años", font: "Arial" })], spacing: { before: 40, after: 40 } })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Fecha de Evaluación", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
            shading: { fill: BRAND.colorHex, type: "clear" as any },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: formatDate(new Date(report.generatedDate)), font: "Arial" })], spacing: { before: 40, after: 40 } })],
          }),
        ],
      }),
    ],
  });

  bodyContent.push(residentTable);
  bodyContent.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Resumen ejecutivo
  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: "RESUMEN EJECUTIVO", bold: true, size: 24, color: BRAND.colorHex, font: "Arial" })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
    })
  );

  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: summary, size: 22, font: "Arial" })],
      spacing: { after: 200 },
      alignment: AlignmentType.JUSTIFIED,
    })
  );

  // Perfil clínico
  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: "PERFIL CLÍNICO", bold: true, size: 24, color: BRAND.colorHex, font: "Arial" })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
    })
  );

  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: `Perfil de Dependencia: `, bold: true, font: "Arial" }), new TextRun({ text: correlations.dependencyProfile, color: BRAND.colorHex, bold: true, font: "Arial" })],
      spacing: { after: 80 },
    })
  );

  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: `Estado de Fragilidad: `, bold: true, font: "Arial" }), new TextRun({ text: correlations.fragilityStatus, color: BRAND.colorHex, bold: true, font: "Arial" })],
      spacing: { after: 120 },
    })
  );

  // Tabla de escalas
  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: "RESULTADOS DE EVALUACIÓN", bold: true, size: 24, color: BRAND.colorHex, font: "Arial" })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
    })
  );

  const scaleTableRows = [
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Escala", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
          shading: { fill: BRAND.colorHex, type: "clear" as any },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Puntuación", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
          shading: { fill: BRAND.colorHex, type: "clear" as any },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Máximo", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
          shading: { fill: BRAND.colorHex, type: "clear" as any },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Porcentaje", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
          shading: { fill: BRAND.colorHex, type: "clear" as any },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Categoría", bold: true, color: "FFFFFF", font: "Arial" })], alignment: AlignmentType.CENTER })],
          shading: { fill: BRAND.colorHex, type: "clear" as any },
        }),
      ],
    }),
    ...scales.map(
      (scale, idx) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: scale.name, font: "Arial" })], spacing: { before: 40, after: 40 } })],
              shading: idx % 2 === 0 ? { fill: "F2F2F2", type: "clear" as any } : undefined,
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: scale.score.toString(), font: "Arial" })], alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 } })],
              shading: idx % 2 === 0 ? { fill: "F2F2F2", type: "clear" as any } : undefined,
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: scale.maxScore.toString(), font: "Arial" })], alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 } })],
              shading: idx % 2 === 0 ? { fill: "F2F2F2", type: "clear" as any } : undefined,
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: ((scale.score / scale.maxScore) * 100).toFixed(1) + "%", font: "Arial" })], alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 } })],
              shading: idx % 2 === 0 ? { fill: "F2F2F2", type: "clear" as any } : undefined,
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: scale.category, font: "Arial" })], spacing: { before: 40, after: 40 } })],
              shading: idx % 2 === 0 ? { fill: "F2F2F2", type: "clear" as any } : undefined,
            }),
          ],
        })
    ),
  ];

  bodyContent.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: scaleTableRows }));
  bodyContent.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Alertas
  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: `RIESGOS Y ALERTAS (${riskAlerts.length})`, bold: true, size: 24, color: BRAND.colorHex, font: "Arial" })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
    })
  );

  riskAlerts.forEach((alert) => {
    const color = alert.level === "HIGH" ? BRAND.colorHex : alert.level === "MODERATE" ? "D4A017" : "28a745";
    bodyContent.push(
      new Paragraph({
        children: [new TextRun({ text: `${alert.message}`, bold: true, color: color, size: 22, font: "Arial" })],
        spacing: { before: 80, after: 40 },
        border: {
          left: { color, style: BorderStyle.SINGLE, size: 12, space: 4 },
        },
        indent: { left: 200 },
      })
    );

    bodyContent.push(
      new Paragraph({
        children: [new TextRun({ text: `Escala: ${alert.scale}${alert.currentValue !== undefined ? ` | Valor: ${alert.currentValue}` : ""}`, size: 20, font: "Arial" })],
        spacing: { after: 80 },
        indent: { left: 400 },
      })
    );

    if (alert.recommendation) {
      bodyContent.push(
        new Paragraph({
          children: [new TextRun({ text: alert.recommendation, size: 20, font: "Arial" })],
          spacing: { after: 120 },
          indent: { left: 400 },
        })
      );
    }
  });

  // Plan de cuidado
  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: `PLAN DE CUIDADO INTEGRAL (${carePlan.length} PROGRAMAS)`, bold: true, size: 24, color: BRAND.colorHex, font: "Arial" })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
    })
  );

  carePlan.forEach((plan) => {
    bodyContent.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${plan.title}`, bold: true, color: BRAND.colorHex, size: 22, font: "Arial" }),
          new TextRun({ text: ` [${plan.priority}]`, bold: true, size: 20, font: "Arial" }),
        ],
        spacing: { before: 80, after: 80 },
      })
    );

    bodyContent.push(
      new Paragraph({
        children: [new TextRun({ text: plan.description, size: 20, font: "Arial" })],
        spacing: { after: 80 },
      })
    );

    bodyContent.push(
      new Paragraph({
        children: [new TextRun({ text: "Intervenciones:", bold: true, size: 20, font: "Arial" })],
        spacing: { after: 80 },
      })
    );

    plan.interventions.forEach((inter) => {
      bodyContent.push(
        new Paragraph({
          children: [new TextRun({ text: inter, size: 20, font: "Arial" })],
          spacing: { after: 40 },
          indent: { left: 400 },
          bullet: { level: 0 },
        })
      );
    });

    bodyContent.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  });

  // Firma
  bodyContent.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: "Firma del Profesional Responsable", bold: true, size: 22, font: "Arial" })],
      spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: BRAND.colorHex } },
    })
  );

  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: professional.name, bold: true, size: 22, font: "Arial" })],
      spacing: { after: 40 },
    })
  );

  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: professional.role, size: 20, font: "Arial" })],
      spacing: { after: 40 },
    })
  );

  if (professional.nit) {
    bodyContent.push(
      new Paragraph({
        children: [new TextRun({ text: professional.nit, size: 20, font: "Arial" })],
        spacing: { after: 40 },
      })
    );
  }

  bodyContent.push(
    new Paragraph({
      children: [new TextRun({ text: `Fecha: ${formatDate()}`, size: 20, font: "Arial" })],
    })
  );

  const doc = new Document({
    sections: [
      {
        children: bodyContent as any,
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
}

// ─── EXPORTACIÓN A EXCEL ───

/**
 * Exporta el informe HBF22 a Excel
 */
export async function exportHBF22Excel(report: HBF22Report, fileName: string = "Informe_HBF22") {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();

  // Hoja 1: Información General
  const infoSheet = workbook.addWorksheet("Información");
  infoSheet.columns = [
    { header: "Parámetro", key: "param", width: 30 },
    { header: "Valor", key: "value", width: 50 },
  ];

  infoSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + BRAND.colorHex } };
  infoSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  const infoData = [
    { param: "Centro", value: BRAND.name },
    { param: "Residente", value: report.resident.fullName },
    { param: "Documento", value: report.resident.documentId || "N/A" },
    { param: "Edad", value: report.resident.age || "N/A" },
    { param: "Fecha de Evaluación", value: formatDate(new Date(report.generatedDate)) },
    { param: "Profesional", value: report.professional.name },
    { param: "Rol", value: report.professional.role },
    { param: "", value: "" },
    { param: "PERFIL CLÍNICO", value: "" },
    { param: "Dependencia", value: report.correlations.dependencyProfile },
    { param: "Fragilidad", value: report.correlations.fragilityStatus },
  ];

  infoData.forEach((row) => {
    infoSheet.addRow(row);
  });

  // Hoja 2: Escalas
  const scalesSheet = workbook.addWorksheet("Escalas");
  scalesSheet.columns = [
    { header: "Escala", key: "name", width: 25 },
    { header: "Puntuación", key: "score", width: 15 },
    { header: "Máximo", key: "max", width: 12 },
    { header: "Porcentaje", key: "percentage", width: 15 },
    { header: "Categoría", key: "category", width: 25 },
  ];

  scalesSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + BRAND.colorHex } };
  scalesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  report.scales.forEach((scale, idx) => {
    scalesSheet.addRow({
      name: scale.name,
      score: scale.score,
      max: scale.maxScore,
      percentage: ((scale.score / scale.maxScore) * 100).toFixed(1) + "%",
      category: scale.category,
    });
    if (idx % 2 === 0) {
      scalesSheet.getRow(idx + 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
    }
  });

  // Hoja 3: Alertas
  const alertsSheet = workbook.addWorksheet("Alertas");
  alertsSheet.columns = [
    { header: "Nivel", key: "level", width: 12 },
    { header: "Categoría", key: "category", width: 20 },
    { header: "Mensaje", key: "message", width: 40 },
    { header: "Escala", key: "scale", width: 18 },
    { header: "Valor", key: "value", width: 12 },
    { header: "Recomendación", key: "recommendation", width: 50 },
  ];

  alertsSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + BRAND.colorHex } };
  alertsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  report.riskAlerts.forEach((alert, idx) => {
    alertsSheet.addRow({
      level: alert.level,
      category: alert.category,
      message: alert.message,
      scale: alert.scale,
      value: alert.currentValue || "",
      recommendation: alert.recommendation || "",
    });

    if (alert.level === "HIGH") {
      alertsSheet.getRow(idx + 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFffe0e0" } };
    } else if (alert.level === "MODERATE") {
      alertsSheet.getRow(idx + 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
    }
  });

  // Hoja 4: Plan de Cuidado
  const careSheet = workbook.addWorksheet("Plan de Cuidado");
  careSheet.columns = [
    { header: "Programa", key: "title", width: 30 },
    { header: "Prioridad", key: "priority", width: 12 },
    { header: "Descripción", key: "description", width: 40 },
    { header: "Escalas Involucradas", key: "scales", width: 25 },
    { header: "Intervenciones", key: "interventions", width: 50 },
  ];

  careSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + BRAND.colorHex } };
  careSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  report.carePlan.forEach((plan, idx) => {
    careSheet.addRow({
      title: plan.title,
      priority: plan.priority,
      description: plan.description,
      scales: plan.scales.join("; "),
      interventions: plan.interventions.join("\n"),
    });

    if (plan.priority === "CRITICAL") {
      careSheet.getRow(idx + 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFffe0e0" } };
    } else if (plan.priority === "HIGH") {
      careSheet.getRow(idx + 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `${fileName}.xlsx`);
}
