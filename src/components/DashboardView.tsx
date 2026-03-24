import { usePermissions } from "@/hooks/usePermissions";
import {
  Users, ClipboardList, Utensils, Heart, Activity,
  Stethoscope, ShieldCheck, AlertTriangle, LogOut,
  Briefcase, TrendingUp, Settings, DollarSign,
  BookOpen, Share2, UserPlus, FileText
} from "lucide-react";

type Module = Parameters<ReturnType<typeof usePermissions>['canAccess']>[0];

interface ModuleDef {
  id: string;
  perm: Module | null;
  type: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface Section {
  label: string;
  modules: ModuleDef[];
}

const SECTIONS: Section[] = [
  {
    label: "Atención y Cuidado",
    modules: [
      { id: '1',         perm: 'ingreso',       type: 'Operativo',  title: "1. Ingreso",        subtitle: "Admisión",   icon: ClipboardList },
      { id: '2',         perm: 'valoracion',    type: 'Clínico',    title: "2. Valoración",     subtitle: "Geriátrica", icon: Stethoscope },
      { id: '3',         perm: 'alimentacion',  type: 'Operativo',  title: "3. Alimentación",   subtitle: "Nutrición",  icon: Utensils },
      { id: '4',         perm: 'bienestar',     type: 'Operativo',  title: "4. Bienestar",      subtitle: "Terapias",   icon: Heart },
      { id: '5',         perm: 'salud',         type: 'Salud',      title: "5. Salud Diaria",   subtitle: "Enfermería", icon: Activity },
      { id: '6',         perm: 'sistema_salud', type: 'Clínico',    title: "6. Sistema Salud",  subtitle: "Urgencias",  icon: Stethoscope },
      { id: '7',         perm: 'higiene',       type: 'Preventivo', title: "7. Higiene",        subtitle: "Prevención", icon: ShieldCheck },
      { id: '8',         perm: null,            type: 'Riesgo',     title: "8. Seguridad",      subtitle: "Incidentes", icon: AlertTriangle },
      { id: '9',         perm: 'egreso',        type: 'Operativo',  title: "9. Egreso",         subtitle: "Traslados",  icon: LogOut },
      { id: 'residentes',perm: 'residentes',    type: 'Directorio', title: "Residentes",        subtitle: "Fichas",     icon: Users },
    ],
  },
  {
    label: "Gestión del Talento y Calidad",
    modules: [
      { id: '10', perm: 'personal',  type: 'Recursos', title: "10. Personal", subtitle: "Talento",  icon: Briefcase },
      { id: '11', perm: 'calidad',   type: 'Calidad',  title: "11. Calidad",  subtitle: "PQRSF",    icon: TrendingUp },
    ],
  },
  {
    label: "Administración y Sistema",
    modules: [
      { id: '12',       perm: 'admin',     type: 'Gerencia',    title: "12. Admin.",         subtitle: "Gerencia",     icon: Settings },
      { id: 'gerencial',perm: 'gerencial', type: 'Formularios', title: "Gestión Admin.",     subtitle: "HB-G01–G06",   icon: FileText },
      { id: 'finanzas', perm: 'finanzas',  type: 'Finanzas',    title: "Finanzas",           subtitle: "Control",      icon: DollarSign },
      { id: 'usuarios', perm: 'usuarios',  type: 'Sistema',     title: "Usuarios",           subtitle: "Gestión",      icon: UserPlus },
      { id: 'blog',     perm: 'blog',      type: 'Comunicación',title: "Blog",               subtitle: "Noticias",     icon: BookOpen },
      { id: 'redes',    perm: 'redes',     type: 'Comunicación',title: "Redes Sociales",     subtitle: "Publicaciones",icon: Share2 },
    ],
  },
];

interface DashboardViewProps {
  onModuleChange: (id: string) => void;
}

const DashboardView = ({ onModuleChange }: DashboardViewProps) => {
  const { canAccess } = usePermissions();

  const visibleSections = SECTIONS.map(section => ({
    ...section,
    modules: section.modules.filter(m =>
      m.perm === null || canAccess(m.perm)
    ),
  })).filter(s => s.modules.length > 0);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-foreground">Panel de Control</h2>
        <p className="text-sm text-muted-foreground">Operación Belén • 2026</p>
      </div>

      {visibleSections.map(section => (
        <div key={section.label} className="mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 pl-1">
            {section.label}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {section.modules.map(mod => {
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
      ))}
    </div>
  );
};

export default DashboardView;
