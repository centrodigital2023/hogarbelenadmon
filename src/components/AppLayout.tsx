import { useState, useCallback, memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, ROLE_LABELS } from "@/hooks/usePermissions";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import InstallAppButton from "@/components/InstallAppButton";
import InstallBanner from "@/components/install/InstallBanner";
import NotificationBell from "@/components/NotificationBell";
import logo from "@/assets/logo.png";
import {
  Users, ClipboardList, Utensils, Heart, Activity,
  Stethoscope, ShieldCheck, AlertTriangle, LogOut,
  Briefcase, TrendingUp, Settings, Menu,
  X, UserPlus, Home, ChevronRight, DollarSign,
  BookOpen, Share2, FileText, WifiOff, Clock
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
}

const modules = [
  { id: 'dashboard', title: "Panel", icon: Home },
  { id: '1', title: "1. Ingreso", subtitle: "Admisión", icon: ClipboardList },
  { id: '2', title: "2. Valoración", subtitle: "Geriátrica", icon: Stethoscope },
  { id: '3', title: "3. Alimentación", subtitle: "Nutrición", icon: Utensils },
  { id: '4', title: "4. Bienestar", subtitle: "Terapias", icon: Heart },
  { id: '5', title: "5. Salud Diaria", subtitle: "Enfermería", icon: Activity },
  { id: '6', title: "6. Sistema Salud", subtitle: "Urgencias", icon: Stethoscope },
  { id: '7', title: "7. Higiene", subtitle: "Prevención", icon: ShieldCheck },
  { id: '8', title: "8. Seguridad", subtitle: "Incidentes", icon: AlertTriangle },
  { id: '9', title: "9. Egreso", subtitle: "Traslados", icon: LogOut },
  { id: '10', title: "10. Personal", subtitle: "Talento", icon: Briefcase },
  { id: '11', title: "11. Calidad", subtitle: "PQRSF", icon: TrendingUp },
  { id: '12', title: "12. Admin.", subtitle: "Gerencia", icon: Settings },
  { id: 'gerencial', title: "Gestión Admin.", subtitle: "HB-G01 a G06", icon: FileText },
  { id: 'instituciones', title: "Instituciones", subtitle: "Resumen", icon: FileText },
  { id: 'finanzas', title: "Finanzas", subtitle: "Control", icon: DollarSign },
  { id: 'blog', title: "Blog", subtitle: "Noticias", icon: BookOpen },
  { id: 'redes', title: "Redes Sociales", subtitle: "Publicaciones", icon: Share2 },
  { id: 'usuarios', title: "Usuarios", subtitle: "Gestión", icon: UserPlus },
  { id: 'residentes', title: "Residentes", subtitle: "Directorio", icon: Users },
  { id: 'timeline', title: "Timeline", subtitle: "Vista unificada", icon: Clock },
];

const NavItem = memo(({ m, isActive, onClick }: { m: typeof modules[0]; isActive: boolean; onClick: () => void }) => {
  const Icon = m.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all duration-150 min-h-[44px] touch-manipulation ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-secondary-foreground/70 hover:bg-secondary-foreground/10 hover:text-secondary-foreground active:bg-secondary-foreground/15'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{m.title}</span>
      {isActive && <ChevronRight size={12} className="ml-auto shrink-0" />}
    </button>
  );
});
NavItem.displayName = "NavItem";

const AppLayout = ({ children, activeModule, onModuleChange }: AppLayoutProps) => {
  const { profile, roles, signOut } = useAuth();
  const { canAccessModule } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const online = useOnlineStatus();

  const handleModuleClick = useCallback((id: string) => {
    onModuleChange(id);
    setSidebarOpen(false);
  }, [onModuleChange]);

  const visibleModules = modules.filter(m => canAccessModule(m.id));

  // Thumb-reachable shortcuts for phones; everything else stays in the side menu
  const bottomNav = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: '2', label: 'Valoración', icon: Stethoscope },
    { id: '5', label: 'Salud', icon: Activity },
    { id: 'residentes', label: 'Residentes', icon: Users },
  ].filter(item => canAccessModule(item.id));

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] md:w-64 bg-secondary text-secondary-foreground 
          transform transition-transform duration-200 ease-out will-change-transform
          lg:translate-x-0 lg:static safe-top safe-bottom
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-secondary-foreground/10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm p-1">
            <img src={logo} alt="" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black tracking-tight truncate">HOGAR BELÉN</h1>
            <p className="text-[10px] text-secondary-foreground/60 font-medium">Buesaco S.A.S.</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 -mr-2 text-secondary-foreground/60 hover:text-secondary-foreground rounded-lg active:bg-secondary-foreground/10 touch-manipulation"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5 overscroll-contain" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {visibleModules.map(m => (
            <NavItem key={m.id} m={m} isActive={activeModule === m.id} onClick={() => handleModuleClick(m.id)} />
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-secondary-foreground/10">
          <p className="text-[10px] font-bold text-secondary-foreground/60 truncate">{profile?.full_name}</p>
          <p className="text-[9px] text-secondary-foreground/40">{roles.map(r => ROLE_LABELS[r] ?? r).join(', ') || 'Sin rol'}</p>
          <button
            onClick={signOut}
            className="mt-2 w-full text-[10px] font-bold text-secondary-foreground/50 hover:text-destructive transition-colors text-left touch-manipulation"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden grid bg-card/95 glass border-t border-border safe-bottom"
        style={{ gridTemplateColumns: `repeat(${bottomNav.length + 1}, minmax(0, 1fr))` }}
      >
        {bottomNav.map(item => {
          const Icon = item.icon;
          const active = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleModuleClick(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold touch-manipulation min-h-[56px] transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold text-muted-foreground touch-manipulation min-h-[56px]"
        >
          <Menu size={20} />
          Más
        </button>
      </nav>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 z-40 lg:hidden glass animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="bg-card/80 glass border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30 safe-top">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-muted active:bg-muted/80 touch-manipulation"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 text-xs ml-auto">
            <InstallAppButton />
            <NotificationBell />
            <span
              className={`w-2 h-2 rounded-full ${online ? 'bg-cat-nutritional' : 'bg-destructive animate-pulse'}`}
              aria-hidden
            />
            <span className="text-muted-foreground font-medium">{online ? 'En línea' : 'Sin conexión'}</span>
          </div>
        </header>

        {!online && (
          <div role="status" className="bg-destructive/10 text-destructive text-xs font-bold px-4 py-2 flex items-center gap-2 justify-center">
            <WifiOff size={14} />
            Sin conexión. Los registros no se podrán guardar hasta que vuelva el internet.
          </div>
        )}

        <InstallBanner />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="text-center py-3 pb-20 lg:pb-3 text-[10px] text-muted-foreground font-medium border-t border-border safe-bottom">
          Hogar Belén • Gestión Segura • Hecho en Colombia 🇨🇴
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
