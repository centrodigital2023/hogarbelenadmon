import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, MODULE_PERMISSION_MAP, type Module } from "@/hooks/usePermissions";
import CrossNavigation from "@/components/CrossNavigation";
import Login from "@/pages/Login";
import AppLayout from "@/components/AppLayout";
import IngresoSubMenu from "@/components/IngresoSubMenu";
import FormHeader from "@/components/FormHeader";
import DashboardView from "@/components/DashboardView";
import ModulePlaceholder from "@/components/ModulePlaceholder";
import ProtectedModule from "@/components/ProtectedModule";
import {
  ClipboardList, Stethoscope, Utensils, Heart, Activity,
  ShieldCheck, AlertTriangle, LogOut, Briefcase, TrendingUp, Settings,
  BookOpen, Share2, DollarSign, FileText
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Screens load on demand so the app opens fast on phones
const ValoracionGeriatrica = lazy(() => import("@/components/ValoracionGeriatrica"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const ResidentManagement = lazy(() => import("@/pages/ResidentManagement"));
const AdmissionChecklist = lazy(() => import("@/components/forms/AdmissionChecklist"));
const BelongingsInventory = lazy(() => import("@/components/forms/BelongingsInventory"));
const LifeHistory = lazy(() => import("@/components/forms/LifeHistory"));
const DailyLog = lazy(() => import("@/components/forms/DailyLog"));
const KitchenChecklist = lazy(() => import("@/components/forms/KitchenChecklist"));
const FridgeTemps = lazy(() => import("@/components/forms/FridgeTemps"));
const FoodIntake = lazy(() => import("@/components/forms/FoodIntake"));
const DisinfectionRecord = lazy(() => import("@/components/forms/DisinfectionRecord"));
const VitalSigns = lazy(() => import("@/components/forms/VitalSigns"));
const MedicationList = lazy(() => import("@/components/forms/MedicationList"));
const MedicationAdmin = lazy(() => import("@/components/forms/MedicationAdmin"));
const TherapyRecords = lazy(() => import("@/components/forms/TherapyRecords"));
const IncidentReport = lazy(() => import("@/components/forms/IncidentReport"));
const MedicalAppointments = lazy(() => import("@/components/forms/MedicalAppointments"));
const TrainingRecord = lazy(() => import("@/components/forms/TrainingRecord"));
const PerformanceEval = lazy(() => import("@/components/forms/PerformanceEval"));
const PQRSFRecord = lazy(() => import("@/components/forms/PQRSFRecord"));
const HygieneKit = lazy(() => import("@/components/forms/HygieneKit"));
const RoomAssignment = lazy(() => import("@/components/RoomAssignment"));
const DocumentManager = lazy(() => import("@/components/DocumentManager"));
const LogoSettings = lazy(() => import("@/components/LogoSettings"));
const TrainingModule = lazy(() => import("@/components/TrainingModule"));
const NursingNotes = lazy(() => import("@/components/NursingNotes"));
const NursingReport = lazy(() => import("@/components/NursingReport"));
const IndicatorsDashboard = lazy(() => import("@/components/IndicatorsDashboard"));
const BillingModule = lazy(() => import("@/components/BillingModule"));
const CarePlanGenerator = lazy(() => import("@/components/CarePlanGenerator"));
const FinanceModule = lazy(() => import("@/components/FinanceModule"));
const BlogModule = lazy(() => import("@/components/BlogModule"));
const SocialMediaModule = lazy(() => import("@/components/SocialMediaModule"));
const AuditReport = lazy(() => import("@/components/AuditReport"));
const ResidentTimeline = lazy(() => import("@/components/ResidentTimeline"));
const InstitutionModule = lazy(() => import("@/components/InstitutionModule"));
const UnifiedKitchen = lazy(() => import("@/components/forms/UnifiedKitchen"));
const PsychosocialRecord = lazy(() => import("@/components/forms/PsychosocialRecord"));
const SpiritualRecord = lazy(() => import("@/components/forms/SpiritualRecord"));
const TherapySessionForm = lazy(() => import("@/components/forms/TherapySessionForm"));
const WasteManagement = lazy(() => import("@/components/forms/WasteManagement"));
const PestControl = lazy(() => import("@/components/forms/PestControl"));
const HazardousWaste = lazy(() => import("@/components/forms/HazardousWaste"));
const SanitationRecord = lazy(() => import("@/components/forms/SanitationRecord"));
const EmergencyPlan = lazy(() => import("@/components/forms/EmergencyPlan"));
const ManagerialDashboard = lazy(() => import("@/components/forms/ManagerialDashboard"));
const PaymentVoucher = lazy(() => import("@/components/forms/PaymentVoucher"));

const MODULE_INFO: Record<string, { title: string; subtitle: string; icon: LucideIcon; forms: { id: string; label: string }[] }> = {
  '3': { title: '3. Alimentación', subtitle: 'Nutrición y cocina', icon: Utensils, forms: [
    { id: 'UNIFIED-KITCHEN', label: '🍳 Control Diario Cocina' },
    { id: 'HB-F6', label: 'HB-F6: Ingreso Alimentos' },
  ]},
  '4': { title: '4. Bienestar', subtitle: 'Terapias y actividades', icon: Heart, forms: [
    { id: 'HB-F4', label: 'HB-F4: Bitácora Diaria' }, { id: 'HB-F9', label: 'HB-F9: Terapias' },
    { id: 'THERAPY-SESSION', label: '📅 Sesión Terapia' },
    { id: 'HB-F10', label: 'HB-F10: Atención Psicosocial' },
    { id: 'HB-F11', label: 'HB-F11: Acomp. Espiritual' },
  ]},
  '5': { title: '5. Salud Diaria', subtitle: 'Enfermería', icon: Activity, forms: [
    { id: 'HB-F14', label: 'HB-F14: Medicamentos' },
    { id: 'HB-F15', label: 'HB-F15: Administración Med.' }, { id: 'HB-F16', label: 'HB-F16: Signos Vitales' },
    { id: 'NURSING-AI', label: '🤖 Notas Enfermería IA' },
    { id: 'NURSING-REPORT', label: '📊 Informe Enfermería IA' },
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
  'HB-F4': 'salud', 'HB-F6': 'alimentacion',
  'HB-F8a1': 'higiene',
  'HB-F9': 'bienestar', 'HB-F10': 'bienestar', 'HB-F11': 'bienestar',
  'HB-F14': 'salud', 'HB-F15': 'salud', 'HB-F16': 'salud',
  'HB-F17': 'sistema_salud', 'HB-F20': 'seguridad',
  'HB-F23': 'calidad', 'HB-F24': 'personal', 'HB-F25': 'personal',
  'HB-F26': 'calidad', 'HB-G01': 'gerencial', 'HB-G02': 'gerencial',
  'HB-G03': 'gerencial', 'HB-G04': 'gerencial', 'HB-G05': 'gerencial',
  'HB-G06': 'gerencial', 'UNIFIED-KITCHEN': 'alimentacion',
  'THERAPY-SESSION': 'bienestar', 'NURSING-AI': 'salud', 'NURSING-REPORT': 'salud',
  'BILLING': 'admin', 'VOUCHER': 'admin', 'DOCS': 'admin', 'LOGO': 'admin',
  'TRAINING': 'personal', 'PAI': 'calidad', 'AUDIT': 'calidad',
};

const FORM_COMPONENTS: Record<string, React.FC<{ onBack: () => void }>> = {
  'HB-F1': AdmissionChecklist, 'HB-F3': BelongingsInventory, 'HB-F22': LifeHistory,
  'HB-F4': DailyLog, 'HB-F6': FoodIntake,
  'HB-F8a1': DisinfectionRecord,
  'HB-F9': TherapyRecords, 'HB-F10': PsychosocialRecord, 'HB-F11': SpiritualRecord,
  'HB-F14': MedicationList, 'HB-F15': MedicationAdmin, 'HB-F16': VitalSigns,
  'HB-F17': MedicalAppointments, 'HB-F20': IncidentReport,
  'HB-F23': PQRSFRecord, 'HB-F24': TrainingRecord, 'HB-F25': PerformanceEval,
  'HYGIENE-KIT': HygieneKit, 'MAPA': RoomAssignment, 'DOCS': DocumentManager,
  'LOGO': LogoSettings, 'TRAINING': TrainingModule, 'NURSING-AI': NursingNotes, 'NURSING-REPORT': NursingReport,
  'HB-F26': IndicatorsDashboard, 'BILLING': BillingModule, 'PAI': CarePlanGenerator,
  'UNIFIED-KITCHEN': UnifiedKitchen, 'THERAPY-SESSION': TherapySessionForm,
  'VOUCHER': PaymentVoucher, 'AUDIT': AuditReport,
  'HB-G01': WasteManagement, 'HB-G02': PestControl, 'HB-G03': HazardousWaste,
  'HB-G04': SanitationRecord, 'HB-G05': EmergencyPlan, 'HB-G06': ManagerialDashboard,
};

const ScreenLoader = () => (
  <div className="flex justify-center py-16" role="status" aria-label="Cargando">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Index = () => {
  const { user, loading } = useAuth();
  const { canAccessModule } = usePermissions();
  // Navigation lives in the URL (?modulo=…&form=…) so the phone's back button and
  // the installed app's shortcuts work like in any native app
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('modulo') || 'dashboard';
  const form = searchParams.get('form');

  const navigate = (nextView: string, nextForm: string | null) => {
    const params = new URLSearchParams();
    if (nextView !== 'dashboard') params.set('modulo', nextView);
    if (nextForm) params.set('form', nextForm);
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };
  const setView = (nextView: string) => navigate(nextView, null);
  const setForm = (nextForm: string | null) => navigate(view, nextForm);

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
        const formContent = (
          <>
            <FormComponent onBack={() => setForm(null)} />
            <CrossNavigation currentFormId={form} onNavigate={(id) => setForm(id)} />
          </>
        );
        if (permModule && !canAccessModule(permModule === 'ingreso' ? '1' : permModule === 'valoracion' ? '2' : permModule)) {
          return (
            <ProtectedModule module={permModule as Module}>
              {formContent}
            </ProtectedModule>
          );
        }
        return formContent;
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
    if (view === 'instituciones') return <InstitutionModule onBack={() => setView('dashboard')} />;
    if (view === 'blog') return <BlogModule onBack={() => setView('dashboard')} />;
    if (view === 'redes') return <SocialMediaModule onBack={() => setView('dashboard')} />;
    if (view === 'timeline') return <ResidentTimeline onBack={() => setView('dashboard')} onNavigateForm={(id) => setForm(id)} />;

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
    <AppLayout activeModule={view} onModuleChange={setView}>
      <Suspense fallback={<ScreenLoader />}>{renderContent()}</Suspense>
    </AppLayout>
  );
};

export default Index;
