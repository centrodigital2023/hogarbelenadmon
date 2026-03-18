import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import AppLayout from "@/components/AppLayout";
import IngresoSubMenu from "@/components/IngresoSubMenu";
import ValoracionGeriatrica from "@/components/ValoracionGeriatrica";
import FormHeader from "@/components/FormHeader";
import UserManagement from "@/pages/UserManagement";
import ResidentManagement from "@/pages/ResidentManagement";
import DashboardView from "@/components/DashboardView";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import {
  ClipboardList, Stethoscope, Utensils, Heart, Activity,
  ShieldCheck, AlertTriangle, LogOut, Briefcase, TrendingUp, Settings
} from "lucide-react";

const MODULE_INFO: Record<string, { title: string; subtitle: string; icon: any; forms: string[] }> = {
  '3': { title: '3. Alimentación', subtitle: 'Nutrición y cocina', icon: Utensils, forms: ['HB-F5: Checklist Cocina', 'HB-F6: Ingreso Alimentos', 'HB-F7: Temperatura Neveras', 'HB-F8: Desinfección'] },
  '4': { title: '4. Bienestar', subtitle: 'Terapias y actividades', icon: Heart, forms: ['HB-F4: Bitácora Diaria', 'HB-F9: Terapias', 'HB-F10: Atención Psicosocial', 'HB-F11: Espiritual', 'HB-F12: Celebraciones', 'HB-F13: Actividades'] },
  '5': { title: '5. Salud Diaria', subtitle: 'Enfermería', icon: Activity, forms: ['HB-F4: Bitácora', 'HB-F14: Medicamentos', 'HB-F15: Administración Med.', 'HB-F16: Signos Vitales'] },
  '6': { title: '6. Sistema Salud', subtitle: 'Urgencias y citas', icon: Stethoscope, forms: ['HB-F17: Citas Médicas', 'HB-F18: Post-Hospitalización', 'HB-F19: Carpeta Urgencias', 'HB-F21: Autorización'] },
  '7': { title: '7. Higiene', subtitle: 'Prevención', icon: ShieldCheck, forms: ['HB-F8a1: Desinfección General', 'Control Higiene Diaria', 'Vigilancia Infecciones'] },
  '8': { title: '8. Seguridad', subtitle: 'Incidentes y riesgos', icon: AlertTriangle, forms: ['HB-F20: Incidentes/Caídas', 'Evaluación Riesgos', 'Rondas Seguridad', 'Simulacros'] },
  '9': { title: '9. Egreso', subtitle: 'Traslados', icon: LogOut, forms: ['HB-F3: Inventario Egreso', 'Acta de Egreso', 'HB-F18: Seguimiento'] },
  '10': { title: '10. Personal', subtitle: 'Talento humano', icon: Briefcase, forms: ['HB-F24: Capacitaciones', 'HB-F25: Evaluación Desempeño', 'Gestión Personal', 'Inducción'] },
  '11': { title: '11. Calidad', subtitle: 'PQRSF e indicadores', icon: TrendingUp, forms: ['HB-F26: Tablero KPIs', 'HB-F23: PQRSF', 'Auditorías', 'Encuestas Satisfacción'] },
  '12': { title: '12. Admin.', subtitle: 'Gerencia y finanzas', icon: Settings, forms: ['Plan de Cuentas', 'Transacciones', 'Facturación', 'Proveedores', 'Informes Financieros'] },
};

const Index = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState('dashboard');
  const [form, setForm] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const renderContent = () => {
    if (view === 'dashboard') return <DashboardView onModuleChange={setView} />;

    if (view === '1') {
      if (form === 'HB-F1') {
        return (
          <div className="animate-fade-in">
            <FormHeader title="HB-F1: Checklist de Ingreso" subtitle="Verificación de documentos" onBack={() => setForm(null)} />
            <p className="text-muted-foreground">Formulario en desarrollo...</p>
          </div>
        );
      }
      return <IngresoSubMenu onSelectForm={setForm} onBack={() => setView('dashboard')} />;
    }

    if (view === '2') return <ValoracionGeriatrica onBack={() => setView('dashboard')} />;
    if (view === 'usuarios') return <UserManagement onBack={() => setView('dashboard')} />;
    if (view === 'residentes') return <ResidentManagement onBack={() => setView('dashboard')} />;

    // Module placeholder for modules 3-12
    const info = MODULE_INFO[view];
    if (info) {
      return <ModulePlaceholder {...info} onBack={() => setView('dashboard')} />;
    }

    return <DashboardView onModuleChange={setView} />;
  };

  return (
    <AppLayout activeModule={view} onModuleChange={(id) => { setView(id); setForm(null); }}>
      {renderContent()}
    </AppLayout>
  );
};

export default Index;
