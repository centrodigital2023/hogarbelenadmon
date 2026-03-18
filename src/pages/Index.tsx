import { useState, useEffect } from "react";
import {
  Users, ClipboardList, Utensils, Heart, Activity,
  Stethoscope, ShieldCheck, AlertTriangle, LogOut,
  Briefcase, TrendingUp, Settings, Sparkles
} from "lucide-react";
import type { Module } from "@/data/types";
import IngresoSubMenu from "@/components/IngresoSubMenu";
import ValoracionGeriatrica from "@/components/ValoracionGeriatrica";
import FormHeader from "@/components/FormHeader";

const iconMap: Record<string, React.ReactNode> = {
  ClipboardList: <ClipboardList size={22} />,
  Stethoscope: <Stethoscope size={22} />,
  Utensils: <Utensils size={22} />,
  Heart: <Heart size={22} />,
  Activity: <Activity size={22} />,
  ShieldCheck: <ShieldCheck size={22} />,
  AlertTriangle: <AlertTriangle size={22} />,
  LogOut: <LogOut size={22} />,
  Users: <Users size={22} />,
  Briefcase: <Briefcase size={22} />,
  TrendingUp: <TrendingUp size={22} />,
  Settings: <Settings size={22} />,
};

const modules: Module[] = [
  { id: 1, type: 'Operativo', title: "1. Ingreso", subtitle: "Admisión", iconName: "ClipboardList" },
  { id: 2, type: 'Clínico', title: "2. Valoración", subtitle: "Geriátrica", iconName: "Stethoscope" },
  { id: 3, type: 'Operativo', title: "3. Alimentación", subtitle: "Nutrición", iconName: "Utensils" },
  { id: 4, type: 'Operativo', title: "4. Bienestar", subtitle: "Terapias", iconName: "Heart" },
  { id: 5, type: 'Salud', title: "5. Salud Diaria", subtitle: "Enfermería", iconName: "Activity" },
  { id: 6, type: 'Clínico', title: "6. Sistema Salud", subtitle: "Urgencias", iconName: "Stethoscope" },
  { id: 7, type: 'Preventivo', title: "7. Higiene", subtitle: "Prevención", iconName: "ShieldCheck" },
  { id: 8, type: 'Riesgo', title: "8. Seguridad", subtitle: "Incidentes", iconName: "AlertTriangle" },
  { id: 9, type: 'Operativo', title: "9. Egreso", subtitle: "Traslados", iconName: "LogOut" },
  { id: 10, type: 'Recursos', title: "10. Personal", subtitle: "Talento", iconName: "Briefcase" },
  { id: 11, type: 'Calidad', title: "11. Calidad", subtitle: "PQRSF", iconName: "TrendingUp" },
  { id: 12, type: 'Gerencia', title: "12. Admin.", subtitle: "Gerencia", iconName: "Settings" },
];

const Index = () => {
  const [view, setView] = useState('dashboard');
  const [form, setForm] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setAutoSave(true);
      setTimeout(() => setAutoSave(false), 1500);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (view === '1') {
      if (form === 'HB-F1') {
        return (
          <div className="animate-fade-in">
            <FormHeader title="HB-F1: Checklist" subtitle="Checklist de ingreso" onBack={() => setForm(null)} />
            <p className="text-muted-foreground">Formulario Checklist...</p>
          </div>
        );
      }
      return <IngresoSubMenu onSelectForm={setForm} onBack={() => setView('dashboard')} />;
    }

    if (view === '2') {
      return <ValoracionGeriatrica onBack={() => setView('dashboard')} />;
    }

    // Dashboard
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
        {modules.map(mod => (
          <button
            key={mod.id}
            onClick={() => setView(mod.id.toString())}
            className="group relative bg-card border-2 border-border rounded-4xl p-6 text-left hover:border-primary hover:shadow-xl transition-all active:scale-[0.97] min-h-[48px]"
          >
            <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {iconMap[mod.iconName] || <Settings size={22} />}
            </div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md mb-2">
              {mod.type}
            </span>
            <p className="text-base font-black text-foreground leading-tight">{mod.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{mod.subtitle}</p>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-secondary text-secondary-foreground px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight">HOGAR BELÉN</h1>
            <p className="text-[10px] text-secondary-foreground/60 font-medium">Buesaco S.A.S.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${autoSave ? 'bg-cat-fragility animate-pulse' : 'bg-cat-nutritional'}`} />
            <span className="text-secondary-foreground/70 font-medium">
              {autoSave ? 'Sincronizando...' : 'Sistema en Línea'}
            </span>
          </div>
          <span className="text-xs font-black bg-secondary-foreground/10 px-3 py-1.5 rounded-lg">CO</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {view === 'dashboard' && (
          <div className="mb-6">
            <h2 className="text-3xl font-black text-foreground">Panel de Control</h2>
            <p className="text-sm text-muted-foreground">Operación Belén • 2026</p>
          </div>
        )}
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-[10px] text-muted-foreground font-medium border-t border-border">
        Hogar Belén • Gestión Segura • Hecho en Colombia 🇨🇴
      </footer>
    </div>
  );
};

export default Index;
