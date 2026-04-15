import { ArrowRight, Link2 } from "lucide-react";

/**
 * Maps each form to related forms the user can navigate to.
 * Groups: ingreso, bienestar, salud, alimentacion, calidad
 */
const RELATED_FORMS: Record<string, { id: string; label: string; module: string }[]> = {
  'HB-F1': [
    { id: 'HB-F3', label: 'Inventario Pertenencias', module: 'Ingreso' },
    { id: 'HB-F22', label: 'Historia de Vida', module: 'Ingreso' },
    { id: 'HYGIENE-KIT', label: 'Kit de Higiene', module: 'Higiene' },
  ],
  'HB-F3': [
    { id: 'HB-F1', label: 'Checklist Admisión', module: 'Ingreso' },
    { id: 'HB-F22', label: 'Historia de Vida', module: 'Ingreso' },
  ],
  'HB-F22': [
    { id: 'HB-F1', label: 'Checklist Admisión', module: 'Ingreso' },
    { id: 'HB-F10', label: 'Atención Psicosocial', module: 'Bienestar' },
    { id: 'HB-F11', label: 'Acomp. Espiritual', module: 'Bienestar' },
  ],
  'HB-F4': [
    { id: 'HB-F16', label: 'Signos Vitales', module: 'Salud' },
    { id: 'HB-F15', label: 'Administración Med.', module: 'Salud' },
    { id: 'NURSING-AI', label: 'Notas Enfermería IA', module: 'Salud' },
    { id: 'HB-F9', label: 'Terapias', module: 'Bienestar' },
    { id: 'HB-F20', label: 'Incidentes/Caídas', module: 'Seguridad' },
  ],
  'HB-F16': [
    { id: 'HB-F4', label: 'Bitácora Diaria', module: 'Bienestar' },
    { id: 'HB-F15', label: 'Administración Med.', module: 'Salud' },
    { id: 'NURSING-REPORT', label: 'Informe Enfermería', module: 'Salud' },
  ],
  'HB-F14': [
    { id: 'HB-F15', label: 'Administración Med.', module: 'Salud' },
    { id: 'HB-F17', label: 'Citas Médicas', module: 'Sistema Salud' },
  ],
  'HB-F15': [
    { id: 'HB-F14', label: 'Lista Medicamentos', module: 'Salud' },
    { id: 'HB-F16', label: 'Signos Vitales', module: 'Salud' },
    { id: 'HB-F4', label: 'Bitácora Diaria', module: 'Bienestar' },
  ],
  'HB-F9': [
    { id: 'THERAPY-SESSION', label: 'Sesión Terapia', module: 'Bienestar' },
    { id: 'HB-F4', label: 'Bitácora Diaria', module: 'Bienestar' },
    { id: 'HB-F10', label: 'Atención Psicosocial', module: 'Bienestar' },
  ],
  'THERAPY-SESSION': [
    { id: 'HB-F9', label: 'Registro Terapias', module: 'Bienestar' },
    { id: 'PAI', label: 'Plan de Atención', module: 'Calidad' },
  ],
  'HB-F10': [
    { id: 'HB-F22', label: 'Historia de Vida', module: 'Ingreso' },
    { id: 'HB-F11', label: 'Acomp. Espiritual', module: 'Bienestar' },
    { id: 'HB-F9', label: 'Terapias', module: 'Bienestar' },
  ],
  'HB-F11': [
    { id: 'HB-F22', label: 'Historia de Vida', module: 'Ingreso' },
    { id: 'HB-F10', label: 'Atención Psicosocial', module: 'Bienestar' },
  ],
  'HB-F17': [
    { id: 'HB-F14', label: 'Lista Medicamentos', module: 'Salud' },
    { id: 'HB-F20', label: 'Incidentes/Caídas', module: 'Seguridad' },
  ],
  'HB-F20': [
    { id: 'HB-F4', label: 'Bitácora Diaria', module: 'Bienestar' },
    { id: 'HB-F17', label: 'Citas Médicas', module: 'Sistema Salud' },
    { id: 'HB-F16', label: 'Signos Vitales', module: 'Salud' },
  ],
  'NURSING-AI': [
    { id: 'HB-F4', label: 'Bitácora Diaria', module: 'Bienestar' },
    { id: 'NURSING-REPORT', label: 'Informe Enfermería', module: 'Salud' },
    { id: 'HB-F16', label: 'Signos Vitales', module: 'Salud' },
  ],
  'NURSING-REPORT': [
    { id: 'NURSING-AI', label: 'Notas Enfermería IA', module: 'Salud' },
    { id: 'HB-F4', label: 'Bitácora Diaria', module: 'Bienestar' },
    { id: 'PAI', label: 'Plan de Atención', module: 'Calidad' },
  ],
  'PAI': [
    { id: 'NURSING-REPORT', label: 'Informe Enfermería', module: 'Salud' },
    { id: 'HB-F9', label: 'Terapias', module: 'Bienestar' },
    { id: 'HB-F26', label: 'Indicadores', module: 'Calidad' },
  ],
  'HB-F5': [
    { id: 'HB-F6', label: 'Ingreso Alimentos', module: 'Alimentación' },
    { id: 'HB-F7', label: 'Temperatura Neveras', module: 'Alimentación' },
    { id: 'UNIFIED-KITCHEN', label: 'Control Diario Cocina', module: 'Alimentación' },
  ],
  'HB-F6': [
    { id: 'HB-F5', label: 'Checklist Cocina', module: 'Alimentación' },
    { id: 'HB-F7', label: 'Temperatura Neveras', module: 'Alimentación' },
  ],
  'HB-F7': [
    { id: 'HB-F5', label: 'Checklist Cocina', module: 'Alimentación' },
    { id: 'HB-F8', label: 'Desinfección', module: 'Alimentación' },
  ],
  'HB-F8': [
    { id: 'HB-F5', label: 'Checklist Cocina', module: 'Alimentación' },
    { id: 'HB-F8a1', label: 'Desinfección General', module: 'Higiene' },
  ],
  'UNIFIED-KITCHEN': [
    { id: 'HB-F5', label: 'Checklist Cocina', module: 'Alimentación' },
    { id: 'HB-F6', label: 'Ingreso Alimentos', module: 'Alimentación' },
    { id: 'HB-F7', label: 'Temperatura Neveras', module: 'Alimentación' },
  ],
  'HB-F24': [
    { id: 'HB-F25', label: 'Evaluación Desempeño', module: 'Personal' },
    { id: 'TRAINING', label: 'Plataforma Capacitación', module: 'Personal' },
  ],
  'HB-F25': [
    { id: 'HB-F24', label: 'Capacitaciones', module: 'Personal' },
  ],
  'BILLING': [
    { id: 'VOUCHER', label: 'Comprobantes Pago', module: 'Admin' },
  ],
  'VOUCHER': [
    { id: 'BILLING', label: 'Facturación', module: 'Admin' },
  ],
  'HB-G01': [
    { id: 'HB-G03', label: 'RESPEL', module: 'Gerencial' },
    { id: 'HB-G04', label: 'Saneamiento', module: 'Gerencial' },
  ],
  'HB-G02': [
    { id: 'HB-G04', label: 'Saneamiento', module: 'Gerencial' },
  ],
  'HB-G03': [
    { id: 'HB-G01', label: 'Residuos (PEGIR)', module: 'Gerencial' },
  ],
  'HB-G05': [
    { id: 'HB-G06', label: 'Tablero Gerencial', module: 'Gerencial' },
  ],
};

interface CrossNavigationProps {
  currentFormId: string;
  onNavigate: (formId: string) => void;
}

const CrossNavigation = ({ currentFormId, onNavigate }: CrossNavigationProps) => {
  const related = RELATED_FORMS[currentFormId];
  if (!related || related.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mt-4">
      <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1 mb-3">
        <Link2 size={12} /> Formularios Relacionados
      </h4>
      <div className="flex flex-wrap gap-2">
        {related.map(r => (
          <button key={r.id} onClick={() => onNavigate(r.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors min-h-[36px]">
            <span className="text-[10px] text-muted-foreground">{r.module}:</span>
            {r.label}
            <ArrowRight size={10} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default CrossNavigation;
export { RELATED_FORMS };
