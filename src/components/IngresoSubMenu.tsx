import { ClipboardList, Home } from "lucide-react";
import FormHeader from "./FormHeader";

interface IngresoSubMenuProps {
  onSelectForm: (formId: string) => void;
  onBack: () => void;
}

const forms = [
  { id: 'HB-F1', title: 'HB-F1: Checklist', variant: 0 },
  { id: 'HB-F3', title: 'HB-F3: Inventario', variant: 1 },
  { id: 'HB-F22', title: 'HB-F22: Vida', variant: 2 },
  { id: 'MAPA', title: 'Asignación Hab.', variant: 3 },
];

const IngresoSubMenu = ({ onSelectForm, onBack }: IngresoSubMenuProps) => (
  <div className="animate-fade-in">
    <FormHeader title="1. Ingreso" subtitle="Proceso de admisión del residente" onBack={onBack} />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {forms.map(form => (
        <button
          key={form.id}
          onClick={() => onSelectForm(form.id)}
          className="bg-card p-6 rounded-4xl border-2 border-border hover:border-primary transition-all text-left shadow-sm group min-h-[48px]"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
            {form.id === 'MAPA' ? <Home size={20} /> : <ClipboardList size={20} />}
          </div>
          <p className="text-sm font-bold text-foreground">{form.title}</p>
        </button>
      ))}
    </div>
  </div>
);

export default IngresoSubMenu;
