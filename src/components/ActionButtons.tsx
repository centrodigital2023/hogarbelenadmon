import { CheckCircle2, Loader2, Save, CloudOff } from "lucide-react";

interface ActionButtonsProps {
  onFinish: () => void;
  disabled?: boolean;
  /** Shows a spinner and blocks a second tap while saving. */
  saving?: boolean;
  /** Required fields still empty; listed under the button instead of a silent grey button. */
  missing?: string[];
  /** Button text; "Guardar" by default. */
  label?: string;
  /** When the draft was last kept on this device. */
  draftSavedAt?: Date | null;
  /** Number of records the save will create, shown on the button ("Guardar 5 registros"). */
  count?: number;
  /** Stays in the flow instead of pinning to the bottom of the screen (forms inside cards). */
  inline?: boolean;
}

const timeLabel = (d: Date) => d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });

/**
 * Save bar shared by every form. On phones it stays pinned above the bottom
 * navigation so "Guardar" is always one thumb away, and it says what is missing.
 */
const ActionButtons = ({ onFinish, disabled, saving, missing = [], label = "Guardar", draftSavedAt, count, inline }: ActionButtonsProps) => {
  const blocked = Boolean(disabled || saving || missing.length > 0);
  const text = saving ? "Guardando…" : count && count > 1 ? `${label} · ${count} registros` : label;

  return (
    <div
      className={inline
        ? "mt-6"
        : "sticky bottom-[calc(64px+env(safe-area-inset-bottom))] lg:bottom-4 z-20 mt-8 -mx-2 sm:mx-0"}
    >
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${inline ? "" : "rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur"}`}>
        <button
          type="button"
          onClick={onFinish}
          disabled={blocked}
          aria-busy={saving}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-black text-primary-foreground shadow-sm transition active:scale-[0.98] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {text}
        </button>
        <div className="min-w-0 flex-1 text-center text-xs sm:text-left">
          {missing.length > 0 ? (
            <p className="font-bold text-amber-700 dark:text-amber-400">Falta: {missing.join(", ")}</p>
          ) : draftSavedAt ? (
            <p className="flex items-center justify-center gap-1 text-muted-foreground sm:justify-start">
              <CheckCircle2 size={13} className="text-emerald-600" />
              Borrador guardado en este equipo · {timeLabel(draftSavedAt)}
            </p>
          ) : !navigator.onLine ? (
            <p className="flex items-center justify-center gap-1 text-amber-700 sm:justify-start">
              <CloudOff size={13} /> Sin conexión: el borrador se guarda en este equipo
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ActionButtons;
