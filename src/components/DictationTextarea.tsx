import { useEffect, useRef } from "react";
import { Mic, Square, AlertTriangle, X } from "lucide-react";
import { useDictation } from "@/hooks/useDictation";
import { appendDictation } from "@/lib/dictation";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  /** Visible lines before it starts growing with the text. */
  minRows?: number;
  /** Joins dictated phrases; defaults to adding them as new sentences. */
  join?: (current: string, dictated: string) => string;
}

/** Large text box that grows while you write, with a microphone to dictate by voice. */
const DictationTextarea = ({ value, onChange, label, placeholder, minRows = 3, join = appendDictation }: Props) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const dictation = useDictation(text => onChange(join(valueRef.current, text)));

  // Grows with the content so long notes stay readable without scrolling inside the box
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value, dictation.interim]);

  return (
    <div>
      {label && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase text-muted-foreground">{label}</span>
          {value && <span className="text-[10px] text-muted-foreground">{value.length} caracteres</span>}
        </div>
      )}
      <div className={`relative rounded-xl border-2 bg-background transition-colors ${dictation.listening ? "border-destructive ring-4 ring-destructive/10" : "border-input focus-within:border-primary"}`}>
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={minRows}
          placeholder={placeholder}
          aria-label={label}
          className="block w-full resize-none rounded-xl bg-transparent px-4 pb-14 pt-3 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-sm"
        />
        {dictation.interim && (
          <p className="pointer-events-none absolute inset-x-4 bottom-14 truncate text-sm italic text-muted-foreground">{dictation.interim}…</p>
        )}
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
          <span className="truncate pl-2 text-[11px] font-bold text-destructive">
            {dictation.listening ? "🎙️ Escuchando… di “punto” o “coma” para puntuar" : ""}
          </span>
          {dictation.supported ? (
            <button
              type="button"
              onClick={dictation.toggle}
              aria-label={dictation.listening ? "Detener dictado" : "Dictar por voz"}
              aria-pressed={dictation.listening}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-black shadow-sm transition active:scale-95 ${dictation.listening ? "animate-pulse bg-destructive text-white" : "bg-primary text-primary-foreground"}`}
            >
              {dictation.listening ? <><Square size={14} fill="currentColor" /> Detener</> : <><Mic size={16} /> Dictar</>}
            </button>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[10px] text-muted-foreground">🎤 Usa el micrófono del teclado</span>
          )}
        </div>
      </div>
      {dictation.error && (
        <p role="alert" className="mt-1.5 flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs font-bold text-destructive">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> <span className="flex-1">{dictation.error}</span>
          <button type="button" aria-label="Ocultar" onClick={dictation.clearError}><X size={14} /></button>
        </p>
      )}
    </div>
  );
};

export default DictationTextarea;
