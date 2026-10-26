import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

/**
 * Building blocks shared by the HB forms so every screen looks and behaves the
 * same: large touch targets, 16px text on phones (no iOS zoom), clear labels.
 */

export const inputCls =
  "mt-1 w-full min-h-[44px] rounded-xl border border-input bg-background px-3 py-2 text-base sm:text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:text-muted-foreground";

export const smallInputCls =
  "w-full min-h-[40px] rounded-lg border border-input bg-background px-2 py-1.5 text-base sm:text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export const Section = ({ title, icon: Icon, hint, actions, children, className = "" }: {
  title?: string; icon?: LucideIcon; hint?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
}) => (
  <section className={`mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 ${className}`}>
    {(title || actions) && (
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {title && (
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            {Icon && <Icon size={16} className="text-primary" />} {title}
          </h3>
        )}
        {actions}
      </div>
    )}
    {hint && <p className="-mt-1 mb-3 text-xs text-muted-foreground">{hint}</p>}
    {children}
  </section>
);

export const Field = ({ label, required, hint, children, className = "" }: {
  label: string; required?: boolean; hint?: ReactNode; children: ReactNode; className?: string;
}) => (
  <label className={`block ${className}`}>
    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {label}{required && <span className="text-destructive"> *</span>}
    </span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
  </label>
);

export const ResidentSelect = ({ residents, value, onChange, placeholder = "Elegir residente…", loading }: {
  residents: { id: string; full_name: string }[]; value: string; onChange: (id: string) => void;
  placeholder?: string; loading?: boolean;
}) => (
  <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
    <option value="">{loading ? "Cargando residentes…" : residents.length === 0 ? "No hay residentes activos" : placeholder}</option>
    {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
  </select>
);

/** Row of pill buttons for choosing one option (turno, tipo, consecuencia…). */
export const ChoiceChips = <T extends string | number>({ options, value, onChange, size = "md" }: {
  options: ReadonlyArray<{ value: T; label: ReactNode }>; value: NoInfer<T> | null | undefined; onChange: (value: NoInfer<T>) => void; size?: "sm" | "md";
}) => (
  <div className="mt-1 flex flex-wrap gap-2" role="radiogroup">
    {options.map(o => {
      const active = o.value === value;
      return (
        <button key={String(o.value)} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)}
          className={`rounded-xl border-2 font-bold transition active:scale-95 ${size === "sm" ? "min-h-[36px] px-3 text-xs" : "min-h-[44px] px-4 text-sm"} ${
            active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-foreground hover:border-primary/40"
          }`}>
          {o.label}
        </button>
      );
    })}
  </div>
);

/** Whole-row checkbox that is easy to tap with a thumb. */
export const CheckRow = ({ checked, onChange, children, tone = "ok" }: {
  checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; tone?: "ok" | "danger";
}) => (
  <label className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition ${
    checked
      ? tone === "ok" ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"
      : "border-border hover:border-primary/30"
  }`}>
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-input bg-background"}`}>
      {checked && <Check size={16} strokeWidth={3} />}
    </span>
    <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span className="text-sm font-medium text-foreground">{children}</span>
  </label>
);

/** Progress line such as "5 de 7 áreas" with a bar. */
export const ProgressLine = ({ done, total, label }: { done: number; total: number; label: string }) => {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-bold text-foreground">{done} de {total} {label}</span>
    </div>
  );
};

/** Coloured message for alerts and smart hints. */
export const Notice = ({ tone = "info", children }: { tone?: "info" | "warning" | "danger" | "success"; children: ReactNode }) => {
  const styles = {
    info: "border-primary/20 bg-primary/5 text-foreground",
    warning: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
    danger: "border-destructive/40 bg-destructive/10 text-destructive",
    success: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
  }[tone];
  return <div className={`rounded-xl border p-3 text-xs font-medium sm:text-sm ${styles}`}>{children}</div>;
};
