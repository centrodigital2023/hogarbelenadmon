import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, ScanLine, Palette, FileText, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { imageToJpeg, MAX_IMAGES, pagesToPdf, type ReadDocument } from "@/lib/document-reader";
import type { ScanMode } from "@/lib/scan-enhance";
import { errorMessage } from "@/lib/errors";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (file: File, read: ReadDocument) => void;
}

/**
 * Escáner de documentos con la cámara del celular: cada foto se limpia (papel blanco,
 * texto negro) y todas las páginas se unen en un PDF que se guarda y se analiza con IA.
 */
const DocumentScanner = ({ open, onOpenChange, onComplete }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [originals, setOriginals] = useState<File[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
  const [mode, setMode] = useState<ScanMode>("documento");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setOriginals([]); setPages([]); setRotations([]); setError(null); setBusy(null); };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy("Mejorando la imagen…");
    setError(null);
    try {
      const list = Array.from(files);
      const processed = await Promise.all(list.map((f) => imageToJpeg(f, mode)));
      setOriginals((prev) => [...prev, ...list]);
      setPages((prev) => [...prev, ...processed]);
      setRotations((prev) => [...prev, ...list.map(() => 0)]);
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const changeMode = async (next: ScanMode) => {
    setMode(next);
    if (originals.length === 0) return;
    setBusy("Aplicando filtro…");
    setPages(await Promise.all(originals.map((f, i) => imageToJpeg(f, next, rotations[i]))));
    setBusy(null);
  };

  const rotate = async (i: number) => {
    const angle = (rotations[i] + 90) % 360;
    setBusy("Girando la página…");
    try {
      const page = await imageToJpeg(originals[i], mode, angle);
      setRotations((prev) => prev.map((r, j) => (j === i ? angle : r)));
      setPages((prev) => prev.map((p, j) => (j === i ? page : p)));
    } catch (e) {
      setError(errorMessage(e));
    }
    setBusy(null);
  };

  const remove = (i: number) => {
    setOriginals((prev) => prev.filter((_, j) => j !== i));
    setPages((prev) => prev.filter((_, j) => j !== i));
    setRotations((prev) => prev.filter((_, j) => j !== i));
  };

  const finish = async () => {
    setBusy("Creando PDF…");
    try {
      const stamp = new Date().toLocaleDateString("es-CO").replace(/\//g, "-");
      const file = await pagesToPdf(pages, `Escaneo_${stamp}_${pages.length}pag.pdf`);
      onComplete(file, { text: "", images: pages.slice(0, MAX_IMAGES), pages: pages.length, format: "pdf" });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanLine size={18} /> Escanear documento</DialogTitle>
          <DialogDescription>
            Ponga el documento sobre una superficie oscura, con buena luz, y tome una foto por página.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {(["documento", "color"] as const).map((m) => (
            <button key={m} type="button" onClick={() => changeMode(m)} disabled={!!busy}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border-2 ${mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
              {m === "documento" ? <FileText size={14} /> : <Palette size={14} />}
              {m === "documento" ? "Blanco y negro" : "Color (sellos, fotos)"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {pages.map((src, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-[3/4]">
              <img src={src} alt={`Página ${i + 1}`} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 text-[10px] font-black bg-background/90 rounded-md px-1.5">{i + 1}</span>
              <button type="button" onClick={() => rotate(i)} disabled={!!busy} aria-label={`Girar página ${i + 1}`}
                className="absolute top-1 left-1 w-7 h-7 rounded-lg bg-background/90 text-foreground flex items-center justify-center">
                <RotateCw size={13} />
              </button>
              <button type="button" onClick={() => remove(i)} aria-label={`Quitar página ${i + 1}`}
                className="absolute top-1 right-1 w-7 h-7 rounded-lg bg-background/90 text-destructive flex items-center justify-center">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => inputRef.current?.click()} disabled={!!busy}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary flex flex-col items-center justify-center gap-1 text-[11px] font-bold">
            {busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={22} />}
            {pages.length === 0 ? "Tomar foto" : "Otra página"}
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
          onChange={(e) => addPhotos(e.target.files)} />

        {busy && <p className="text-xs text-muted-foreground">{busy}</p>}
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        <button type="button" onClick={finish} disabled={pages.length === 0 || !!busy}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-xs font-black uppercase min-h-[48px] disabled:opacity-40">
          <ScanLine size={16} />
          Guardar y analizar {pages.length > 0 ? `(${pages.length} pág.)` : ""}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentScanner;
