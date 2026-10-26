import { History, X } from "lucide-react";

interface Props {
  restoredAt: Date | null;
  onDiscard: () => void;
}

/** Tells the person their unsent form came back, with a way to start over. */
const DraftNotice = ({ restoredAt, onDiscard }: Props) => {
  if (!restoredAt) return null;
  const when = restoredAt.toLocaleString("es-CO", { weekday: "long", hour: "numeric", minute: "2-digit" });
  return (
    <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm">
      <History size={18} className="shrink-0 text-primary" />
      <p className="flex-1 text-foreground">
        <span className="font-bold">Recuperamos lo que estabas llenando</span>
        <span className="text-muted-foreground"> ({when}). Revísalo y guarda.</span>
      </p>
      <button type="button" onClick={onDiscard}
        className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-muted">
        <X size={14} /> Empezar de nuevo
      </button>
    </div>
  );
};

export default DraftNotice;
