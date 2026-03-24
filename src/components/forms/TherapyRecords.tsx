import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";
import { Sparkles, Loader2 } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const TherapyRecords = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [weekStart, setWeekStart] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<Record<string, {
    attended_monday: boolean; attended_wednesday: boolean; attended_friday: boolean;
    therapy_type: string; evolution_code: string; observations: string;
  }>>({});
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const updateEntry = (rid: string, key: string, val: any) => {
    setEntries(prev => ({
      ...prev,
      [rid]: { ...prev[rid] || { attended_monday: false, attended_wednesday: false, attended_friday: false, therapy_type: '', evolution_code: '', observations: '' }, [key]: val }
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const inserts = Object.entries(entries).map(([rid, e]) => ({
      resident_id: rid, created_by: user.id, week_start: weekStart, ...e,
    }));
    const { error } = await supabase.from('therapy_records').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Terapias registradas" });
    setSaving(false);
  };

  const generateAISummary = () => {
    if (Object.keys(entries).length === 0) return;
    setGeneratingAI(true);
    const weekLabel = new Date(weekStart).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const lines: string[] = [`RESUMEN SEMANAL DE TERAPIAS — Semana del ${weekLabel}`, ''];

    const deteriorated: string[] = [];
    const improved: string[] = [];
    const absent: string[] = [];

    Object.entries(entries).forEach(([rid, e]) => {
      const name = residents.find(r => r.id === rid)?.full_name || 'Residente';
      const sessionsCount = [e.attended_monday, e.attended_wednesday, e.attended_friday].filter(Boolean).length;
      if (sessionsCount === 0) { absent.push(name); return; }
      if (e.evolution_code === 'D') deteriorated.push(`${name} (${e.therapy_type || 'Terapia'}: Deterioro)`);
      if (e.evolution_code === 'I') improved.push(`${name} (${e.therapy_type || 'Terapia'}: Incremento)`);
    });

    const total = Object.keys(entries).length;
    const attended = Object.values(entries).filter(e =>
      e.attended_monday || e.attended_wednesday || e.attended_friday
    ).length;

    lines.push(`PARTICIPACIÓN: ${attended}/${total} residentes asistieron al menos a una sesión esta semana.`);
    lines.push('');

    if (improved.length > 0) {
      lines.push('✓ PROGRESO POSITIVO:');
      improved.forEach(n => lines.push(`   • ${n}`));
      lines.push('');
    }
    if (deteriorated.length > 0) {
      lines.push('⚠️ REQUIEREN ATENCIÓN ESPECIAL:');
      deteriorated.forEach(n => lines.push(`   • ${n}`));
      lines.push('   → Recomendación: Revisión del plan terapéutico individual, evaluar factores médicos o conductuales.');
      lines.push('');
    }
    if (absent.length > 0) {
      lines.push('✗ AUSENCIAS SIN JUSTIFICAR:');
      absent.forEach(n => lines.push(`   • ${n}`));
      lines.push('   → Investigar causa: salud, voluntad del residente o disponibilidad del terapeuta.');
      lines.push('');
    }
    lines.push('RECOMENDACIONES GENERALES:');
    lines.push('• Mantener frecuencia de sesiones según plan individualizado');
    lines.push('• Actualizar objetivos terapéuticos a inicio del siguiente período');
    if (deteriorated.length > 0) lines.push('• Priorizar visita médica para residentes con deterioro funcional');

    setAiSummary(lines.join('\n'));
    setGeneratingAI(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F9: Terapias" subtitle="Registro semanal de terapias físicas y cognitivas" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Semana del</label>
        <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
          className="mt-1 max-w-xs px-4 py-3 rounded-xl border border-input bg-background text-sm" />
      </div>
      <div className="space-y-3 mb-6">
        {residents.map(r => {
          const e = entries[r.id] || { attended_monday: false, attended_wednesday: false, attended_friday: false, therapy_type: '', evolution_code: '', observations: '' };
          return (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
              <p className="text-sm font-black text-foreground mb-3">{r.full_name}</p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Lunes</span>
                  <input type="checkbox" checked={e.attended_monday || false}
                    onChange={ev => updateEntry(r.id, 'attended_monday', ev.target.checked)}
                    className="w-6 h-6 accent-primary" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Miércoles</span>
                  <input type="checkbox" checked={e.attended_wednesday || false}
                    onChange={ev => updateEntry(r.id, 'attended_wednesday', ev.target.checked)}
                    className="w-6 h-6 accent-primary" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Viernes</span>
                  <input type="checkbox" checked={e.attended_friday || false}
                    onChange={ev => updateEntry(r.id, 'attended_friday', ev.target.checked)}
                    className="w-6 h-6 accent-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Tipo</label>
                  <select value={e.therapy_type || ''} onChange={ev => updateEntry(r.id, 'therapy_type', ev.target.value)}
                    className="mt-1 w-full px-2 py-1 rounded-lg border border-input bg-background text-xs">
                    <option value="">--</option>
                    <option>Fisioterapia</option>
                    <option>Cognitiva</option>
                    <option>Ocupacional</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Evolución</label>
                  <select value={e.evolution_code || ''} onChange={ev => updateEntry(r.id, 'evolution_code', ev.target.value)}
                    className="mt-1 w-full px-2 py-1 rounded-lg border border-input bg-background text-xs">
                    <option value="">--</option>
                    <option value="M">(M) Mantiene</option>
                    <option value="I">(I) Incrementa</option>
                    <option value="D">(D) Deterioro</option>
                    <option value="P">(P) Pasiva</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Obs.</label>
                  <input type="text" value={e.observations || ''} onChange={ev => updateEntry(r.id, 'observations', ev.target.value)}
                    className="mt-1 w-full px-2 py-1 rounded-lg border border-input bg-background text-xs" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <SignaturePad label="Terapeuta" />
      </div>

      {/* AI Weekly Summary */}
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">
            <Sparkles size={16} className="text-primary" /> Resumen Semanal con IA
          </h3>
          <button
            onClick={generateAISummary}
            disabled={generatingAI || Object.keys(entries).length === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[36px]"
          >
            {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generatingAI ? 'Generando...' : 'Generar resumen'}
          </button>
        </div>
        <textarea
          value={aiSummary}
          onChange={e => setAiSummary(e.target.value)}
          rows={10}
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none font-mono"
          placeholder="El resumen semanal se generará automáticamente a partir de los registros de asistencia y evolución..."
        />
      </div>

      <ActionButtons onFinish={handleSave} disabled={saving || Object.keys(entries).length === 0} />
    </div>
  );
};

export default TherapyRecords;
