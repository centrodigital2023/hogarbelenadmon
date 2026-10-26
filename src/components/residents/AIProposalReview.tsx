import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, ShieldAlert, XCircle, Quote } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DOCUMENT_KINDS, groupProposals, type DocumentExtraction, type Proposal, type ProposalSet,
} from "@/lib/resident-documents";
import type { ApplyResult } from "@/lib/apply-proposals";

interface Props {
  extraction: DocumentExtraction;
  proposalSet: ProposalSet;
  fileName: string;
  aiError?: string | null;
  onApply: (proposals: Proposal[]) => Promise<ApplyResult[]>;
  onClose: () => void;
}

const STATUS_BADGE: Record<Proposal["status"], { label: string; cls: string }> = {
  nuevo: { label: "Nuevo", cls: "bg-cat-nutritional/15 text-cat-nutritional" },
  complemento: { label: "Complementa", cls: "bg-primary/10 text-primary" },
  conflicto: { label: "Diferente al registro", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
};

const confidenceLabel = (c: number) => (c >= 0.85 ? "Confianza alta" : c >= 0.6 ? "Confianza media" : "Confianza baja");
const SOURCE_LABEL = { ia: "Analizado con IA", "ia+local": "IA + lector inteligente", local: "Lector inteligente (sin IA)" };
const ALERT_STYLE = { alta: "border-destructive/30 bg-destructive/10 text-destructive", media: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400", baja: "border-primary/30 bg-primary/10 text-primary" };

/** Revisión humana de lo que la IA encontró: nada se guarda sin confirmar. */
const AIProposalReview = ({ extraction, proposalSet, fileName, aiError, onApply, onClose }: Props) => {
  const [items, setItems] = useState<Proposal[]>(proposalSet.proposals);
  const [results, setResults] = useState<Record<string, ApplyResult>>({});
  const [saving, setSaving] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => groupProposals(items), [items]);
  const pending = items.filter((p) => p.selected && !results[p.id]?.ok);
  const savedCount = Object.values(results).filter((r) => r.ok).length;
  const failed = Object.values(results).filter((r) => !r.ok);

  const update = (id: string, patch: Partial<Proposal>) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const setSection = (ids: string[], selected: boolean) =>
    setItems((prev) => prev.map((p) => (ids.includes(p.id) && !results[p.id]?.ok ? { ...p, selected } : p)));

  const apply = async () => {
    setSaving(true);
    const res = await onApply(pending);
    setResults((prev) => ({ ...prev, ...Object.fromEntries(res.map((r) => [r.id, r])) }));
    setSaving(false);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div ref={topRef} />
      {savedCount > 0 && (
        <div className="rounded-xl border border-cat-nutritional/30 bg-cat-nutritional/10 p-3 text-xs font-semibold text-cat-nutritional">
          ✅ {savedCount} dato(s) guardado(s) en los formularios.{failed.length > 0 ? ` ${failed.length} no se pudieron guardar (ver detalle en cada formulario).` : ""}
        </div>
      )}

      {/* Resumen del documento */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Sparkles size={16} className="text-primary" />
          <span className="text-sm font-black text-foreground">{extraction.documentTitle}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background border border-border">{DOCUMENT_KINDS[extraction.documentKind]}</span>
          {extraction.documentDate && <span className="text-[10px] text-muted-foreground">{extraction.documentDate}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground">{fileName} · {SOURCE_LABEL[extraction.source]}</p>
        {extraction.summary && <p className="text-xs text-foreground mt-2 leading-relaxed">{extraction.summary}</p>}
        {extraction.diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {extraction.diagnoses.map((d) => <span key={d} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border border-border">{d}</span>)}
          </div>
        )}
      </div>

      {aiError && (
        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="shrink-0" />
          <span>La IA no respondió ({aiError}). Se muestran los datos que el lector inteligente encontró; puede volver a analizar más tarde.</span>
        </div>
      )}

      {proposalSet.identityWarning && (
        <div className="flex gap-2 rounded-xl border-2 border-destructive/40 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
          <ShieldAlert size={18} className="shrink-0" />
          <span>{proposalSet.identityWarning} Por seguridad no se marcó ningún cambio.</span>
        </div>
      )}

      {extraction.alerts.map((a, i) => (
        <div key={i} className={`flex gap-2 rounded-xl border p-3 text-xs font-semibold ${ALERT_STYLE[a.severity]}`}>
          <AlertTriangle size={15} className="shrink-0" /> {a.message}
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          ✅ El documento quedó guardado. No encontró datos nuevos: todo lo que contiene ya está registrado.
        </p>
      )}

      {/* Propuestas por formulario */}
      {groups.map((g) => {
        const ids = g.items.map((p) => p.id);
        const allSelected = g.items.every((p) => p.selected);
        const allSaved = g.items.every((p) => results[p.id]?.ok);
        return (
          <section key={g.key} className="rounded-2xl border border-border bg-card overflow-hidden">
            <header className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
              <h4 className="text-xs font-black text-foreground">{g.label} <span className="text-muted-foreground font-bold">· {g.items.length}</span></h4>
              {allSaved ? <span className="text-[11px] font-bold text-cat-nutritional">Guardado ✓</span> : (
                <button type="button" onClick={() => setSection(ids, !allSelected)} className="text-[11px] font-bold text-primary">
                  {allSelected ? "Quitar todo" : "Marcar todo"}
                </button>
              )}
            </header>
            <ul className="divide-y divide-border">
              {g.items.map((p) => {
                const result = results[p.id];
                const badge = STATUS_BADGE[p.status];
                return (
                  <li key={p.id} className={`p-3 sm:p-4 flex gap-3 ${result?.ok ? "opacity-60" : ""}`}>
                    <div className="pt-0.5">
                      {result?.ok ? <CheckCircle2 size={18} className="text-cat-nutritional" />
                        : <Checkbox checked={p.selected} onCheckedChange={(v) => update(p.id, { selected: v === true })} aria-label={`Aplicar ${p.label}`} />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{p.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${badge.cls}`}>{badge.label}</span>
                        <span className={`text-[10px] ${p.confidence < 0.6 ? "text-amber-600 font-bold" : "text-muted-foreground"}`}>{confidenceLabel(p.confidence)}</span>
                      </div>
                      {p.current && p.status === "conflicto" && (
                        <p className="text-[11px] text-muted-foreground">Actual: <span className="line-through">{p.current}</span></p>
                      )}
                      {p.editable && !result?.ok ? (
                        p.proposed.length > 60
                          ? <textarea value={p.proposed} onChange={(e) => update(p.id, { proposed: e.target.value })} rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs resize-y" />
                          : <input value={p.proposed} onChange={(e) => update(p.id, { proposed: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs" />
                      ) : (
                        <p className="text-xs text-foreground">{p.proposed}</p>
                      )}
                      {p.evidence && (
                        <p className="flex gap-1 text-[10px] italic text-muted-foreground"><Quote size={10} className="shrink-0 mt-0.5" />{p.evidence}</p>
                      )}
                      {result && !result.ok && (
                        <p className="flex items-center gap-1 text-[11px] font-semibold text-destructive"><XCircle size={12} /> {result.error}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="flex gap-2 sticky bottom-0 bg-background/95 py-3">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 rounded-xl text-xs font-bold bg-muted text-muted-foreground min-h-[48px]">
          {savedCount > 0 || items.length === 0 ? "Listo" : "Cerrar"}
        </button>
        {pending.length > 0 && (
          <button type="button" onClick={apply} disabled={saving}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase bg-primary text-primary-foreground min-h-[48px] disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Aplicar {pending.length} cambio(s)
          </button>
        )}
      </div>
    </div>
  );
};

export default AIProposalReview;
