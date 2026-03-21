import { usePermissions, MODULE_PERMISSION_MAP } from "@/hooks/usePermissions";
import {
  Users, ClipboardList, Utensils, Heart, Activity,
  Stethoscope, ShieldCheck, AlertTriangle, LogOut,
  Briefcase, TrendingUp, Settings, FileText, DollarSign
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
];

interface DashboardViewProps {
  onModuleChange: (id: string) => void;
}

const DashboardView = ({ onModuleChange }: DashboardViewProps) => {
  const { canAccessModule } = usePermissions();
  
  const visibleModules = modules.filter(m => canAccessModule(m.id));

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-foreground">Panel de Control</h2>
        <p className="text-sm text-muted-foreground">Operación Belén • 2026</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleModules.map(mod => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => onModuleChange(mod.id)}
              className="group relative bg-card border-2 border-border rounded-3xl p-6 text-left hover:border-primary hover:shadow-xl transition-all active:scale-[0.97] min-h-[48px]"
            >
              <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon size={22} />
              </div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md mb-2">
                {mod.type}
              </span>
              <p className="text-base font-black text-foreground leading-tight">{mod.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{mod.subtitle}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardView;
