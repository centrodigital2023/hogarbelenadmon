import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, Loader2 } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const TYPES = ['Caída desde su propia altura', 'Caída desde mobiliario', 'Casi caída', 'Error de medicación', 'Agresión', 'Otro'];
const CONSEQUENCES = ['Ninguna', 'Raspadura / Laceración', 'Hematoma / Inflamación', 'Posible fractura o pérdida de conciencia'];

const AI_CAUSES: Record<string, { causes: string[]; actions: string[] }> = {
  'Caída desde su propia altura': {
    causes: ['Hipotensión ortostática al levantarse', 'Efecto sedante de medicamentos', 'Déficit de fuerza muscular en miembros inferiores', 'Calzado inadecuado o piso húmedo', 'Pérdida de equilibrio por alteración vestibular'],
    actions: ['Revisar medicamentos sedantes o hipotensores con el médico', 'Aplicar protocolo de levantarse lentamente (3 tiempos)', 'Colocar barandas laterales en cama', 'Verificar iluminación nocturna en habitación y pasillos', 'Programar evaluación de Tinetti (equilibrio y marcha)'],
  },
  'Caída desde mobiliario': {
    causes: ['Intento de acceso sin ayuda (silla, cama, sillón)', 'Falta de supervisión en traslados', 'Mobiliario sin frenos o inestable'],
    actions: ['Revisar altura de cama y colocar en posición baja', 'Verificar frenos de silla de ruedas antes de traslados', 'Aumentar frecuencia de supervisión en horarios de riesgo', 'Informar al residente y familia sobre solicitud de ayuda'],
  },
  'Casi caída': {
    causes: ['Mareo o vértigo transitorio', 'Hipoglucemia', 'Inicio de proceso infeccioso'],
    actions: ['Revisar signos vitales inmediatamente (T.A., glucemia)', 'Valorar estado de hidratación', 'Notificar al médico para seguimiento', 'Aumentar vigilancia durante 24 horas'],
  },
  'Error de medicación': {
    causes: ['Confusión en presentación de medicamentos similares', 'Lectura incorrecta de la formulación', 'Error en horario de administración', 'Falta de verificación de los 5 correctos'],
    actions: ['Aplicar protocolo de los 5 correctos: paciente, medicamento, dosis, vía, hora', 'Notificar al médico y evaluar necesidad de antídoto o tratamiento', 'Reportar al Comité de Seguridad del Paciente', 'Reforzar capacitación al personal sobre administración de medicamentos'],
  },
  'Agresión': {
    causes: ['Delirium o cuadro confusional agudo', 'Trastorno conductual asociado a demencia (SCPD)', 'Dolor no comunicado adecuadamente', 'Reacción a cambio de rutina o personal'],
    actions: ['Evaluar causa orgánica subyacente (dolor, infección, estreñimiento)', 'Aplicar técnicas de de-escalada verbal y entorno calmado', 'Notificar al médico para valorar ajuste farmacológico', 'Informar a psicología para seguimiento conductual'],
  },
};

const IncidentReport = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [form, setForm] = useState({
    resident_id: '', incident_type: '', description: '', consequences: '',
    cause_analysis: '', first_aid: false, family_notified: false,
    family_contact_name: '', transferred_to_er: false, er_facility: '',
  });
  const [saving, setSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ causes: string[]; actions: string[] } | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente'])
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const handleSave = async () => {
    if (!user || !form.resident_id) return;
    setSaving(true);
    const { error } = await supabase.from('incidents').insert({
      ...form, created_by: user.id,
      corrective_actions: [
        form.first_aid && 'Se brindaron primeros auxilios',
        form.family_notified && `Se informó a la familia (${form.family_contact_name})`,
        form.transferred_to_er && `Se trasladó a urgencias (${form.er_facility})`,
      ].filter(Boolean),
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Incidente registrado" });
    setSaving(false);
  };

  const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const generateAISuggestion = () => {
    if (!form.incident_type) return;
    setGenerating(true);
    const suggestion = AI_CAUSES[form.incident_type] || {
      causes: ['Evaluar condición del entorno en el momento del evento', 'Revisar estado clínico del residente (signos vitales, medicación)', 'Identificar factores de riesgo individuales del residente'],
      actions: ['Notificar al equipo médico y de enfermería', 'Documentar detalladamente el incidente', 'Revisar y actualizar el plan de cuidados'],
    };
    setAiSuggestion(suggestion);
    // Auto-fill cause_analysis with AI suggestions
    update('cause_analysis', suggestion.causes.join('. ') + '.');
    setGenerating(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F20: Incidentes y Caídas" subtitle="Documentar y analizar incidentes" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
          <select value={form.resident_id} onChange={e => update('resident_id', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar --</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Tipo de evento</label>
          <select value={form.incident_type} onChange={e => update('incident_type', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar --</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Descripción del suceso</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Consecuencias visibles</label>
          <select value={form.consequences} onChange={e => update('consequences', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar --</option>
            {CONSEQUENCES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Análisis de causa</label>
            <button
              type="button"
              onClick={generateAISuggestion}
              disabled={generating || !form.incident_type}
              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline disabled:opacity-40"
            >
              {generating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              Sugerir causas con IA
            </button>
          </div>
          <textarea value={form.cause_analysis} onChange={e => update('cause_analysis', e.target.value)} rows={2}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
            placeholder="Ej: piso húmedo, falta de barandas..." />
        </div>
      </div>

      {/* AI Suggestion Panel */}
      {aiSuggestion && (
        <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-primary" /> Análisis IA: {form.incident_type}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Causas probables</p>
              <ul className="space-y-1">
                {aiSuggestion.causes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="w-4 h-4 rounded-full bg-destructive/10 text-destructive text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Acciones recomendadas</p>
              <ul className="space-y-1">
                {aiSuggestion.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">✓</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-black text-foreground mb-3">Acciones correctivas</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer">
            <input type="checkbox" checked={form.first_aid} onChange={e => update('first_aid', e.target.checked)} className="w-5 h-5 accent-primary" />
            <span className="text-sm">Se brindaron primeros auxilios</span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer">
            <input type="checkbox" checked={form.family_notified} onChange={e => update('family_notified', e.target.checked)} className="w-5 h-5 accent-primary" />
            <span className="text-sm">Se informó a la familia</span>
          </label>
          {form.family_notified && (
            <input type="text" placeholder="Nombre del familiar contactado" value={form.family_contact_name}
              onChange={e => update('family_contact_name', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          )}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer">
            <input type="checkbox" checked={form.transferred_to_er} onChange={e => update('transferred_to_er', e.target.checked)} className="w-5 h-5 accent-primary" />
            <span className="text-sm">Se trasladó a urgencias</span>
          </label>
          {form.transferred_to_er && (
            <input type="text" placeholder="Nombre de la IPS" value={form.er_facility}
              onChange={e => update('er_facility', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          )}
        </div>
      </div>

      <ActionButtons onFinish={handleSave} disabled={saving || !form.resident_id || !form.incident_type} />
    </div>
  );
};

export default IncidentReport;
