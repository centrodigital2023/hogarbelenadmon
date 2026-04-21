import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import SignaturePad from "@/components/SignaturePad";
import { Sparkles, Loader2, Save, Calendar, ChevronDown, ChevronUp, Share2, Mail, MessageCircle } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const NursingNotes = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleRole, setResponsibleRole] = useState("");

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente'])
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const loadHistory = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    let query = supabase
      .from('nursing_notes')
      .select('*')
      .gte('created_at', thirtyDaysAgoISO)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!isConsolidated && selectedResident) {
      query = query.eq('resident_id', selectedResident);
    } else if (isConsolidated) {
      query = query.eq('is_consolidated', true);
    } else {
      setHistory([]);
      return;
    }

    query.then(({ data }) => { if (data) setHistory(data); });
  };

  useEffect(() => {
    if (!selectedResident && !isConsolidated) return;
    loadHistory();
  }, [selectedResident, isConsolidated]);

  const generateNote = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: { residentId: isConsolidated ? null : selectedResident, dateFrom, dateTo, shift, isConsolidated },
      });
      if (error) throw error;
      if (data?.note) setNote(data.note);
      else toast({ title: "Sin datos", description: "No se encontraron registros para generar la nota. Guarde primero la bitácora.", variant: "destructive" });
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
    else {
      toast({ title: "Nota guardada" });
      loadHistory();
    }
    setSaving(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const loadHistoryNote = (h: any) => {
    setNote(h.note);
    setExpandedId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const shareWhatsApp = () => {
    if (!note) return;
    const text = encodeURIComponent(`📄 *Nota de Enfermería* ${isConsolidated ? "(Consolidada)" : ""}\n\n${note}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareEmail = () => {
    if (!note) return;
    const subject = encodeURIComponent(`Nota de Enfermería - ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(note);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareSocial = async () => {
    if (!note) return;
    const shareData = {
      title: 'Nota de Enfermería - Hogar Belén',
      text: note.slice(0, 500),
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log('Error al compartir', err); }
    } else {
      await navigator.clipboard.writeText(note);
      toast({ title: "Texto copiado", description: "La nota se ha copiado al portapapeles" });
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-F4: Bitácora Diaria" subtitle="Registro por turnos de indicadores de salud y bienestar" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isConsolidated} onChange={(e) => setIsConsolidated(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-bold text-foreground">Nota consolidada (todos los residentes)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {!isConsolidated && (
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
              <select value={selectedResident} onChange={(e) => setSelectedResident(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">-- Seleccionar --</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Turno</label>
            <select value={shift} onChange={(e) => setShift(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              <option value="mañana">Mañana</option>
              <option value="tarde">Tarde</option>
              <option value="noche">Noche</option>
            </select>
          </div>
        </div>

        <button onClick={generateNote} disabled={generating || (!isConsolidated && !selectedResident)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {generating ? 'Generando...' : 'Generar nota con IA'}
        </button>
      </div>

      {note && (
        <div ref={contentRef} className="bg-card border-2 border-primary/20 rounded-2xl p-6">
          <h3 className="text-sm font-black text-foreground mb-3">Nota generada</h3>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={12}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none font-mono" />

          {/* Responsable + Firma */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <input
                placeholder="Nombre del responsable"
                value={responsibleName}
                onChange={e => setResponsibleName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm"
              />
              <input
                placeholder="Cargo / Rol"
                value={responsibleRole}
                onChange={e => setResponsibleRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Firma digital</p>
              <SignaturePad label="Firma" value={signature || undefined} onChange={setSignature} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={saveNote} disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
            <ExportButtons
              contentRef={contentRef}
              title="Nota de Enfermería"
              fileName="nota_enfermeria"
              textContent={note}
              signatureDataUrl={signature}
              responsibleName={responsibleName}
              responsibleRole={responsibleRole}
            />
            <button onClick={shareWhatsApp}
              className="flex items-center gap-2 bg-[hsl(var(--accent))] text-accent-foreground px-6 py-3 rounded-xl text-xs font-bold hover:opacity-90 transition">
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button onClick={shareEmail}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold hover:opacity-90 transition">
              <Mail size={14} /> Email
            </button>
            <button onClick={shareSocial}
              className="flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl text-xs font-bold hover:opacity-90 transition">
              <Share2 size={14} /> Compartir
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-sm font-black text-foreground mb-4">Historial de notas (últimos 30 días)</h3>
          <div className="space-y-3">
            {history.map(h => {
              const isExpanded = expandedId === h.id;
              return (
                <div key={h.id} className="border border-border rounded-xl overflow-hidden">
                  <button onClick={() => toggleExpand(h.id)}
                    className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors text-left">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <Calendar size={12} /> <span className="font-bold text-foreground">{h.note_date}</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold">{h.shift}</span>
                      {h.is_ai_generated && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-md font-bold">IA</span>}
                      {h.is_consolidated && <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-bold">Consolidada</span>}
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>

                  {!isExpanded && (
                    <div className="px-4 py-2 text-sm text-muted-foreground line-clamp-2">{h.note}</div>
                  )}

                  {isExpanded && (
                    <div ref={historyRef} className="p-4 border-t border-border">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed mb-4">{h.note}</div>
                      <div className="flex flex-wrap gap-3 items-center">
                        <button onClick={() => loadHistoryNote(h)} className="text-xs text-primary font-bold hover:underline">Cargar en editor</button>
                        <ExportButtons contentRef={historyRef} title="Nota de Enfermería" fileName={`nota_enfermeria_${h.note_date}`} textContent={h.note} />
                        <button onClick={() => { setNote(h.note); shareWhatsApp(); }} className="text-xs text-primary font-bold hover:underline flex items-center gap-1"><MessageCircle size={12} /> WhatsApp</button>
                        <button onClick={() => { setNote(h.note); shareEmail(); }} className="text-xs text-primary font-bold hover:underline flex items-center gap-1"><Mail size={12} /> Email</button>
                        <button onClick={() => { setNote(h.note); shareSocial(); }} className="text-xs text-primary font-bold hover:underline flex items-center gap-1"><Share2 size={12} /> Compartir</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {history.length === 0 && (selectedResident || isConsolidated) && (
        <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground">
          No hay notas registradas en los últimos 30 días.
        </div>
      )}
    </div>
  );
};

export default NursingNotes;
