import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import { TrendingUp, AlertTriangle, Heart, Calendar, Users, Utensils, ShieldCheck, Briefcase, Activity } from "lucide-react";

interface Props { onBack: () => void; }

const IndicatorsDashboard = ({ onBack }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [month, year]);

  const loadStats = async () => {
    setLoading(true);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const [
      { count: residents },
      { count: falls },
      { count: appointments },
      { count: appointmentsAttended },
      { count: incidents },
      { count: activities },
      { count: pqrsf },
      { count: trainings },
      { count: dailyLogs },
    ] = await Promise.all([
      supabase.from('residents').select('*', { count: 'exact', head: true }).in('status', ['prueba', 'permanente']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_type', 'caida').gte('incident_datetime', startDate).lt('incident_datetime', endDate),
      supabase.from('medical_appointments').select('*', { count: 'exact', head: true }).gte('appointment_date', startDate).lt('appointment_date', endDate),
      supabase.from('medical_appointments').select('*', { count: 'exact', head: true }).eq('was_attended', true).gte('appointment_date', startDate).lt('appointment_date', endDate),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('incident_datetime', startDate).lt('incident_datetime', endDate),
      supabase.from('therapeutic_activities').select('*', { count: 'exact', head: true }).gte('activity_date', startDate).lt('activity_date', endDate),
      supabase.from('pqrsf').select('*', { count: 'exact', head: true }).gte('record_date', startDate).lt('record_date', endDate),
      supabase.from('trainings').select('*', { count: 'exact', head: true }).gte('training_date', startDate).lt('training_date', endDate),
      supabase.from('daily_logs').select('*', { count: 'exact', head: true }).gte('log_date', startDate).lt('log_date', endDate),
    ]);

    setStats({
      residents: residents || 0,
      falls: falls || 0,
      appointments: appointments || 0,
      appointmentsAttended: appointmentsAttended || 0,
      incidents: incidents || 0,
      activities: activities || 0,
      pqrsf: pqrsf || 0,
      trainings: trainings || 0,
      dailyLogs: dailyLogs || 0,
      appointmentRate: appointments ? Math.round(((appointmentsAttended || 0) / appointments) * 100) : 0,
    });
    setLoading(false);
  };

  const indicators = [
    { label: 'Residentes activos', value: stats.residents, icon: Users, color: 'text-primary' },
    { label: 'Caídas del mes', value: stats.falls, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Citas médicas', value: stats.appointments, icon: Calendar, color: 'text-cat-fragility' },
    { label: 'Citas cumplidas', value: `${stats.appointmentRate || 0}%`, icon: Activity, color: 'text-cat-nutritional' },
    { label: 'Incidentes total', value: stats.incidents, icon: ShieldCheck, color: 'text-destructive' },
    { label: 'Actividades terapéuticas', value: stats.activities, icon: Heart, color: 'text-primary' },
    { label: 'PQRSF recibidas', value: stats.pqrsf, icon: TrendingUp, color: 'text-cat-fragility' },
    { label: 'Capacitaciones', value: stats.trainings, icon: Briefcase, color: 'text-primary' },
    { label: 'Bitácoras registradas', value: stats.dailyLogs, icon: Utensils, color: 'text-cat-nutritional' },
  ];

  const exportData = indicators.map(i => ({ Indicador: i.label, Valor: i.value }));

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F26: Indicadores de Gestión" subtitle="Tablero de KPIs en tiempo real" onBack={onBack} />

      <div className="flex flex-wrap gap-4 items-end mb-6">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Mes</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i + 1}>{new Date(2026, i).toLocaleString('es-CO', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Año</label>
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="mt-1 w-32 px-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
        <ExportButtons contentRef={contentRef} title="Indicadores" fileName={`indicadores_${year}_${month}`} data={exportData} />
      </div>

      <div ref={contentRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((ind, i) => {
          const Icon = ind.icon;
          return (
            <div key={i} className="bg-card border-2 border-border rounded-2xl p-6 hover:border-primary/20 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${ind.color}`}>
                  <Icon size={20} />
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase">{ind.label}</p>
              </div>
              <p className="text-3xl font-black text-foreground">
                {loading ? '...' : ind.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IndicatorsDashboard;
