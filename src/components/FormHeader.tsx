import { ArrowLeft } from "lucide-react";

interface FormHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
}

const FormHeader = ({ title, subtitle, onBack }: FormHeaderProps) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-2xl font-black text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <button
      onClick={onBack}
      className="flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors min-h-[48px]"
    >
      <ArrowLeft size={16} />
      Volver
    </button>
  </div>
);

export default FormHeader;
