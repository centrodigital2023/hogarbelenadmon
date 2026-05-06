import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";
import { ActivityHistory } from "@/components/ActivityHistory";
import { History, Loader2 } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const TherapyRecords = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [weekStart, setWeekStart] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<Record<string, {
    attended_monday: boolean; attended_wednesday: boolean; attended_friday: boolean;
    therapy_type: string; evolution_code: string; observations: string;
  }>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleRole, setResponsibleRole] = useState('Terapeuta');
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    if (!user || !signature) {
      toast({ title: "Error", description: "Se requiere firma del terapeuta", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const inserts = Object.entries(entries).map(([rid, e]) => ({
        resident_id: rid,
        created_by: user.id,
        week_start: weekStart,
        therapy_type: e.therapy_type,
        attended_monday: e.attended_monday,
        attended_wednesday: e.attended_wednesday,
        attended_friday: e.attended_friday,
        evolution_code: e.evolution_code,
        observations: e.observations,
        signature: signature,
        responsible_id: user.id,
        responsible_name: responsibleName || user.email?.split('@')[0] || 'Terapeuta',
        responsible_role: responsibleRole,
      }));
      const { error } = await supabase.from('therapy_records').insert(inserts);
      if (error) throw error;
      toast({ title: "✅ Terapias registradas con firma" });
      setEntries({});
      setSignature(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-F9: Terapias" subtitle="Registro semanal de terapias físicas y cognitivas" onBack={onBack} />

      {/* Toggle History Button */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm hover:opacity-90"
      >
        <History size={16} /> {showHistory ? 'Ocultar' : 'Ver'} Historial (180 días)
      </button>

      {/* History Section */}
      {showHistory && (
        <div className="bg-muted/30 border border-border rounded-2xl p-6">
          <h3 className="text-sm font-bold mb-4">📋 Historial de Terapias</h3>
          <ActivityHistory
            tableName="therapy_records"
            columns={[
              { key: 'created_at', label: 'Fecha', format: (v) => new Date(v).toLocaleDateString() },
              { key: 'week_start', label: 'Semana del', format: (v) => new Date(v).toLocaleDateString() },
              { key: 'therapy_type', label: 'Tipo' },
              { key: 'evolution_code', label: 'Evolución' },
              { key: 'responsible_name', label: 'Responsable' },
            ]}
            onReexport={async (id, format) => {
              // Implementar reexportación
              toast({ title: "Reexportando como " + format.toUpperCase() });
            }}
          />
        </div>
      )}

      {/* New Therapy Entry */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-bold text-foreground mb-4">📝 Nuevo Registro</h3>
        <label className="text-xs font-bold text-muted-foreground uppercase">Semana del</label>
        <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
          className="mt-1 max-w-xs px-4 py-3 rounded-xl border border-input bg-background text-sm" />
      </div>

      {/* Resident Entries */}
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

      {/* Signature & Responsible Info */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-bold mb-4">🔐 Firma & Responsable</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Nombre</label>
            <input
              type="text"
              value={responsibleName}
              onChange={e => setResponsibleName(e.target.value)}
              placeholder="Terapeuta"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Cargo</label>
            <input
              type="text"
              value={responsibleRole}
              onChange={e => setResponsibleRole(e.target.value)}
              placeholder="Terapeuta"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm"
            />
          </div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <p className="text-[11px] font-bold text-amber-900">⚠️ FIRMA OBLIGATORIA</p>
          <p className="text-[10px] text-amber-800">La firma del responsable se incluirá en todos los documentos exportados.</p>
        </div>
        <SignaturePad value={signature || undefined} onChange={setSignature} />
      </div>

      {/* Report */}
      <div ref={contentRef}>
        <SmartReportSection module="bienestar" formTitle="HB-F9: Terapias" formData={entries} contentRef={contentRef} />
      </div>

      {/* Action Buttons */}
      <ActionButtons
        onFinish={handleSave}
        disabled={saving || Object.keys(entries).length === 0 || !signature}
      />
    </div>
  );
};


export default TherapyRecords;
