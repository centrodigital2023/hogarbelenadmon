import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import { Sparkles, Loader2, Save, User, Calendar } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const NursingNotes = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState("mañana");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isConsolidated, setIsConsolidated] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente'])
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident && !isConsolidated) return;
    const q = supabase.from('nursing_notes').select('*').order('created_at', { ascending: false }).limit(20);
    if (!isConsolidated && selectedResident) q.eq('resident_id', selectedResident);
    else q.eq('is_consolidated', true);
    q.then(({ data }) => { if (data) setHistory(data); });
  }, [selectedResident, isConsolidated]);

  const generateNote = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: {
          residentId: isConsolidated ? null : selectedResident,
          dateFrom, dateTo, shift,
          isConsolidated,
        },
      });
      if (error) throw error;
      if (data?.note) setNote(data.note);
      else toast({ title: "Sin datos", description: "No se encontraron registros para generar la nota", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Error generando nota", variant: "destructive" });
    }
    setGenerating(false);
  };

  const saveNote = async () => {
    if (!user || !note.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('nursing_notes').insert({
      resident_id: isConsolidated ? null : selectedResident || null,
      note_date: dateFrom,
      note,
      shift,
      generated_by: user.id,
      is_ai_generated: true,
      is_consolidated: isConsolidated,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Nota guardada" });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="Notas de Enfermería con IA" subtitle="Generación automática de notas profesionales" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={isConsolidated} onChange={e => setIsConsolidated(e.target.checked)} className="w-4 h-4 accent-primary" />
            Nota consolidada (todos los residentes)
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {!isConsolidated && (
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
              <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">-- Seleccionar --</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Turno</label>
            <select value={shift} onChange={e => setShift(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              <option value="mañana">Mañana</option>
              <option value="tarde">Tarde</option>
              <option value="noche">Noche</option>
            </select>
          </div>
        </div>

        <button onClick={generateNote}
          disabled={generating || (!isConsolidated && !selectedResident)}
          className="mt-4 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Generando...' : 'Generar nota con IA'}
        </button>
      </div>

      {note && (
        <div ref={contentRef} className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-black text-foreground mb-3">Nota generada</h3>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={12}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none font-mono" />
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={saveNote} disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
            <ExportButtons contentRef={contentRef} title="Nota de Enfermería" fileName="nota_enfermeria" />
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-black text-foreground mb-4">Historial de notas</h3>
          <div className="space-y-3">
            {history.map(h => (
              <div key={h.id} className="p-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                  <Calendar size={12} /> {h.note_date}
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">{h.shift}</span>
                  {h.is_ai_generated && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-md font-bold">IA</span>}
                </div>
                <p className="text-sm line-clamp-3">{h.note}</p>
                <button onClick={() => setNote(h.note)} className="text-xs text-primary font-bold mt-1 hover:underline">Cargar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NursingNotes;
