import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, Loader2 } from "lucide-react";

interface Props { onBack: () => void; }

const TYPES = ['Petición', 'Queja', 'Reclamo', 'Sugerencia', 'Felicitación'];

const AI_PQRSF: Record<string, { analysis: string; plan: string }> = {
  Petición: {
    analysis: 'La petición recibida representa una solicitud formal de información, documentos o servicios. Se debe verificar disponibilidad y tiempos de respuesta según la normatividad vigente (Ley 1755/2015).',
    plan: 'Dar respuesta dentro de los 15 días hábiles establecidos. Asignar responsable. Confirmar recepción al peticionario. Archivar respuesta en expediente del residente.',
  },
  Queja: {
    analysis: 'La queja manifiesta insatisfacción con la prestación del servicio. Es necesario analizar la situación descrita, identificar las causas raíz y evaluar el impacto en la calidad de atención.',
    plan: 'Responder en máximo 15 días hábiles. Citar a reunión con el equipo involucrado. Implementar acciones correctivas y verificar su efectividad en 30 días. Notificar al peticionario el resultado.',
  },
  Reclamo: {
    analysis: 'El reclamo implica la exigencia de un derecho posiblemente vulnerado. Se debe revisar la prestación del servicio relacionado, revisar historia clínica y registros si aplica.',
    plan: 'Respuesta prioritaria en máximo 10 días hábiles. Convocar Comité de Ética o Calidad. Documentar acciones correctivas. Verificar si requiere reporte a ente de control.',
  },
  Sugerencia: {
    analysis: 'La sugerencia recibida refleja una oportunidad de mejora identificada por usuario, familia o personal. Se debe evaluar su viabilidad técnica, presupuestal y operativa.',
    plan: 'Presentar al Comité de Calidad en sesión mensual. Evaluar factibilidad y costo-beneficio. Informar resultado al proponente en máximo 30 días. Registrar en Plan de Mejoramiento Continuo si es aprobada.',
  },
  Felicitación: {
    analysis: 'La felicitación reconoce una buena práctica o servicio destacado. Esto constituye un indicador positivo de calidad y satisfacción del usuario que debe documentarse y divulgarse.',
    plan: 'Comunicar al equipo o funcionario destacado. Publicar en cartelera o comunicado interno. Registrar como buena práctica en el sistema de calidad. Replicar en otros procesos si aplica.',
  },
};

const PQRSFRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sender_name: '', pqrsf_type: '', description: '', analysis: '', improvement_plan: '',
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('pqrsf').select('*').order('record_date', { ascending: false });
    if (data) setRecords(data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('pqrsf').insert({ ...form, created_by: user.id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "PQRSF registrado" }); setShowForm(false); load(); }
    setSaving(false);
  };

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const generateAI = () => {
    if (!form.pqrsf_type) return;
    setGenerating(true);
    const suggestion = AI_PQRSF[form.pqrsf_type];
    if (suggestion) {
      setForm(p => ({ ...p, analysis: suggestion.analysis, improvement_plan: suggestion.plan }));
    }
    setGenerating(false);
  };

  const typeColor: Record<string, string> = {
    Petición: 'bg-cat-functional/10 text-cat-functional',
    Queja: 'bg-destructive/10 text-destructive',
    Reclamo: 'bg-cat-fragility/10 text-cat-fragility',
    Sugerencia: 'bg-cat-cognitive/10 text-cat-cognitive',
    Felicitación: 'bg-cat-nutritional/10 text-cat-nutritional',
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F23: PQRSF" subtitle="Peticiones, Quejas, Reclamos, Sugerencias y Felicitaciones" onBack={onBack} />
      <button onClick={() => setShowForm(!showForm)}
        className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase mb-6 min-h-[48px]">
        Nuevo PQRSF
      </button>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-muted-foreground uppercase">Nombre del remitente</label>
              <input type="text" value={form.sender_name} onChange={e => update('sender_name', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" /></div>
            <div><label className="text-xs font-bold text-muted-foreground uppercase">Tipo</label>
              <select value={form.pqrsf_type} onChange={e => update('pqrsf_type', e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">-- Seleccionar --</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
          </div>
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Descripción</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" /></div>

          {/* AI Analysis Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={generateAI}
              disabled={generating || !form.pqrsf_type}
              className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 min-h-[40px]"
            >
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Generar análisis y plan de mejora con IA
            </button>
          </div>

          <div><label className="text-xs font-bold text-muted-foreground uppercase">Análisis del caso</label>
            <textarea value={form.analysis} onChange={e => update('analysis', e.target.value)} rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
              placeholder="El análisis se generará automáticamente según el tipo de PQRSF..." /></div>

          <div><label className="text-xs font-bold text-muted-foreground uppercase">Plan de mejora / Respuesta</label>
            <textarea value={form.improvement_plan} onChange={e => update('improvement_plan', e.target.value)} rows={3}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
              placeholder="El plan de respuesta se generará automáticamente..." /></div>

          <ActionButtons onFinish={handleSave} disabled={saving || !form.sender_name || !form.pqrsf_type} />
        </div>
      )}

      <div className="space-y-3">
        {records.map(r => (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${typeColor[r.pqrsf_type] || 'bg-muted text-muted-foreground'}`}>{r.pqrsf_type}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${r.status === 'cerrado' ? 'bg-cat-nutritional/10 text-cat-nutritional' : 'bg-cat-fragility/10 text-cat-fragility'}`}>{r.status}</span>
              <span className="text-xs text-muted-foreground">{r.record_date}</span>
            </div>
            <p className="text-sm font-bold text-foreground">{r.sender_name}</p>
            <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PQRSFRecord;
