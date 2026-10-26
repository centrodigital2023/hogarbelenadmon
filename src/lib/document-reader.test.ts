import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { documentFormat, docxXmlToText, readDocument } from "./document-reader";

const XML = `<w:document><w:body>
<w:p><w:r><w:t>HISTORIA CLÍNICA</w:t></w:r></w:p>
<w:p><w:r><w:t>Paciente:</w:t></w:r><w:r><w:tab/><w:t>María &amp; José</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>EPS</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Sanitas</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
</w:body></w:document>`;

describe("lector de documentos", () => {
  it("reconoce formatos por tipo o extensión", () => {
    expect(documentFormat({ name: "foto.JPG", type: "" })).toBe("imagen");
    expect(documentFormat({ name: "x", type: "application/pdf" })).toBe("pdf");
    expect(documentFormat({ name: "hc.docx", type: "" })).toBe("word");
    expect(documentFormat({ name: "viejo.doc", type: "" })).toBe("doc");
    expect(documentFormat({ name: "hoja.xlsx", type: "" })).toBeNull();
  });

  it("convierte el XML de Word en texto legible", () => {
    const text = docxXmlToText(XML);
    expect(text).toContain("HISTORIA CLÍNICA");
    expect(text).toContain("Paciente:\tMaría & José");
    expect(text).toContain("EPS");
    expect(text).toContain("Sanitas");
  });

  it("lee un .docx real", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", XML);
    const blob = await zip.generateAsync({ type: "uint8array" });
    const file = new File([blob], "historia.docx");
    const doc = await readDocument(file);
    expect(doc.format).toBe("word");
    expect(doc.text).toContain("Sanitas");
  });

  it("explica por qué no puede leer .doc ni archivos enormes", async () => {
    await expect(readDocument(new File(["x"], "viejo.doc"))).rejects.toThrow(/\.docx o PDF/);
    const big = new File(["x"], "grande.pdf");
    Object.defineProperty(big, "size", { value: 20 * 1024 * 1024 });
    await expect(readDocument(big)).rejects.toThrow(/15 MB/);
  });
});
