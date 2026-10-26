import { ArrowLeft } from "lucide-react";

interface FormHeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
}

const FormHeader = ({ title, subtitle, onBack }: FormHeaderProps) => (
  <div className="mb-6 flex items-start gap-3">
    <button
      onClick={onBack}
      aria-label="Volver"
      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-secondary text-xs font-bold uppercase tracking-widest text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground sm:order-last sm:ml-auto sm:min-h-[48px] sm:px-5"
    >
      <ArrowLeft size={18} />
      <span className="hidden sm:inline">Volver</span>
    </button>
    <div className="min-w-0">
      <h2 className="text-xl font-black leading-tight text-foreground sm:text-2xl">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

export default FormHeader;
