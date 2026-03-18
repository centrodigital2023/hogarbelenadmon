import FormHeader from "@/components/FormHeader";
import { ChevronRight } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  subtitle: string;
  icon: any;
  forms: string[];
  onBack: () => void;
}

const ModulePlaceholder = ({ title, subtitle, icon: Icon, forms, onBack }: ModulePlaceholderProps) => (
  <div className="animate-fade-in">
    <FormHeader title={title} subtitle={subtitle} onBack={onBack} />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {forms.map(f => (
        <button
          key={f}
          className="bg-card border-2 border-border rounded-2xl p-5 text-left hover:border-primary transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Icon size={20} className="text-primary" />
          </div>
          <p className="text-sm font-bold text-foreground">{f}</p>
          <p className="text-xs text-muted-foreground mt-1">Próximamente</p>
          <div className="flex items-center gap-1 mt-3 text-xs font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            ABRIR <ChevronRight size={14} />
          </div>
        </button>
      ))}
    </div>
  </div>
);

export default ModulePlaceholder;
