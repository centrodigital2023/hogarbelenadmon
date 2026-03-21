import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, MODULE_PERMISSION_MAP } from "@/hooks/usePermissions";
import Login from "@/pages/Login";
import AppLayout from "@/components/AppLayout";
import IngresoSubMenu from "@/components/IngresoSubMenu";
import ValoracionGeriatrica from "@/components/ValoracionGeriatrica";
import FormHeader from "@/components/FormHeader";
import UserManagement from "@/pages/UserManagement";
import ResidentManagement from "@/pages/ResidentManagement";
import DashboardView from "@/components/DashboardView";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import ProtectedModule from "@/components/ProtectedModule";
import AdmissionChecklist from "@/components/forms/AdmissionChecklist";
import BelongingsInventory from "@/components/forms/BelongingsInventory";
import LifeHistory from "@/components/forms/LifeHistory";
import DailyLog from "@/components/forms/DailyLog";
import KitchenChecklist from "@/components/forms/KitchenChecklist";
import FridgeTemps from "@/components/forms/FridgeTemps";
import FoodIntake from "@/components/forms/FoodIntake";
import DisinfectionRecord from "@/components/forms/DisinfectionRecord";
import VitalSigns from "@/components/forms/VitalSigns";
import MedicationList from "@/components/forms/MedicationList";
import MedicationAdmin from "@/components/forms/MedicationAdmin";
import TherapyRecords from "@/components/forms/TherapyRecords";
import IncidentReport from "@/components/forms/IncidentReport";
import MedicalAppointments from "@/components/forms/MedicalAppointments";
import TrainingRecord from "@/components/forms/TrainingRecord";
import PerformanceEval from "@/components/forms/PerformanceEval";
import PQRSFRecord from "@/components/forms/PQRSFRecord";
import HygieneKit from "@/components/forms/HygieneKit";
import RoomAssignment from "@/components/RoomAssignment";
import DocumentManager from "@/components/DocumentManager";
import LogoSettings from "@/components/LogoSettings";
import TrainingModule from "@/components/TrainingModule";
import NursingNotes from "@/components/NursingNotes";
import IndicatorsDashboard from "@/components/IndicatorsDashboard";
import BillingModule from "@/components/BillingModule";
import CarePlanGenerator from "@/components/CarePlanGenerator";
import FinanceModule from "@/components/FinanceModule";
import BlogModule from "@/components/BlogModule";
import SocialMediaModule from "@/components/SocialMediaModule";
import AuditReport from "@/components/AuditReport";
import UnifiedKitchen from "@/components/forms/UnifiedKitchen";
import PsychosocialRecord from "@/components/forms/PsychosocialRecord";
import SpiritualRecord from "@/components/forms/SpiritualRecord";
import TherapySessionForm from "@/components/forms/TherapySessionForm";
import WasteManagement from "@/components/forms/WasteManagement";
import PestControl from "@/components/forms/PestControl";
import HazardousWaste from "@/components/forms/HazardousWaste";
import SanitationRecord from "@/components/forms/SanitationRecord";
import EmergencyPlan from "@/components/forms/EmergencyPlan";
import ManagerialDashboard from "@/components/forms/ManagerialDashboard";
import PaymentVoucher from "@/components/forms/PaymentVoucher";
import {
  ClipboardList, Stethoscope, Utensils, Heart, Activity,
  ShieldCheck, AlertTriangle, LogOut, Briefcase, TrendingUp, Settings,
  BookOpen, Share2, DollarSign, FileText
} from "lucide-react";

const MODULE_INFO: Record<string, { title: string; subtitle: string; icon: any; forms: { id: string; label: string }[] }> = {
  '3': { title: '3. Alimentación', subtitle: 'Nutrición y cocina', icon: Utensils, forms: [
    { id: 'UNIFIED-KITCHEN', label: '🍳 Control Diario Cocina' },
    { id: 'HB-F5', label: 'HB-F5: Checklist Cocina' }, { id: 'HB-F6', label: 'HB-F6: Ingreso Alimentos' },
    { id: 'HB-F7', label: 'HB-F7: Temperatura Neveras' }, { id: 'HB-F8', label: 'HB-F8: Desinfección' },
  ]},
  '4': { title: '4. Bienestar', subtitle: 'Terapias y actividades', icon: Heart, forms: [
    { id: 'HB-F4', label: 'HB-F4: Bitácora Diaria' }, { id: 'HB-F9', label: 'HB-F9: Terapias' },
    { id: 'THERAPY-SESSION', label: '📅 Sesión Terapia' },
    { id: 'HB-F10', label: 'HB-F10: Atención Psicosocial' },
    { id: 'HB-F11', label: 'HB-F11: Acomp. Espiritual' },
  ]},
  '5': { title: '5. Salud Diaria', subtitle: 'Enfermería', icon: Activity, forms: [
    { id: 'HB-F4', label: 'HB-F4: Bitácora' }, { id: 'HB-F14', label: 'HB-F14: Medicamentos' },
    { id: 'HB-F15', label: 'HB-F15: Administración Med.' }, { id: 'HB-F16', label: 'HB-F16: Signos Vitales' },
    { id: 'NURSING-AI', label: '🤖 Notas Enfermería IA' },
  ]},
  '6': { title: '6. Sistema Salud', subtitle: 'Urgencias y citas', icon: Stethoscope, forms: [
    { id: 'HB-F17', label: 'HB-F17: Citas Médicas' },
  ]},
  '7': { title: '7. Higiene', subtitle: 'Prevención', icon: ShieldCheck, forms: [
    { id: 'HB-F8a1', label: 'HB-F8a1: Desinfección General' },
  ]},
  '8': { title: '8. Seguridad', subtitle: 'Incidentes y riesgos', icon: AlertTriangle, forms: [
    { id: 'HB-F20', label: 'HB-F20: Incidentes/Caídas' },
  ]},
  '9': { title: '9. Egreso', subtitle: 'Traslados', icon: LogOut, forms: [
    { id: 'HB-F3', label: 'HB-F3: Inventario Egreso' },
  ]},
  '10': { title: '10. Personal', subtitle: 'Talento humano', icon: Briefcase, forms: [
    { id: 'HB-F24', label: 'HB-F24: Capacitaciones' }, { id: 'HB-F25', label: 'HB-F25: Evaluación Desempeño' },
    { id: 'TRAINING', label: '📚 Plataforma Capacitación IA' },
  ]},
  '11': { title: '11. Calidad', subtitle: 'PQRSF e indicadores', icon: TrendingUp, forms: [
    { id: 'HB-F23', label: 'HB-F23: PQRSF' }, { id: 'HB-F26', label: 'HB-F26: Indicadores' },
    { id: 'PAI', label: '📋 Plan de Atención (PAI)' }, { id: 'AUDIT', label: '📊 Informe Auditoría' },
  ]},
  '12': { title: '12. Admin.', subtitle: 'Gerencia y finanzas', icon: Settings, forms: [
    { id: 'BILLING', label: '💰 Facturación' }, { id: 'VOUCHER', label: '🧾 Comprobantes Pago' },
    { id: 'DOCS', label: '📁 Documentos' }, { id: 'LOGO', label: '🏷️ Logo y Config.' },
  ]},
  'gerencial': { title: 'Gestión Administrativa', subtitle: 'Formularios gerenciales', icon: FileText, forms: [
    { id: 'HB-G01', label: 'HB-G01: Residuos (PEGIR)' },
    { id: 'HB-G02', label: 'HB-G02: Control Plagas' },
    { id: 'HB-G03', label: 'HB-G03: RESPEL' },
    { id: 'HB-G04', label: 'HB-G04: Saneamiento' },
    { id: 'HB-G05', label: 'HB-G05: Plan Emergencias' },
    { id: 'HB-G06', label: 'HB-G06: Tablero Gerencial' },
  ]},
};

// Map form IDs to the permission module they belong to
const FORM_MODULE_MAP: Record<string, string> = {
  'HB-F1': 'ingreso', 'HB-F3': 'ingreso', 'HB-F22': 'ingreso',
  'MAPA': 'ingreso', 'HYGIENE-KIT': 'higiene',
  'HB-F4': 'salud', 'HB-F5': 'alimentacion', 'HB-F6': 'alimentacion',
  'HB-F7': 'alimentacion', 'HB-F8': 'alimentacion', 'HB-F8a1': 'higiene',
  'HB-F9': 'bienestar', 'HB-F10': 'bienestar', 'HB-F11': 'bienestar',
  'HB-F14': 'salud', 'HB-F15': 'salud', 'HB-F16': 'salud',
  'HB-F17': 'sistema_salud', 'HB-F20': 'seguridad',
  'HB-F23': 'calidad', 'HB-F24': 'personal', 'HB-F25': 'personal',
  'HB-F26': 'calidad', 'HB-G01': 'gerencial', 'HB-G02': 'gerencial',
  'HB-G03': 'gerencial', 'HB-G04': 'gerencial', 'HB-G05': 'gerencial',
  'HB-G06': 'gerencial', 'UNIFIED-KITCHEN': 'alimentacion',
  'THERAPY-SESSION': 'bienestar', 'NURSING-AI': 'salud',
  'BILLING': 'admin', 'VOUCHER': 'admin', 'DOCS': 'admin', 'LOGO': 'admin',
  'TRAINING': 'personal', 'PAI': 'calidad', 'AUDIT': 'calidad',
};

const FORM_COMPONENTS: Record<string, React.FC<{ onBack: () => void }>> = {
  'HB-F1': AdmissionChecklist, 'HB-F3': BelongingsInventory, 'HB-F22': LifeHistory,
  'HB-F4': DailyLog, 'HB-F5': KitchenChecklist, 'HB-F6': FoodIntake,
  'HB-F7': FridgeTemps, 'HB-F8': DisinfectionRecord, 'HB-F8a1': DisinfectionRecord,
  'HB-F9': TherapyRecords, 'HB-F10': PsychosocialRecord, 'HB-F11': SpiritualRecord,
  'HB-F14': MedicationList, 'HB-F15': MedicationAdmin, 'HB-F16': VitalSigns,
  'HB-F17': MedicalAppointments, 'HB-F20': IncidentReport,
  'HB-F23': PQRSFRecord, 'HB-F24': TrainingRecord, 'HB-F25': PerformanceEval,
  'HYGIENE-KIT': HygieneKit, 'MAPA': RoomAssignment, 'DOCS': DocumentManager,
  'LOGO': LogoSettings, 'TRAINING': TrainingModule, 'NURSING-AI': NursingNotes,
  'HB-F26': IndicatorsDashboard, 'BILLING': BillingModule, 'PAI': CarePlanGenerator,
  'UNIFIED-KITCHEN': UnifiedKitchen, 'THERAPY-SESSION': TherapySessionForm,
  'VOUCHER': PaymentVoucher, 'AUDIT': AuditReport,
  'HB-G01': WasteManagement, 'HB-G02': PestControl, 'HB-G03': HazardousWaste,
  'HB-G04': SanitationRecord, 'HB-G05': EmergencyPlan, 'HB-G06': ManagerialDashboard,
};

const Index = () => {
  const { user, loading } = useAuth();
  const { canAccessModule } = usePermissions();
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
    if (form) {
      const FormComponent = FORM_COMPONENTS[form];
      const permModule = FORM_MODULE_MAP[form];

      if (FormComponent) {
        if (permModule && !canAccessModule(permModule === 'ingreso' ? '1' : permModule === 'valoracion' ? '2' : permModule)) {
          return (
            <ProtectedModule module={permModule as any}>
              <FormComponent onBack={() => setForm(null)} />
            </ProtectedModule>
          );
        }
        return <FormComponent onBack={() => setForm(null)} />;
      }
      return (
        <div className="animate-fade-in">
          <FormHeader title={form} subtitle="Formulario en desarrollo" onBack={() => setForm(null)} />
          <p className="text-muted-foreground">Este formulario estará disponible próximamente.</p>
        </div>
      );
    }

    if (view === 'dashboard') return <DashboardView onModuleChange={setView} />;
    if (view === '1') return <IngresoSubMenu onSelectForm={setForm} onBack={() => setView('dashboard')} />;
    if (view === '2') return <ValoracionGeriatrica onBack={() => setView('dashboard')} />;
    if (view === 'usuarios') return <UserManagement onBack={() => setView('dashboard')} />;
    if (view === 'residentes') return <ResidentManagement onBack={() => setView('dashboard')} />;
    if (view === 'finanzas') return <FinanceModule onBack={() => setView('dashboard')} />;
    if (view === 'blog') return <BlogModule onBack={() => setView('dashboard')} />;
    if (view === 'redes') return <SocialMediaModule onBack={() => setView('dashboard')} />;

    const info = MODULE_INFO[view];
    if (info && info.forms.length > 0) {
      return (
        <div className="animate-fade-in">
          <FormHeader title={info.title} subtitle={info.subtitle} onBack={() => setView('dashboard')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {info.forms.map(f => {
              const Icon = info.icon;
              return (
                <button key={f.id} onClick={() => setForm(f.id)}
                  className="bg-card border-2 border-border rounded-2xl p-5 text-left hover:border-primary transition-all group min-h-[48px]">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{f.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (info) {
      return <ModulePlaceholder title={info.title} subtitle={info.subtitle} icon={info.icon} forms={[]} onBack={() => setView('dashboard')} />;
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
