import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import SignaturePad from "@/components/SignaturePad";
import { Sparkles, History, Loader2, AlertTriangle, User, FileText, Send } from "lucide-react";
import FormHistory from "@/components/FormHistory";
import type { HistoryColumn } from "@/components/FormHistory";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const MOODS = ['😊 Alegre', '😌 Tranquilo', '😰 Ansioso', '😢 Triste', '😤 Agitado', '😶 Apático'];
const ELIMINATIONS = ['Continente', 'Incontinente', 'Estreñimiento', 'Normal', 'Diarrea'];
const SHIFTS = [
  { value: 'mañana', label: 'Mañana (7-12)' },
  { value: 'tarde', label: 'Tarde (12-18)' },
  { value: 'noche', label: 'Noche (18-7)' },
];
const RESPONSIBLE_ROLES = ['Auxiliar de Enfermería', 'Cuidadora de Turno'];

interface EntryData {
  nutrition_pct: number;
  hydration_glasses: number;
  elimination: string;
  mood: string;
  observations: string;
  blood_pressure: string;
  spo2: number;
  temperature: number;
  glucose: number;
  heart_rate: number;
  weight: number;
  vital_notes: string;
}

const emptyEntry: EntryData = {
  nutrition_pct: 0, hydration_glasses: 0, elimination: '', mood: '', observations: '',
  blood_pressure: '', spo2: 0, temperature: 0, glucose: 0, heart_rate: 0, weight: 0, vital_notes: '',
};

const DailyLog = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [shift, setShift] = useState('mañana');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<Record<string, EntryData>>({});
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleRole, setResponsibleRole] = useState(RESPONSIBLE_ROLES[0]);
  const [responsibleManual, setResponsibleManual] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);

  // History - now using FormHistory component

  // Single resident report
  const [selectedResident, setSelectedResident] = useState('');
  const [singleReport, setSingleReport] = useState('');
  const [generatingSingle, setGeneratingSingle] = useState(false);
  const singleReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('residents').select('id, full_name')
      .in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  // Set responsible name from current user
  useEffect(() => {
    if (user && !responsibleManual) {
      supabase.from('profiles').select('full_name').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setResponsibleName(data.full_name); });
    }
  }, [user, responsibleManual]);

  const updateEntry = (rid: string, field: string, val: any) => {
    setEntries(prev => ({
      ...prev,
      [rid]: { ...(prev[rid] || { ...emptyEntry }), [field]: val },
    }));
  };

  const isAbnormal = (field: string, val: number) => {
    if (field === 'spo2' && val > 0 && val < 90) return true;
    if (field === 'temperature' && val > 0 && (val < 35 || val > 38)) return true;
    if (field === 'glucose' && val > 0 && (val < 70 || val > 180)) return true;
    if (field === 'heart_rate' && val > 0 && (val < 50 || val > 120)) return true;
    return false;
  };

  const handleGenerateAI = async () => {
    if (!user || Object.keys(entries).length === 0) return;
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: { residentId: null, dateFrom: logDate, dateTo: logDate, shift, isConsolidated: true },
      });
      if (error) throw error;
      if (data?.note) setAiNote(data.note);
      else toast({ title: "Sin datos previos", description: "Guarde primero la bitácora y luego genere la nota con IA.", variant: "destructive" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Error generando nota", variant: "destructive" });
    }
    setGeneratingAI(false);
  };

  // History columns for FormHistory
  const historyColumns: HistoryColumn[] = [
    { key: 'log_date', label: 'Fecha' },
    { key: 'shift', label: 'Turno' },
    { key: 'resident_name', label: 'Residente', render: (_v, row) => (row.residents as any)?.full_name || '-' },
    { key: 'responsible_name', label: 'Responsable' },
    { key: 'blood_pressure', label: 'T.A.' },
    { key: 'spo2', label: 'SpO2' },
    { key: 'temperature', label: 'Temp' },
    { key: 'glucose', label: 'Gluc' },
    { key: 'heart_rate', label: 'FC' },
    { key: 'weight', label: 'Peso' },
    { key: 'nutrition_pct', label: 'Nutr%' },
    { key: 'mood', label: 'Ánimo' },
  ];

  const historyEditableFields = [
    { key: 'blood_pressure', label: 'T.A.', type: 'text' as const },
    { key: 'spo2', label: 'SpO2', type: 'number' as const },
    { key: 'temperature', label: 'Temp', type: 'number' as const },
    { key: 'glucose', label: 'Glucemia', type: 'number' as const },
    { key: 'heart_rate', label: 'FC', type: 'number' as const },
    { key: 'weight', label: 'Peso', type: 'number' as const },
    { key: 'observations', label: 'Novedades', type: 'text' as const },
    { key: 'mood', label: 'Ánimo', type: 'select' as const, options: MOODS },
  ];

  const historyExportTransform = (h: any) => ({
    Fecha: h.log_date, Turno: h.shift,
    Residente: (h.residents as any)?.full_name || '',
    Responsable: h.responsible_name || '',
    'T.A.': h.blood_pressure || '', 'SpO2': h.spo2 || '', 'Temp °C': h.temperature || '',
    Glucemia: h.glucose || '', FC: h.heart_rate || '', 'Peso kg': h.weight || '',
    'Nutrición %': h.nutrition_pct, Hidratación: h.hydration_glasses,
    Eliminación: h.elimination, Ánimo: h.mood, Novedades: h.observations,
  });

  // Save
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const inserts = Object.entries(entries).map(([rid, e]) => ({
      resident_id: rid, created_by: user.id, shift, log_date: logDate,
      nutrition_pct: e.nutrition_pct, hydration_glasses: e.hydration_glasses,
      elimination: e.elimination, mood: e.mood, observations: e.observations,
      blood_pressure: e.blood_pressure || null, spo2: e.spo2 || null,
      temperature: e.temperature || null, glucose: e.glucose || null,
      heart_rate: e.heart_rate || null, weight: e.weight || null,
      vital_notes: e.vital_notes || null, ai_nursing_note: aiNote || null,
      responsible_name: responsibleName, responsible_role: responsibleRole,
      signature: signatureData,
    }));
    const { error } = await supabase.from('daily_logs').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Bitácora guardada", description: `${inserts.length} registros del turno ${shift}` });
    setSaving(false);
  };

  // Single resident AI report
  const handleSingleReport = async () => {
    if (!selectedResident) return;
    setGeneratingSingle(true);
    try {
      const liveEntry = entries[selectedResident];
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: {
          residentId: selectedResident,
          dateFrom: logDate,
          dateTo: logDate,
          shift,
          isConsolidated: false,
          liveEntry: liveEntry || null,
          responsibleName,
          responsibleRole,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.note) {
        toast({
          title: "Sin datos suficientes",
          description: "Diligencia signos vitales y bienestar del residente o guarda la bitácora antes de generar el informe.",
          variant: "destructive",
        });
        setGeneratingSingle(false);
        return;
      }
      setSingleReport(data.note);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setGeneratingSingle(false);
  };

  const saveSingleReport = async () => {
    if (!user || !selectedResident || !singleReport) return;
    const { error } = await supabase.from('nursing_notes').insert({
      resident_id: selectedResident, generated_by: user.id,
      note: singleReport, note_date: logDate, shift, is_ai_generated: true,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Informe guardado" });
  };

  const getTextContent = () => {
    const lines = [`HB-F4: Bitácora Diaria - ${logDate} - Turno: ${shift}\nResponsable: ${responsibleName} (${responsibleRole})\n`];
    Object.entries(entries).forEach(([rid, e]) => {
      const r = residents.find(res => res.id === rid);
      lines.push(`${r?.full_name}: TA ${e.blood_pressure}, SpO2 ${e.spo2}%, Temp ${e.temperature}°C, Gluc ${e.glucose}, FC ${e.heart_rate}, Peso ${e.weight}kg | Nutrición ${e.nutrition_pct}%, Hidratación ${e.hydration_glasses} vasos, Eliminación: ${e.elimination}, Ánimo: ${e.mood}, Obs: ${e.observations}`);
    });
    if (aiNote) lines.push(`\nNota IA:\n${aiNote}`);
    return lines.join('\n');
  };

  const getTableData = () => Object.entries(entries).map(([rid, e]) => {
    const r = residents.find(res => res.id === rid);
    return {
      Residente: r?.full_name || '', 'T.A.': e.blood_pressure, SpO2: e.spo2, 'Temp °C': e.temperature,
      Glucemia: e.glucose, FC: e.heart_rate, 'Peso kg': e.weight,
      'Nutrición %': e.nutrition_pct, Hidratación: e.hydration_glasses,
      Eliminación: e.elimination, Ánimo: e.mood, Novedades: e.observations,
    };
  });

  const selectedResidentName = residents.find(r => r.id === selectedResident)?.full_name || '';

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F4: Bitácora Diaria" subtitle="Registro por turnos de indicadores de salud, bienestar y signos vitales" onBack={onBack} />

      <div ref={contentRef}>
        {/* Header: Fecha, Turno, Responsable */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Turno</label>
              <select value={shift} onChange={e => setShift(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <FormHistory
                tableName="daily_logs"
                columns={historyColumns}
                title="Historial Bitácora Diaria"
                fileName="historial_bitacora"
                days={180}
                dateColumn="log_date"
                selectClause="*, residents(full_name)"
                editableFields={historyEditableFields}
                exportTransform={historyExportTransform}
              />
            </div>
          </div>

          {/* Responsible */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-2">
              <User size={14} className="text-primary" />
              <label className="text-xs font-bold text-muted-foreground uppercase">Responsable del Turno</label>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-[10px] text-muted-foreground">Rol</label>
                <select value={responsibleRole} onChange={e => setResponsibleRole(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  {RESPONSIBLE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <input type="checkbox" checked={responsibleManual} onChange={e => setResponsibleManual(e.target.checked)}
                    className="rounded" />
                  Ingresar manualmente
                </label>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-muted-foreground">Nombre</label>
                <input type="text" value={responsibleName}
                  onChange={e => setResponsibleName(e.target.value)}
                  readOnly={!responsibleManual}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border border-input text-sm ${responsibleManual ? 'bg-background' : 'bg-muted'}`}
                  placeholder="Nombre del responsable" />
              </div>
            </div>
          </div>
        </div>

        {/* Resident entries with vital signs */}
        <div className="space-y-4 mb-6">
          {residents.map(r => {
            const e = entries[r.id] || { ...emptyEntry };
            const hasAlert = isAbnormal('spo2', e.spo2) || isAbnormal('temperature', e.temperature) || isAbnormal('glucose', e.glucose) || isAbnormal('heart_rate', e.heart_rate);
            return (
              <div key={r.id} className={`bg-card border-2 rounded-2xl p-5 ${hasAlert ? 'border-destructive/40' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-foreground">{r.full_name}</p>
                  {hasAlert && <span className="flex items-center gap-1 text-xs font-bold text-destructive"><AlertTriangle size={14} /> Alerta</span>}
                </div>

                {/* Vital signs row */}
                <p className="text-[10px] font-bold text-primary uppercase mb-1">Signos Vitales</p>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-3">
                  {[
                    { key: 'blood_pressure', label: 'T.A.', type: 'text', placeholder: '120/80' },
                    { key: 'spo2', label: 'SpO2 %', type: 'number', placeholder: '%' },
                    { key: 'temperature', label: 'Temp °C', type: 'number', placeholder: '36.5' },
                    { key: 'glucose', label: 'Glucemia', type: 'number', placeholder: 'mg/dl' },
                    { key: 'heart_rate', label: 'FC', type: 'number', placeholder: 'bpm' },
                    { key: 'weight', label: 'Peso kg', type: 'number', placeholder: 'kg' },
                    { key: 'vital_notes', label: 'Notas SV', type: 'text', placeholder: '...' },
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

                {/* Bienestar row */}
                <p className="text-[10px] font-bold text-accent-foreground uppercase mb-1">Bienestar</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Nutrición %</label>
                    <select value={e.nutrition_pct} onChange={ev => updateEntry(r.id, 'nutrition_pct', Number(ev.target.value))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      {[0, 25, 50, 75, 100].map(v => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Hidratación</label>
                    <input type="number" min={0} max={20} value={e.hydration_glasses}
                      onChange={ev => updateEntry(r.id, 'hydration_glasses', Number(ev.target.value))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="Vasos" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Eliminación</label>
                    <select value={e.elimination} onChange={ev => updateEntry(r.id, 'elimination', ev.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      <option value="">--</option>
                      {ELIMINATIONS.map(el => <option key={el} value={el}>{el}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Ánimo</label>
                    <select value={e.mood} onChange={ev => updateEntry(r.id, 'mood', ev.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      <option value="">--</option>
                      {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-muted-foreground uppercase">Novedades</label>
                    <input type="text" value={e.observations}
                      onChange={ev => updateEntry(r.id, 'observations', ev.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="..." />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Note */}
        <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> Nota de Enfermería con IA
            </h3>
            <button onClick={handleGenerateAI} disabled={generatingAI || Object.keys(entries).length === 0}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[36px]">
              {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {generatingAI ? 'Generando...' : 'Generar Nota'}
            </button>
          </div>
          <textarea value={aiNote} onChange={e => setAiNote(e.target.value)} rows={5}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none"
            placeholder="La nota se generará automáticamente con IA a partir de los registros del turno..." />
        </div>

        {/* Signature */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 flex flex-col items-center">
          <h3 className="text-sm font-black text-foreground mb-3">Firma Digital del Responsable</h3>
          <SignaturePad label={`${responsibleName} — ${responsibleRole}`} value={signatureData || undefined} onChange={setSignatureData} />
        </div>
      </div>

      {/* Export & Share */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <ExportButtons contentRef={contentRef} title={`HB-F4 Bitácora ${logDate}`} fileName={`bitacora_${logDate}_${shift}`}
          textContent={getTextContent()} data={getTableData()} signatureDataUrl={signatureData} />
        <ShareButtons title={`HB-F4 Bitácora ${logDate}`} text={getTextContent()} />
      </div>

      <SmartReportSection
        module="salud"
        formTitle="HB-F4: Bitácora Diaria"
        formData={{ entries, shift, log_date: logDate, responsible_name: responsibleName, responsible_role: responsibleRole }}
        contentRef={contentRef}
        responsibleName={responsibleName}
        responsibleRole={responsibleRole}
        dateFrom={logDate}
        dateTo={logDate}
        reportType="grupal"
      />
      <ActionButtons onFinish={handleSave} disabled={saving || Object.keys(entries).length === 0} />

      {/* Single Resident Report */}
      <div className="bg-card border-2 border-accent rounded-2xl p-6 mt-6">
        <h3 className="text-sm font-black text-foreground flex items-center gap-2 mb-4">
          <FileText size={16} className="text-primary" /> Informe Individual con IA
        </h3>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Residente</label>
            <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">Seleccionar residente...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <button onClick={handleSingleReport} disabled={!selectedResident || generatingSingle}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 min-h-[40px]">
            {generatingSingle ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Generar Informe
          </button>
        </div>

        {singleReport && (
          <div ref={singleReportRef}>
            <textarea value={singleReport} onChange={e => setSingleReport(e.target.value)} rows={8}
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none mb-4" />
            <div className="flex flex-wrap gap-2">
              <button onClick={saveSingleReport}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold min-h-[40px]">
                <FileText size={12} /> Guardar
              </button>
              <ExportButtons contentRef={singleReportRef} title={`Informe ${selectedResidentName} ${logDate}`}
                fileName={`informe_${selectedResidentName.replace(/\s+/g, '_')}_${logDate}`}
                textContent={singleReport} signatureDataUrl={signatureData} showDrive={false} />
              <ShareButtons title={`Informe ${selectedResidentName}`} text={singleReport} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyLog;
