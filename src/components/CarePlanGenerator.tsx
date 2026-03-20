import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { ClipboardList, AlertTriangle, CheckCircle2, Target } from "lucide-react";

interface Props { onBack: () => void; }

interface Assessment { test_key: string; test_name: string; score: number; max_score: number; interpretation: string | null; }

const PAI_RULES = [
  { test: 'barthel', condition: (s: number) => s < 60, title: 'Apoyo en ABVD', interventions: [
    'Asistencia en baño, vestido, alimentación según nivel de dependencia',
    'Plan de rehabilitación funcional con fisioterapia 3x/semana',
    'Evaluación de ayudas técnicas (andador, silla de ruedas)',
    'Registro diario de actividades realizadas de forma autónoma',
  ]},
  { test: 'tug', condition: (s: number) => s >= 20, title: 'Fisioterapia para equilibrio y marcha', interventions: [
    'Fisioterapia enfocada en equilibrio y fortalecimiento de MMII',
    'Revisión farmacológica (sedantes, hipotensores)',
    'Protocolo de prevención de caídas: iluminación, tapetes, barandas',
    'Ejercicios de Tai Chi o yoga adaptado 2x/semana',
  ]},
  { test: 'mna', condition: (s: number) => s < 12, title: 'Intervención nutricional', interventions: [
    'Derivación a nutricionista para plan alimentario individualizado',
    'Suplementos nutricionales orales según prescripción',
    'Monitorización mensual de peso e IMC',
    'Control de ingesta calórica y proteica diaria',
  ]},
  { test: 'yesavage', condition: (s: number) => s > 5, title: 'Intervención psicoafectiva', interventions: [
    'Derivación a psicología para valoración y seguimiento',
    'Programa de activación conductual y participación social',
    'Terapia ocupacional con actividades significativas',
    'Monitorización semanal del estado de ánimo',
  ]},
  { test: 'zarit', condition: (s: number) => s > 23, title: 'Apoyo al cuidador', interventions: [
    'Contacto con familia para ofrecer apoyo y orientación',
    'Grupos de apoyo para cuidadores (mensual)',
    'Servicio de respiro programado',
    'Derivación a trabajo social si es necesario',
  ]},
  { test: 'gijon', condition: (s: number) => s > 15, title: 'Intervención social', interventions: [
    'Derivación a trabajo social para evaluación de recursos',
    'Contacto con redes de apoyo comunitario',
    'Evaluación de necesidades de vivienda y transporte',
    'Gestión de subsidios o ayudas sociales si aplica',
  ]},
];

const CarePlanGenerator = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<any[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingPlans, setExistingPlans] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente'])
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    // Get latest assessment for each test
    supabase.from('geriatric_assessments').select('test_key, test_name, score, max_score, interpretation')
      .eq('resident_id', selectedResident).order('assessment_date', { ascending: false })
      .then(({ data }) => {
        if (data) {
          const latest: Record<string, Assessment> = {};
          data.forEach(a => { if (!latest[a.test_key]) latest[a.test_key] = a; });
          setAssessments(Object.values(latest));
        }
      });
    // Load existing plans
    supabase.from('care_plans').select('*').eq('resident_id', selectedResident)
      .order('version', { ascending: false }).then(({ data }) => { if (data) setExistingPlans(data); });
  }, [selectedResident]);

  const generatePlan = () => {
    const plan: any[] = [];
    PAI_RULES.forEach(rule => {
      const assessment = assessments.find(a => a.test_key === rule.test);
      if (assessment && rule.condition(assessment.score)) {
        plan.push({
          title: rule.title,
          test: assessment.test_name,
          score: assessment.score,
          interpretation: assessment.interpretation,
          interventions: rule.interventions,
        });
      }
    });
    setGeneratedPlan(plan);
  };

  const savePlan = async () => {
    if (!user || !selectedResident) return;
    setSaving(true);
    const version = existingPlans.length > 0 ? (existingPlans[0].version || 0) + 1 : 1;
    const { error } = await supabase.from('care_plans').insert({
      resident_id: selectedResident,
      version,
      objectives: generatedPlan.map(p => p.title) as any,
      interventions: generatedPlan as any,
      generated_from: Object.fromEntries(assessments.map(a => [a.test_key, a.score])),
      notes,
      created_by: user.id,
      status: 'borrador',
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "PAI guardado", description: `Versión ${version}` });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="Plan de Atención Individualizado (PAI)" subtitle="Generación automática basada en valoraciones" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
        <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
          className="mt-2 w-full max-w-md px-4 py-3 rounded-xl border border-input bg-background text-sm">
          <option value="">-- Seleccionar --</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
      </div>

      {selectedResident && (
        <>
          {/* Current assessments */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-black mb-4">Valoraciones disponibles</h3>
            {assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay valoraciones registradas. Aplique tests desde el módulo de Valoración Geriátrica.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {assessments.map(a => {
                  const triggered = PAI_RULES.some(r => r.test === a.test_key && r.condition(a.score));
                  return (
                    <div key={a.test_key} className={`p-3 rounded-xl border-2 ${triggered ? 'border-cat-fragility/30 bg-cat-fragility/5' : 'border-border'}`}>
                      <p className="text-xs font-bold">{a.test_name}</p>
                      <p className="text-lg font-black">{a.score}/{a.max_score}</p>
                      <p className="text-[10px] text-muted-foreground">{a.interpretation}</p>
                      {triggered && <span className="text-[10px] font-bold text-cat-fragility flex items-center gap-1 mt-1"><AlertTriangle size={10} /> Requiere intervención</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {assessments.length > 0 && (
              <button onClick={generatePlan}
                className="mt-4 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold min-h-[48px] flex items-center gap-2">
                <Target size={14} /> Generar PAI automático
              </button>
            )}
          </div>

          {/* Generated plan */}
          {generatedPlan.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                <ClipboardList size={16} className="text-primary" /> Plan de Atención Individualizado
              </h3>
              <div className="space-y-4">
                {generatedPlan.map((item, idx) => (
                  <div key={idx} className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">{idx + 1}</span>
                      <h4 className="text-sm font-bold">{item.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Basado en: {item.test} ({item.score} pts) - {item.interpretation}</p>
                    <ul className="space-y-1">
                      {item.interventions.map((int: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 size={14} className="text-cat-nutritional shrink-0 mt-0.5" />
                          {int}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="text-xs font-bold text-muted-foreground uppercase">Notas adicionales del coordinador</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
                  placeholder="Ajustes manuales al plan..." />
              </div>

              <button onClick={savePlan} disabled={saving}
                className="mt-4 bg-primary text-primary-foreground px-8 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
                {saving ? 'Guardando...' : 'Guardar PAI'}
              </button>
            </div>
          )}

          {generatedPlan.length === 0 && assessments.length > 0 && (
            <div className="bg-cat-nutritional/10 text-cat-nutritional p-4 rounded-2xl mb-6 flex items-center gap-3">
              <CheckCircle2 size={20} />
              <p className="text-sm font-bold">Todos los indicadores dentro de rangos normales. No se requieren intervenciones específicas.</p>
            </div>
          )}

          {/* Existing plans */}
          {existingPlans.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-black mb-4">PAI anteriores</h3>
              {existingPlans.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl mb-2">
                  <div>
                    <p className="text-sm font-bold">Versión {p.version}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString('es-CO')} • {p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CarePlanGenerator;
