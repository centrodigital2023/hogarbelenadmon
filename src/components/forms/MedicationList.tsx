import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; eps: string | null; allergies: string | null; }

// Medication safety rules for elderly patients (Beers Criteria + common concerns)
const HIGH_RISK_KEYWORDS: { pattern: RegExp; risk: string; recommendation: string }[] = [
  { pattern: /benzodiazep|alprazolam|lorazepam|diazepam|clonazepam/i, risk: 'Benzodiazepina — riesgo de sedación excesiva, caídas y dependencia en adulto mayor', recommendation: 'Evaluar descontinuación gradual con médico. Usar mínima dosis efectiva. Vigilar sedación y riesgo de caídas.' },
  { pattern: /warfarina|acenocumarol|sintrom/i, risk: 'Anticoagulante oral — alto riesgo de sangrado', recommendation: 'Monitorizar INR periódicamente. Verificar interacciones (AINES, antibióticos). Educar sobre signos de sangrado.' },
  { pattern: /metformina/i, risk: 'Biguanida — contraindicada en insuficiencia renal o hepática grave', recommendation: 'Verificar función renal (creatinina) al menos cada 6 meses. Suspender ante procedimientos con contraste.' },
  { pattern: /digoxina/i, risk: 'Glucósido cardíaco — margen terapéutico estrecho; toxicidad frecuente en adulto mayor', recommendation: 'Niveles séricos en rango 0.5-0.9 ng/mL. Vigilar bradicardia, náuseas, confusión. Control electrolitos.' },
  { pattern: /amiodarona/i, risk: 'Antiarrítmico — múltiples efectos adversos (pulmonar, tiroideo, hepático)', recommendation: 'Control tiroideo y pulmonar semestral. Protección solar. Vigilar interacciones con otros fármacos.' },
  { pattern: /haloperidol|risperidona|quetiapina|olanzapina/i, risk: 'Antipsicótico — riesgo cardiovascular y sedación; en demencia aumenta mortalidad', recommendation: 'Usar solo con indicación clara. Mínima dosis posible. Reevaluar necesidad cada 3 meses.' },
  { pattern: /tramadol|morfina|oxicodona|fentanil/i, risk: 'Opioide — riesgo de confusión, estreñimiento, caídas y depresión respiratoria', recommendation: 'Iniciar con dosis bajas. Prevenir estreñimiento con laxantes. Vigilar nivel de conciencia.' },
  { pattern: /ibuprofeno|naproxeno|diclofenaco|ketoprofeno/i, risk: 'AINE — riesgo gastrointestinal y renal; contraindicado con anticoagulantes', recommendation: 'Evitar uso crónico. Si necesario, usar con gastroprotector. Monitorizar función renal.' },
];

const analyzeMedications = (meds: { medication_name: string }[]): { alerts: { med: string; risk: string; recommendation: string }[]; safe: string[] } => {
  const alerts: { med: string; risk: string; recommendation: string }[] = [];
  const safe: string[] = [];
  meds.forEach(m => {
    const rule = HIGH_RISK_KEYWORDS.find(r => r.pattern.test(m.medication_name));
    if (rule) alerts.push({ med: m.medication_name, risk: rule.risk, recommendation: rule.recommendation });
    else safe.push(m.medication_name);
  });
  return { alerts, safe };
};

const MedicationList = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [medications, setMedications] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    medication_name: '', concentration: '', dose: '', route: 'Oral', schedule: '',
    prescription_date: '', expiry_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [aiReview, setAiReview] = useState<{ alerts: { med: string; risk: string; recommendation: string }[]; safe: string[] } | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name, eps, allergies').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    supabase.from('medications').select('*').eq('resident_id', selectedResident).order('medication_name')
      .then(({ data }) => { if (data) setMedications(data); });
  }, [selectedResident]);

  const handleAdd = async () => {
    if (!user || !selectedResident) return;
    setSaving(true);
    const { error } = await supabase.from('medications').insert({
      ...form, resident_id: selectedResident, created_by: user.id,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Medicamento agregado" });
      setShowAdd(false);
      setForm({ medication_name: '', concentration: '', dose: '', route: 'Oral', schedule: '', prescription_date: '', expiry_date: '', notes: '' });
      const { data } = await supabase.from('medications').select('*').eq('resident_id', selectedResident).order('medication_name');
      if (data) setMedications(data);
    }
    setSaving(false);
  };

  const runAIReview = () => {
    if (medications.length === 0) return;
    setGeneratingAI(true);
    setAiReview(analyzeMedications(medications.filter(m => m.is_active !== false)));
    setGeneratingAI(false);
  };

  const resident = residents.find(r => r.id === selectedResident);

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F14: Medicamentos" subtitle="Gestión de medicación por residente" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
        <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
          className="mt-1 w-full max-w-md px-4 py-3 rounded-xl border border-input bg-background text-sm">
          <option value="">-- Seleccionar --</option>
          {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
        </select>
        {resident && (
          <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
            <span><strong>EPS:</strong> {resident.eps || 'N/A'}</span>
            <span><strong>Alergias:</strong> {resident.allergies || 'Ninguna'}</span>
          </div>
        )}
      </div>

      {selectedResident && (
        <>
          <button onClick={() => setShowAdd(!showAdd)}
            className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase mb-4 min-h-[48px]">
            + Agregar Medicamento
          </button>

          {showAdd && (
            <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'medication_name', label: 'Nombre del medicamento', required: true },
                { key: 'concentration', label: 'Concentración' },
                { key: 'dose', label: 'Dosis' },
                { key: 'schedule', label: 'Horarios' },
                { key: 'prescription_date', label: 'Fecha fórmula', type: 'date' },
                { key: 'expiry_date', label: 'Fecha vencimiento', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.label}</label>
                  <input type={f.type || 'text'} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Vía</label>
                <select value={form.route} onChange={e => setForm(p => ({ ...p, route: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  {['Oral', 'Gotas', 'Tópica', 'Subcutánea', 'Intramuscular', 'Inhalada'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button onClick={handleAdd} disabled={saving || !form.medication_name}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase min-h-[48px] disabled:opacity-50">
                  Guardar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {medications.map(m => (
              <div key={m.id} className={`bg-card border-2 rounded-2xl p-5 ${m.is_active ? 'border-border' : 'border-muted opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-foreground">{m.medication_name}</p>
                    <p className="text-xs text-muted-foreground">{m.concentration} — {m.dose} — {m.route}</p>
                    <p className="text-xs text-muted-foreground">Horario: {m.schedule}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${m.is_active ? 'bg-cat-nutritional/10 text-cat-nutritional' : 'bg-muted text-muted-foreground'}`}>
                    {m.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            ))}
            {medications.length === 0 && <p className="text-sm text-muted-foreground">Sin medicamentos registrados.</p>}
          </div>

          {/* AI Safety Review */}
          {medications.length > 0 && (
            <div className="mt-6 bg-card border-2 border-primary/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" /> Revisión de Seguridad con IA
                </h3>
                <button
                  onClick={runAIReview}
                  disabled={generatingAI}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[36px]"
                >
                  {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {generatingAI ? 'Analizando...' : 'Revisar medicamentos'}
                </button>
              </div>

              {aiReview && (
                <div className="space-y-4">
                  {aiReview.alerts.length === 0 ? (
                    <div className="flex items-center gap-2 text-cat-nutritional">
                      <CheckCircle2 size={16} />
                      <p className="text-sm font-bold">Ningún medicamento activo presenta alertas de seguridad conocidas para adulto mayor.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Alertas de Seguridad ({aiReview.alerts.length})</p>
                      {aiReview.alerts.map((a, i) => (
                        <div key={i} className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-foreground">{a.med}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{a.risk}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 mt-2 pl-6">
                            <CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground">{a.recommendation}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {aiReview.safe.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-bold">Sin alertas:</span> {aiReview.safe.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MedicationList;
