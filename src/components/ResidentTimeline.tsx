import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import { Clock, Filter, User, Activity, Heart, Utensils, ShieldCheck, Stethoscope, AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  onBack: () => void;
  onNavigateForm?: (formId: string) => void;
  initialResidentId?: string;
}

interface TimelineEntry {
  id: string;
  source: string;
  sourceLabel: string;
  date: string;
  summary: string;
  residentName: string;
  residentId: string;
  icon: typeof Activity;
  color: string;
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Activity; color: string; formId?: string }> = {
  daily_logs: { label: 'Bitácora', icon: Heart, color: 'text-pink-500', formId: 'HB-F4' },
  nursing_notes: { label: 'Nota Enfermería', icon: Activity, color: 'text-blue-500', formId: 'NURSING-AI' },
  incidents: { label: 'Incidente', icon: AlertTriangle, color: 'text-red-500', formId: 'HB-F20' },
  medical_appointments: { label: 'Cita Médica', icon: Stethoscope, color: 'text-green-500', formId: 'HB-F17' },
  medication_admin: { label: 'Medicación', icon: ShieldCheck, color: 'text-purple-500', formId: 'HB-F15' },
  geriatric_assessments: { label: 'Valoración', icon: User, color: 'text-orange-500' },
  kitchen_checklists: { label: 'Cocina', icon: Utensils, color: 'text-yellow-600', formId: 'UNIFIED-KITCHEN' },
};

const SOURCES = Object.keys(SOURCE_CONFIG);

const ResidentTimeline = ({ onBack, onNavigateForm, initialResidentId }: Props) => {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedResident, setSelectedResident] = useState(initialResidentId || '');
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSources, setFilterSources] = useState<string[]>(SOURCES);
  const [days, setDays] = useState(30);

  useEffect(() => {
    supabase.from('residents').select('id, full_name')
      .in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const loadTimeline = async () => {
    if (!selectedResident) return;
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const results: TimelineEntry[] = [];

    const cfg = SOURCE_CONFIG;

    // Parallel queries
    const [logs, notes, incidents, appointments, medAdmin, assessments] = await Promise.all([
      filterSources.includes('daily_logs')
        ? supabase.from('daily_logs').select('id, log_date, shift, mood, observations, residents(full_name)')
            .eq('resident_id', selectedResident).gte('log_date', cutoffStr).order('log_date', { ascending: false }).limit(200)
        : Promise.resolve({ data: [] }),
      filterSources.includes('nursing_notes')
        ? supabase.from('nursing_notes').select('id, note_date, shift, note')
            .eq('resident_id', selectedResident).gte('note_date', cutoffStr).order('note_date', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),
      filterSources.includes('incidents')
        ? supabase.from('incidents').select('id, incident_datetime, incident_type, description, residents(full_name)')
            .eq('resident_id', selectedResident).gte('incident_datetime', cutoff.toISOString()).order('incident_datetime', { ascending: false }).limit(50)
        : Promise.resolve({ data: [] }),
      filterSources.includes('medical_appointments')
        ? supabase.from('medical_appointments').select('id, appointment_date, specialty, location, was_attended, residents(full_name)')
            .eq('resident_id', selectedResident).gte('appointment_date', cutoffStr).order('appointment_date', { ascending: false }).limit(50)
        : Promise.resolve({ data: [] }),
      filterSources.includes('medication_admin')
        ? supabase.from('medication_admin').select('id, admin_datetime, dose_given, was_administered, medications(medication_name), residents(full_name)')
            .eq('resident_id', selectedResident).gte('admin_datetime', cutoff.toISOString()).order('admin_datetime', { ascending: false }).limit(100)
        : Promise.resolve({ data: [] }),
      filterSources.includes('geriatric_assessments')
        ? supabase.from('geriatric_assessments').select('id, assessment_date, test_name, score, max_score, interpretation, residents(full_name)')
            .eq('resident_id', selectedResident).gte('assessment_date', cutoffStr).order('assessment_date', { ascending: false }).limit(50)
        : Promise.resolve({ data: [] }),
    ]);

    const residentName = residents.find(r => r.id === selectedResident)?.full_name || '';

    logs.data?.forEach((l: any) => results.push({
      id: l.id, source: 'daily_logs', sourceLabel: cfg.daily_logs.label,
      date: l.log_date, summary: `Turno ${l.shift} — Ánimo: ${l.mood || '-'} — ${l.observations || 'Sin novedades'}`,
      residentName, residentId: selectedResident, icon: cfg.daily_logs.icon, color: cfg.daily_logs.color,
    }));

    notes.data?.forEach((n: any) => results.push({
      id: n.id, source: 'nursing_notes', sourceLabel: cfg.nursing_notes.label,
      date: n.note_date, summary: (n.note || '').substring(0, 120) + '...',
      residentName, residentId: selectedResident, icon: cfg.nursing_notes.icon, color: cfg.nursing_notes.color,
    }));

    incidents.data?.forEach((i: any) => results.push({
      id: i.id, source: 'incidents', sourceLabel: cfg.incidents.label,
      date: i.incident_datetime?.split('T')[0] || '', summary: `${i.incident_type}: ${i.description || ''}`.substring(0, 120),
      residentName, residentId: selectedResident, icon: cfg.incidents.icon, color: cfg.incidents.color,
    }));

    appointments.data?.forEach((a: any) => results.push({
      id: a.id, source: 'medical_appointments', sourceLabel: cfg.medical_appointments.label,
      date: a.appointment_date, summary: `${a.specialty || 'Cita'} en ${a.location || '-'} — ${a.was_attended ? '✅ Asistió' : '⏳ Pendiente'}`,
      residentName, residentId: selectedResident, icon: cfg.medical_appointments.icon, color: cfg.medical_appointments.color,
    }));

    medAdmin.data?.forEach((m: any) => results.push({
      id: m.id, source: 'medication_admin', sourceLabel: cfg.medication_admin.label,
      date: m.admin_datetime?.split('T')[0] || '', summary: `${(m.medications as any)?.medication_name || 'Med.'} — ${m.dose_given || ''} — ${m.was_administered ? '✅' : '❌ No admin.'}`,
      residentName, residentId: selectedResident, icon: cfg.medication_admin.icon, color: cfg.medication_admin.color,
    }));

    assessments.data?.forEach((a: any) => results.push({
      id: a.id, source: 'geriatric_assessments', sourceLabel: cfg.geriatric_assessments.label,
      date: a.assessment_date, summary: `${a.test_name}: ${a.score}/${a.max_score} — ${a.interpretation || ''}`,
      residentName, residentId: selectedResident, icon: cfg.geriatric_assessments.icon, color: cfg.geriatric_assessments.color,
    }));

    results.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(results);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedResident) loadTimeline();
  }, [selectedResident, days, filterSources]);

  const toggleSource = (src: string) => {
    setFilterSources(prev =>
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  };

  const getTextContent = () => entries.map(e => `${e.date} | ${e.sourceLabel} | ${e.summary}`).join('\n');
  const getTableData = () => entries.map(e => ({
    Fecha: e.date, Módulo: e.sourceLabel, Resumen: e.summary,
  }));

  return (
    <div className="animate-fade-in">
      <FormHeader title="Timeline del Residente" subtitle="Vista cronológica unificada de todos los módulos" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
            <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              <option value="">Seleccionar...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Período</label>
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
              <option value={90}>90 días</option>
              <option value={180}>180 días</option>
            </select>
          </div>
        </div>

        {/* Source filters */}
        <div className="flex flex-wrap gap-2">
          <Filter size={14} className="text-muted-foreground mt-1" />
          {SOURCES.map(src => {
            const c = SOURCE_CONFIG[src];
            const active = filterSources.includes(src);
            return (
              <button key={src} onClick={() => toggleSource(src)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      )}

      {!loading && selectedResident && (
        <div ref={contentRef}>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin registros en este período.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, i) => {
                const Icon = entry.icon;
                const showDate = i === 0 || entries[i - 1].date !== entry.date;
                const formId = SOURCE_CONFIG[entry.source]?.formId;
                return (
                  <div key={entry.id}>
                    {showDate && (
                      <div className="flex items-center gap-2 mt-4 mb-2">
                        <Clock size={12} className="text-muted-foreground" />
                        <span className="text-xs font-bold text-muted-foreground uppercase">{entry.date}</span>
                      </div>
                    )}
                    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-primary/30 transition-colors">
                      <div className={`w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 ${entry.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-primary uppercase">{entry.sourceLabel}</span>
                        </div>
                        <p className="text-sm text-foreground">{entry.summary}</p>
                      </div>
                      {formId && onNavigateForm && (
                        <button onClick={() => onNavigateForm(formId)}
                          className="text-[10px] text-primary font-bold hover:underline flex-shrink-0">
                          Ir →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          <ExportButtons contentRef={contentRef!} title={`Timeline ${residents.find(r => r.id === selectedResident)?.full_name || ''}`}
            fileName={`timeline_${days}d`} textContent={getTextContent()} data={getTableData()} signatureDataUrl={null} showDrive={false} />
        </div>
      )}
    </div>
  );
};

export default ResidentTimeline;
