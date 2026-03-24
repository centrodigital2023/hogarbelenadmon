import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { AlertTriangle, Sparkles, Loader2 } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const VitalSigns = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<Record<string, {
    blood_pressure: string; spo2: number; temperature: number; glucose: number; heart_rate: number; weight: number; notes: string;
  }>>({});
  const [saving, setSaving] = useState(false);
  const [aiReport, setAiReport] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const updateEntry = (rid: string, field: string, val: any) => {
    setEntries(prev => ({
      ...prev,
      [rid]: { ...prev[rid] || { blood_pressure: '', spo2: 0, temperature: 0, glucose: 0, heart_rate: 0, weight: 0, notes: '' }, [field]: val }
    }));
  };

  const isAbnormal = (field: string, val: number) => {
    if (field === 'spo2' && val > 0 && val < 90) return true;
    if (field === 'temperature' && val > 0 && (val < 35 || val > 38)) return true;
    if (field === 'glucose' && val > 0 && (val < 70 || val > 180)) return true;
    if (field === 'heart_rate' && val > 0 && (val < 50 || val > 120)) return true;
    return false;
  };

  const generateAIInterpretation = () => {
    setGeneratingAI(true);
    const lines: string[] = [
      `INTERPRETACIÓN CLÍNICA DE SIGNOS VITALES — ${new Date(recordDate).toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })}`,
      '',
    ];
    const alerts: string[] = [];
    const normal: string[] = [];

    residents.forEach(r => {
      const e = entries[r.id];
      if (!e) return;
      const residentAlerts: string[] = [];
      if (isAbnormal('spo2', e.spo2)) residentAlerts.push(`SpO₂ ${e.spo2}% — HIPOXEMIA: administrar O₂ según prescripción médica, elevar cabecera y notificar al médico`);
      if (isAbnormal('temperature', e.temperature)) {
        if (e.temperature > 38) residentAlerts.push(`Temperatura ${e.temperature}°C — FIEBRE: hidratar, aplicar medidas físicas, vigilar cada 2h y notificar`);
        else residentAlerts.push(`Temperatura ${e.temperature}°C — HIPOTERMIA: abrigar, verificar circulación periférica`);
      }
      if (isAbnormal('glucose', e.glucose)) {
        if (e.glucose > 180) residentAlerts.push(`Glucemia ${e.glucose} mg/dL — HIPERGLUCEMIA: verificar medicación antidiabética, controlar en 2h`);
        else residentAlerts.push(`Glucemia ${e.glucose} mg/dL — HIPOGLUCEMIA: administrar carbohidratos de acción rápida, notificar al médico`);
      }
      if (isAbnormal('heart_rate', e.heart_rate)) {
        if (e.heart_rate > 120) residentAlerts.push(`FC ${e.heart_rate} bpm — TAQUICARDIA: valorar estado de hidratación, estrés o fiebre subyacente`);
        else residentAlerts.push(`FC ${e.heart_rate} bpm — BRADICARDIA: revisar medicación (betabloqueantes), EKG si persiste`);
      }
      if (residentAlerts.length > 0) {
        alerts.push(`⚠️ ${r.full_name}:`);
        residentAlerts.forEach(a => alerts.push(`   • ${a}`));
      } else if (Object.values(e).some(v => v)) {
        normal.push(`✓ ${r.full_name}: signos dentro de rangos normales`);
      }
    });

    if (alerts.length > 0) {
      lines.push('ALERTAS CLÍNICAS DETECTADAS:');
      alerts.forEach(a => lines.push(a));
      lines.push('');
    }
    if (normal.length > 0) {
      lines.push('RESIDENTES SIN ALTERACIONES:');
      normal.forEach(n => lines.push(n));
      lines.push('');
    }
    lines.push('RECOMENDACIONES GENERALES:');
    lines.push('• Continuar monitoreo según protocolo institucional');
    lines.push('• Registrar cualquier variación significativa en la bitácora de turno');
    lines.push('• Comunicar al equipo médico las alertas identificadas antes del cambio de turno');
    if (alerts.length === 0) lines.push('• Todos los signos vitales se encuentran dentro de parámetros normales para adultos mayores');

    setAiReport(lines.join('\n'));
    setGeneratingAI(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const inserts = Object.entries(entries).map(([rid, e]) => ({
      resident_id: rid, created_by: user.id, record_date: recordDate,
      blood_pressure: e.blood_pressure, spo2: e.spo2 || null, temperature: e.temperature || null,
      glucose: e.glucose || null, heart_rate: e.heart_rate || null, weight: e.weight || null, notes: e.notes,
    }));
    const { error } = await supabase.from('vital_signs').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Signos vitales registrados" });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F16: Signos Vitales" subtitle="Registro de signos vitales por residente" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
        <input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)}
          className="mt-1 max-w-xs px-4 py-3 rounded-xl border border-input bg-background text-sm" />
      </div>
      <div className="space-y-4 mb-6">
        {residents.map(r => {
          const e = entries[r.id] || { blood_pressure: '', spo2: 0, temperature: 0, glucose: 0, heart_rate: 0, weight: 0, notes: '' };
          const hasAlert = isAbnormal('spo2', e.spo2) || isAbnormal('temperature', e.temperature) || isAbnormal('glucose', e.glucose) || isAbnormal('heart_rate', e.heart_rate);
          return (
            <div key={r.id} className={`bg-card border-2 rounded-2xl p-5 ${hasAlert ? 'border-destructive/40' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-foreground">{r.full_name}</p>
                {hasAlert && <span className="flex items-center gap-1 text-xs font-bold text-destructive"><AlertTriangle size={14} /> Alerta</span>}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {[
                  { key: 'blood_pressure', label: 'T.A.', type: 'text', placeholder: '120/80' },
                  { key: 'spo2', label: 'SpO2', type: 'number', placeholder: '%' },
                  { key: 'temperature', label: 'Temp °C', type: 'number', placeholder: '36.5' },
                  { key: 'glucose', label: 'Glucemia', type: 'number', placeholder: 'mg/dl' },
                  { key: 'heart_rate', label: 'FC', type: 'number', placeholder: 'bpm' },
                  { key: 'weight', label: 'Peso kg', type: 'number', placeholder: 'kg' },
                  { key: 'notes', label: 'Notas', type: 'text', placeholder: '...' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">{f.label}</label>
                    <input type={f.type} value={(e as any)[f.key] || ''}
                      onChange={ev => updateEntry(r.id, f.key, f.type === 'number' ? parseFloat(ev.target.value) || 0 : ev.target.value)}
                      placeholder={f.placeholder}
                      className={`mt-1 w-full px-2 py-2 rounded-lg border text-sm text-center ${
                        f.type === 'number' && isAbnormal(f.key, (e as any)[f.key]) ? 'border-destructive bg-destructive/5' : 'border-input bg-background'
                      }`} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ActionButtons onFinish={handleSave} disabled={saving || Object.keys(entries).length === 0} />

      {/* AI Clinical Interpretation */}
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Sparkles size={16} className="text-primary" /> Interpretación Clínica con IA
          </h3>
          <button
            onClick={generateAIInterpretation}
            disabled={generatingAI || Object.keys(entries).length === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[36px]"
          >
            {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generatingAI ? 'Analizando...' : 'Interpretar valores'}
          </button>
        </div>
        <textarea
          value={aiReport}
          onChange={e => setAiReport(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none font-mono"
          placeholder="La interpretación clínica se generará automáticamente al registrar los signos vitales..."
        />
      </div>
    </div>
  );
};

export default VitalSigns;
