import { memo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Users, ClipboardList, Utensils, Heart, Activity,
  Stethoscope, ShieldCheck, AlertTriangle, LogOut,
  Briefcase, TrendingUp, Settings, FileText, DollarSign, Clock
} from "lucide-react";

const modules = [
  { id: '1', type: 'Operativo', title: "1. Ingreso", subtitle: "Admisión", icon: ClipboardList },
  { id: '2', type: 'Clínico', title: "2. Valoración", subtitle: "Geriátrica", icon: Stethoscope },
  { id: '3', type: 'Operativo', title: "3. Alimentación", subtitle: "Nutrición", icon: Utensils },
  { id: '4', type: 'Operativo', title: "4. Bienestar", subtitle: "Terapias", icon: Heart },
  { id: '5', type: 'Salud', title: "5. Salud Diaria", subtitle: "Enfermería", icon: Activity },
  { id: '6', type: 'Clínico', title: "6. Sistema Salud", subtitle: "Urgencias", icon: Stethoscope },
  { id: '7', type: 'Preventivo', title: "7. Higiene", subtitle: "Prevención", icon: ShieldCheck },
  { id: '8', type: 'Riesgo', title: "8. Seguridad", subtitle: "Incidentes", icon: AlertTriangle },
  { id: '9', type: 'Operativo', title: "9. Egreso", subtitle: "Traslados", icon: LogOut },
  { id: '10', type: 'Recursos', title: "10. Personal", subtitle: "Talento", icon: Briefcase },
  { id: '11', type: 'Calidad', title: "11. Calidad", subtitle: "PQRSF", icon: TrendingUp },
  { id: '12', type: 'Gerencia', title: "12. Admin.", subtitle: "Gerencia", icon: Settings },
  { id: 'gerencial', type: 'Gerencia', title: "Gestión Admin.", subtitle: "HB-G01 a G06", icon: FileText },
  { id: 'finanzas', type: 'Finanzas', title: "Finanzas", subtitle: "Control", icon: DollarSign },
  { id: 'residentes', type: 'Operativo', title: "Residentes", subtitle: "Directorio", icon: Users },
  { id: 'timeline', type: 'Clínico', title: "Timeline", subtitle: "Vista Unificada", icon: Clock },
];

const TYPE_COLORS: Record<string, string> = {
  Operativo: "bg-primary/10 text-primary",
  Clínico: "bg-cat-cognitive/10 text-cat-cognitive",
  Salud: "bg-cat-functional/10 text-cat-functional",
  Preventivo: "bg-cat-nutritional/10 text-cat-nutritional",
  Riesgo: "bg-destructive/10 text-destructive",
  Recursos: "bg-cat-mobility/10 text-cat-mobility",
  Calidad: "bg-cat-social/10 text-cat-social",
  Gerencia: "bg-cat-fragility/10 text-cat-fragility",
  Finanzas: "bg-cat-mood/10 text-cat-mood",
};

interface DashboardViewProps {
  onModuleChange: (id: string) => void;
}

const ModuleCard = memo(({ mod, onClick }: { mod: typeof modules[0]; onClick: () => void }) => {
  const Icon = mod.icon;
  const colorClass = TYPE_COLORS[mod.type] || "bg-primary/10 text-primary";

  return (
    <button
      onClick={onClick}
      className="group relative bg-card border border-border rounded-2xl p-5 sm:p-6 text-left 
        hover:border-primary/40 hover:shadow-[var(--shadow-elevated)] 
        transition-all duration-200 active:scale-[0.97] min-h-[48px] touch-manipulation
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 
        group-hover:scale-105 transition-transform duration-200 shadow-sm">
        <Icon size={20} />
      </div>
      <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md mb-2 ${colorClass}`}>
        {mod.type}
      </span>
      <p className="text-sm sm:text-base font-black text-foreground leading-tight">{mod.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{mod.subtitle}</p>
    </button>
  );
});
ModuleCard.displayName = "ModuleCard";

const DashboardView = ({ onModuleChange }: DashboardViewProps) => {
  const { canAccessModule } = usePermissions();
  const visibleModules = modules.filter(m => canAccessModule(m.id));

  return (
    <div className="animate-fade-in">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-foreground">Panel de Control</h2>
        <p className="text-sm text-muted-foreground mt-1">Operación Belén • 2026</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {visibleModules.map(mod => (
          <ModuleCard key={mod.id} mod={mod} onClick={() => onModuleChange(mod.id)} />
        ))}
      </div>
    </div>
  );
};

export default DashboardView;
