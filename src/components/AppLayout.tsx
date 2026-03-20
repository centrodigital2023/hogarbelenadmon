import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Users, ClipboardList, Utensils, Heart, Activity,
  Stethoscope, ShieldCheck, AlertTriangle, LogOut,
  Briefcase, TrendingUp, Settings, Sparkles, Menu,
  X, UserPlus, Home, ChevronRight, DollarSign,
  BookOpen, Share2, FileText
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
}

const modules = [
  { id: 'dashboard', title: "Panel", icon: Home, roles: [] as string[] },
  { id: '1', title: "1. Ingreso", subtitle: "Admisión", icon: ClipboardList, roles: ['super_admin', 'coordinador'] },
  { id: '2', title: "2. Valoración", subtitle: "Geriátrica", icon: Stethoscope, roles: ['super_admin', 'coordinador', 'enfermera', 'terapeuta'] },
  { id: '3', title: "3. Alimentación", subtitle: "Nutrición", icon: Utensils, roles: ['super_admin', 'coordinador', 'cuidadora', 'manipuladora'] },
  { id: '4', title: "4. Bienestar", subtitle: "Terapias", icon: Heart, roles: ['super_admin', 'coordinador', 'enfermera', 'cuidadora', 'terapeuta', 'psicologo'] },
  { id: '5', title: "5. Salud Diaria", subtitle: "Enfermería", icon: Activity, roles: ['super_admin', 'coordinador', 'enfermera'] },
  { id: '6', title: "6. Sistema Salud", subtitle: "Urgencias", icon: Stethoscope, roles: ['super_admin', 'coordinador', 'enfermera'] },
  { id: '7', title: "7. Higiene", subtitle: "Prevención", icon: ShieldCheck, roles: ['super_admin', 'coordinador', 'cuidadora', 'enfermera'] },
  { id: '8', title: "8. Seguridad", subtitle: "Incidentes", icon: AlertTriangle, roles: [] },
  { id: '9', title: "9. Egreso", subtitle: "Traslados", icon: LogOut, roles: ['super_admin', 'coordinador'] },
  { id: '10', title: "10. Personal", subtitle: "Talento", icon: Briefcase, roles: ['super_admin', 'coordinador'] },
  { id: '11', title: "11. Calidad", subtitle: "PQRSF", icon: TrendingUp, roles: ['super_admin', 'coordinador'] },
  { id: '12', title: "12. Admin.", subtitle: "Gerencia", icon: Settings, roles: ['super_admin', 'administrativo'] },
  { id: 'gerencial', title: "Gestión Admin.", subtitle: "HB-G01 a G06", icon: FileText, roles: ['super_admin', 'coordinador', 'administrativo'] },
  { id: 'finanzas', title: "Finanzas", subtitle: "Control", icon: DollarSign, roles: ['super_admin', 'administrativo'] },
  { id: 'blog', title: "Blog", subtitle: "Noticias", icon: BookOpen, roles: ['super_admin', 'administrativo'] },
  { id: 'redes', title: "Redes Sociales", subtitle: "Publicaciones", icon: Share2, roles: ['super_admin', 'administrativo'] },
  { id: 'usuarios', title: "Usuarios", subtitle: "Gestión", icon: UserPlus, roles: ['super_admin'] },
  { id: 'residentes', title: "Residentes", subtitle: "Directorio", icon: Users, roles: ['super_admin', 'coordinador'] },
];

const AppLayout = ({ children, activeModule, onModuleChange }: AppLayoutProps) => {
  const { profile, roles, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoSave, setAutoSave] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAutoSave(true);
      setTimeout(() => setAutoSave(false), 1500);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const visibleModules = modules.filter(m => {
    if (m.roles.length === 0) return true;
    return m.roles.some(r => roles.includes(r as any));
  });

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-secondary text-secondary-foreground transform transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-secondary-foreground/10">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black tracking-tight truncate">HOGAR BELÉN</h1>
            <p className="text-[10px] text-secondary-foreground/60 font-medium">Buesaco S.A.S.</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-secondary-foreground/60">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {visibleModules.map(m => {
            const Icon = m.icon;
            const isActive = activeModule === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { onModuleChange(m.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all min-h-[40px] ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-secondary-foreground/70 hover:bg-secondary-foreground/10 hover:text-secondary-foreground'
                }`}
              >
                <Icon size={16} />
                <span className="truncate">{m.title}</span>
                {isActive && <ChevronRight size={12} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-secondary-foreground/10">
          <p className="text-[10px] font-bold text-secondary-foreground/60 truncate">{profile?.full_name}</p>
          <p className="text-[9px] text-secondary-foreground/40 capitalize">{roles[0] || 'Sin rol'}</p>
          <button
            onClick={signOut}
            className="mt-2 w-full text-[10px] font-bold text-secondary-foreground/50 hover:text-destructive transition-colors text-left"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-muted">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 text-xs ml-auto">
            <span className={`w-2 h-2 rounded-full ${autoSave ? 'bg-cat-fragility animate-pulse' : 'bg-cat-nutritional'}`} />
            <span className="text-muted-foreground font-medium">
              {autoSave ? 'Sincronizando...' : 'En Línea'}
            </span>
            <span className="font-black bg-muted px-2 py-1 rounded-lg text-[10px]">CO</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="text-center py-3 text-[10px] text-muted-foreground font-medium border-t border-border">
          Hogar Belén • Gestión Segura • Hecho en Colombia 🇨🇴
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
