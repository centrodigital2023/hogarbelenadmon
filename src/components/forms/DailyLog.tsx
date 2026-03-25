import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Sparkles, History, Loader2 } from "lucide-react";

interface Props {onBack: () => void;}
interface Resident {id: string;full_name: string;}

const MOODS = ['😊 Alegre', '😌 Tranquilo', '😰 Ansioso', '😢 Triste', '😤 Agitado', '😶 Apático'];
const ELIMINATIONS = ['Continente', 'Incontinente', 'Estreñimiento', 'Normal', 'Diarrea'];
const SHIFTS = [
{ value: 'mañana', label: 'Mañana (7-12)' },
{ value: 'dia', label: 'Día (7-18)' },
{ value: 'noche', label: 'Noche (18-7)' }];


const DailyLog = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [shift, setShift] = useState('mañana');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<Record<string, {
    nutrition_pct: number;hydration_glasses: number;elimination: string;mood: string;observations: string;
  }>>({});
  const [aiNote, setAiNote] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').
    in('status', ['prueba', 'permanente']).order('full_name').
    then(({ data }) => {if (data) setResidents(data);});
  }, []);

  const updateEntry = (residentId: string, field: string, value: any) => {
    setEntries((prev) => ({
      ...prev,
      [residentId]: { ...(prev[residentId] || { nutrition_pct: 0, hydration_glasses: 0, elimination: '', mood: '', observations: '' }), [field]: value }
    }));
  };

  const handleGenerateAI = async () => {
    if (!user || Object.keys(entries).length === 0) return;
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: {
          residentId: null,
          dateFrom: logDate,
          dateTo: logDate,
          shift,
          isConsolidated: true,
        },
      });
      if (error) throw error;
      if (data?.note) {
        setAiNote(data.note);
      } else {
        // Fallback: generate from current form entries
        const summary = Object.entries(entries).map(([rid, e]) => {
          const name = residents.find((r) => r.id === rid)?.full_name || 'Residente';
          return `${name}: Nutrición ${e.nutrition_pct}%, Hidratación ${e.hydration_glasses} vasos, Eliminación: ${e.elimination}, Ánimo: ${e.mood}. ${e.observations}`;
        }).join('\n');

        const { data: fallback, error: fbErr } = await supabase.functions.invoke('ai-nursing-notes-from-text', {
          body: { summary, shift, logDate },
        });
        // If no dedicated function, use inline data
        if (fbErr || !fallback?.note) {
          toast({ title: "Sin datos previos", description: "Guarde primero los registros y luego genere la nota con IA.", variant: "destructive" });
        } else {
          setAiNote(fallback.note);
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Error generando nota con IA", variant: "destructive" });
    }
    setGeneratingAI(false);
  };

  const loadHistory = async () => {
    const { data } = await supabase.from('daily_logs').select('*').
    order('log_date', { ascending: false }).limit(20);
    if (data) setHistoryData(data);
    setShowHistory(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const inserts = Object.entries(entries).map(([residentId, e]) => ({
      resident_id: residentId,
      created_by: user.id,
      shift,
      log_date: logDate,
      nutrition_pct: e.nutrition_pct,
      hydration_glasses: e.hydration_glasses,
      elimination: e.elimination,
      mood: e.mood,
      observations: e.observations,
      ai_nursing_note: aiNote || null
    }));

    const { error } = await supabase.from('daily_logs').insert(inserts);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bitácora guardada", description: `${inserts.length} registros del turno ${shift}` });
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F4: Bitácora Diaria" subtitle="Registro por turnos de indicadores de salud y bienestar" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
          <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Turno</label>
          <select value={shift} onChange={(e) => setShift(e.target.value)}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
            {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={loadHistory}
          className="flex items-center gap-2 bg-muted text-muted-foreground px-4 py-3 rounded-xl text-xs font-bold hover:bg-accent min-h-[48px]">
            <History size={14} /> Historial
          </button>
        </div>
      </div>

      {/* Resident entries */}
      <div className="space-y-4 mb-6">
        {residents.map((r) => {
          const entry = entries[r.id] || { nutrition_pct: 0, hydration_glasses: 0, elimination: '', mood: '', observations: '' };
          return (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
              <p className="text-sm font-black text-foreground mb-3">{r.full_name}</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Nutrición %</label>
                  <select value={entry.nutrition_pct} onChange={(e) => updateEntry(r.id, 'nutrition_pct', Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {[0, 25, 50, 75, 100].map((v) => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Hidratación</label>
                  <input type="number" min={0} max={20} value={entry.hydration_glasses}
                  onChange={(e) => updateEntry(r.id, 'hydration_glasses', Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="Vasos" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Eliminación</label>
                  <select value={entry.elimination} onChange={(e) => updateEntry(r.id, 'elimination', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option value="">--</option>
                    {ELIMINATIONS.map((el) => <option key={el} value={el}>{el}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Ánimo</label>
                  <select value={entry.mood} onChange={(e) => updateEntry(r.id, 'mood', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option value="">--</option>
                    {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Novedades</label>
                  <input type="text" value={entry.observations}
                  onChange={(e) => updateEntry(r.id, 'observations', e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="..." />
                </div>
              </div>
            </div>);

        })}
      </div>

      {/* AI Nursing Note */}
      <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground flex items-center gap-2">Nota de Enfermería
            <Sparkles size={16} className="text-primary" /> Nota de Enfermería con IA
          </h3>
          <button onClick={handleGenerateAI} disabled={generatingAI || Object.keys(entries).length === 0}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[36px]">
            {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generatingAI ? 'Generando...' : 'Generar Nota con IA'}
          </button>
        </div>
        <textarea value={aiNote} onChange={(e) => setAiNote(e.target.value)} rows={5}
        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
        placeholder="La nota se generará automáticamente con IA a partir de los registros del turno..." />
      </div>

      {/* History panel */}
      {showHistory &&
      <div className="bg-muted rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-black text-foreground mb-3">Historial reciente</h3>
          {historyData.length === 0 ?
        <p className="text-xs text-muted-foreground">Sin registros previos.</p> :

        <div className="space-y-2 max-h-60 overflow-y-auto">
              {historyData.map((h) =>
          <div key={h.id} className="bg-card rounded-xl p-3 text-xs">
                  <span className="font-bold">{h.log_date}</span> — Turno: {h.shift} — Nutrición: {h.nutrition_pct}% — {h.mood}
                </div>
          )}
            </div>
        }
        </div>
      }

      <ActionButtons onFinish={handleSave} disabled={saving || Object.keys(entries).length === 0} />
    </div>);

};

export default DailyLog;