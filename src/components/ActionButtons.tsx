import { FileText } from "lucide-react";

interface ActionButtonsProps {
  onFinish: () => void;
  disabled?: boolean;
}

const ActionButtons = ({ onFinish, disabled }: ActionButtonsProps) => (
  <div className="flex flex-wrap gap-3 mt-8">
    <button
      onClick={onFinish}
      disabled={disabled}
      className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
    >
      Guardar y Finalizar
    </button>
    <button className="bg-muted text-muted-foreground px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors min-h-[48px]">
      Borrador
    </button>
    <button className="flex items-center gap-2 bg-card text-foreground border border-border px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors min-h-[48px]">
      <FileText size={14} />
      PDF
    </button>
  </div>
);

export default ActionButtons;
