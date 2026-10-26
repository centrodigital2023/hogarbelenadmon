/**
 * Lee en el navegador lo que la IA necesita de cada archivo:
 * - Word (.docx): texto de párrafos y tablas.
 * - PDF: texto; si es un PDF escaneado (sin texto), imágenes de sus primeras páginas.
 * - Fotos: imagen reducida a un tamaño liviano para enviarla rápido desde el celular.
 */
import { enhanceScan, type ScanMode } from "@/lib/scan-enhance";

export interface ReadDocument {
  text: string;
  /** Imágenes JPEG en data URL, máximo MAX_IMAGES. */
  images: string[];
  pages: number;
  format: "imagen" | "pdf" | "word" | "texto";
}

export const ACCEPTED_FILES = ".pdf,.docx,.txt,image/*";
export const MAX_FILE_MB = 15;
const MAX_IMAGES = 4;
const MAX_TEXT = 60_000;
const IMAGE_MAX_SIDE = 1600;

const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function documentFormat(file: Pick<File, "name" | "type">): ReadDocument["format"] | "doc" | null {
  const ext = extension(file.name);
  if (file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) return "imagen";
  if (file.type === "application/pdf" || ext === "pdf") return "pdf";
  if (ext === "docx") return "word";
  if (ext === "doc") return "doc";
  if (file.type.startsWith("text/") || ext === "txt") return "texto";
  return null;
}

/** Texto plano del XML de Word: un salto por párrafo y " | " entre celdas de tabla. */
export function docxXmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readDocx(file: File): Promise<ReadDocument> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(file);
  const parts = Object.keys(zip.files).filter((p) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(p)).sort();
  const xml = await Promise.all(parts.map((p) => zip.file(p)!.async("string")));
  return { text: docxXmlToText(xml.join("\n")).slice(0, MAX_TEXT), images: [], pages: 1, format: "word" };
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("No se pudo abrir la imagen. Use JPG o PNG (en iPhone: Ajustes › Cámara › Formatos › Más compatible)."));
  img.src = src;
});

/** Dibuja la imagen reducida (y opcionalmente en modo escáner) y la devuelve como JPEG. */
export async function imageToJpeg(source: Blob | string, scan?: ScanMode): Promise<string> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const ratio = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (scan) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      enhanceScan(data.data, scan);
      ctx.putImageData(data, 0, 0);
    }
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

async function readPdf(file: File): Promise<ReadDocument> {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = pdf.numPages;
  let text = "";
  for (let i = 1; i <= Math.min(pages, 20) && text.length < MAX_TEXT; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("") + "\n\n";
  }
  text = text.replace(/[ \t]+/g, " ").trim();

  // PDF escaneado: casi sin texto → se envían las páginas como imágenes
  const images: string[] = [];
  if (text.length / Math.min(pages, 20) < 80) {
    for (let i = 1; i <= Math.min(pages, MAX_IMAGES); i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, IMAGE_MAX_SIDE / Math.max(base.width, base.height)) });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
      images.push(canvas.toDataURL("image/jpeg", 0.8));
    }
  }
  return { text: text.slice(0, MAX_TEXT), images, pages, format: "pdf" };
}

export async function readDocument(file: File): Promise<ReadDocument> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`El archivo pesa más de ${MAX_FILE_MB} MB.`);
  const format = documentFormat(file);
  switch (format) {
    case "imagen": return { text: "", images: [await imageToJpeg(file)], pages: 1, format };
    case "pdf": return readPdf(file);
    case "word": return readDocx(file);
    case "texto": return { text: (await file.text()).slice(0, MAX_TEXT), images: [], pages: 1, format };
    case "doc": throw new Error("Los archivos .doc antiguos no se pueden leer. Guárdelo como .docx o PDF, o tómele una foto.");
    default: throw new Error("Formato no soportado. Use PDF, Word (.docx) o imágenes.");
  }
}

/** Convierte las páginas escaneadas (JPEG) en un único PDF tamaño carta. */
export async function pagesToPdf(pages: string[], name: string): Promise<File> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage();
    const img = await loadImage(pages[i]);
    const ratio = Math.min((pageW - 36) / img.naturalWidth, (pageH - 36) / img.naturalHeight);
    const w = img.naturalWidth * ratio;
    const h = img.naturalHeight * ratio;
    doc.addImage(pages[i], "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h);
  }
  return new File([doc.output("blob")], name, { type: "application/pdf" });
}
