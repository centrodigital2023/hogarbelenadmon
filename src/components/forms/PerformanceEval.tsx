import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }

const PerformanceEval = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [form, setForm] = useState({
    evaluated_user_id: '', period: '',
    score_resident_care: 3, score_compliance: 3, score_safety: 3,
    score_proactivity: 3, score_teamwork: 3, score_hygiene: 3,
    improvement_plan: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select('user_id, full_name').then(({ data }) => {
      if (data) setProfiles(data);
    });
  }, []);

  const total = form.score_resident_care + form.score_compliance + form.score_safety +
    form.score_proactivity + form.score_teamwork + form.score_hygiene;

  const concept = total >= 25 ? 'Sobresaliente' : total >= 18 ? 'Satisfactorio' : 'Necesita mejorar';

  const handleSave = async () => {
    if (!user || !form.evaluated_user_id) return;
    setSaving(true);
    const { error } = await supabase.from('performance_evaluations').insert({
      ...form, evaluated_by: user.id, total_score: total, concept,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Evaluación guardada" });
    setSaving(false);
  };

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const CRITERIA = [
    { key: 'score_resident_care', label: 'Trato al Residente' },
    { key: 'score_compliance', label: 'Cumplimiento (horarios, uniforme)' },
    { key: 'score_safety', label: 'Seguridad (aplicación de protocolos)' },
    { key: 'score_proactivity', label: 'Proactividad' },
    { key: 'score_teamwork', label: 'Trabajo en equipo' },
    { key: 'score_hygiene', label: 'Higiene' },
  ];

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F25: Evaluación de Desempeño" subtitle="Evaluación periódica del personal" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Empleado</label>
          <select value={form.evaluated_user_id} onChange={e => update('evaluated_user_id', e.target.value)}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar --</option>
            {profiles.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Periodo evaluado</label>
          <input type="text" value={form.period} onChange={e => update('period', e.target.value)}
            placeholder="Ej: Enero-Junio 2026"
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
        {CRITERIA.map(c => (
          <div key={c.key} className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{c.label}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} onClick={() => update(c.key, v)}
                  className={`w-10 h-10 rounded-xl font-black text-sm ${(form as any)[c.key] === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-sm font-black text-foreground">Total: {total}/30</span>
          <span className={`text-sm font-black ${concept === 'Sobresaliente' ? 'text-cat-nutritional' : concept === 'Satisfactorio' ? 'text-cat-functional' : 'text-destructive'}`}>{concept}</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Plan de mejora y compromisos</label>
        <textarea value={form.improvement_plan} onChange={e => update('improvement_plan', e.target.value)} rows={3}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 flex gap-8 justify-center">
        <SignaturePad label="Evaluador" />
        <SignaturePad label="Evaluado" />
      </div>

      <SmartReportSection module="personal" formTitle="HB-F25: Evaluación Desempeño" formData={form} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} disabled={saving || !form.evaluated_user_id} />
    </div>
  );
};

export default PerformanceEval;
