import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Heart, Pill, Calendar, Activity, Bell, X, ChevronDown, ChevronUp } from "lucide-react";

interface Alert {
  id: string;
  type: 'fall' | 'vitals' | 'medication' | 'appointment' | 'general';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  residentName?: string;
  timestamp: string;
  entityId?: string;
}

const SEVERITY_STYLES = {
  critical: 'bg-destructive/10 border-destructive/30 text-destructive',
  warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
  info: 'bg-primary/10 border-primary/30 text-primary',
};

const TYPE_ICONS = {
  fall: AlertTriangle,
  vitals: Activity,
  medication: Pill,
  appointment: Calendar,
  general: Bell,
};

const AlertsPanel = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    const newAlerts: Alert[] = [];
    const today = new Date().toISOString().split('T')[0];
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 1. Recent falls/incidents (last 3 days)
    const { data: incidents } = await supabase.from('incidents')
      .select('id, incident_type, description, incident_datetime, residents(full_name)')
      .gte('incident_datetime', threeDaysAgo.toISOString())
      .order('incident_datetime', { ascending: false }).limit(10);

    incidents?.forEach(i => {
      newAlerts.push({
        id: `fall-${i.id}`, type: 'fall', severity: 'critical',
        title: `⚠️ ${i.incident_type}`,
        description: i.description?.slice(0, 80) || 'Sin descripción',
        residentName: (i.residents as any)?.full_name,
        timestamp: i.incident_datetime,
      });
    });

    // 2. Vitals out of range (last 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data: vitals } = await supabase.from('daily_logs')
      .select('id, resident_id, spo2, temperature, heart_rate, glucose, blood_pressure, residents(full_name)')
      .gte('created_at', yesterday.toISOString()).limit(50);

    vitals?.forEach(v => {
      const issues: string[] = [];
      if (v.spo2 && v.spo2 < 90) issues.push(`SpO2: ${v.spo2}%`);
      if (v.temperature && (v.temperature > 38 || v.temperature < 35)) issues.push(`Temp: ${v.temperature}°C`);
      if (v.heart_rate && (v.heart_rate > 100 || v.heart_rate < 50)) issues.push(`FC: ${v.heart_rate}`);
      if (v.glucose && (v.glucose > 200 || v.glucose < 70)) issues.push(`Glucemia: ${v.glucose}`);
      if (issues.length > 0) {
        newAlerts.push({
          id: `vitals-${v.id}`, type: 'vitals', severity: 'critical',
          title: '🔴 Signos vitales fuera de rango',
          description: issues.join(' · '),
          residentName: (v.residents as any)?.full_name,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 3. Upcoming appointments (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const { data: appts } = await supabase.from('medical_appointments')
      .select('id, appointment_date, appointment_time, specialty, residents(full_name)')
      .gte('appointment_date', today)
      .lte('appointment_date', threeDaysFromNow.toISOString().split('T')[0])
      .eq('was_attended', false)
      .order('appointment_date').limit(10);

    appts?.forEach(a => {
      newAlerts.push({
        id: `appt-${a.id}`, type: 'appointment', severity: 'info',
        title: `📅 Cita: ${a.specialty || 'Médica'}`,
        description: `${a.appointment_date} ${a.appointment_time || ''}`,
        residentName: (a.residents as any)?.full_name,
        timestamp: a.appointment_date, entityId: a.id,
      });
    });

    // 4. Medication expiring soon (7 days)
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    const { data: meds } = await supabase.from('medications')
      .select('id, medication_name, expiry_date, residents(full_name)')
      .eq('is_active', true)
      .lte('expiry_date', sevenDays.toISOString().split('T')[0])
      .gte('expiry_date', today)
      .limit(10);

    meds?.forEach(m => {
      newAlerts.push({
        id: `med-${m.id}`, type: 'medication', severity: 'warning',
        title: `💊 Medicamento por vencer: ${m.medication_name}`,
        description: `Vence: ${m.expiry_date}`,
        residentName: (m.residents as any)?.full_name,
        timestamp: m.expiry_date || '',
      });
    });

    // 5. Fridge temps out of range (today)
    const { data: temps } = await supabase.from('fridge_temps')
      .select('id, fridge_name, temperature, record_date')
      .eq('record_date', today).eq('is_safe', false).limit(10);

    temps?.forEach(t => {
      newAlerts.push({
        id: `temp-${t.id}`, type: 'general', severity: 'warning',
        title: `🌡️ Temperatura fuera de rango: ${t.fridge_name}`,
        description: `${t.temperature}°C — Rango seguro: 0-5°C`,
        timestamp: t.record_date,
      });
    });

    setAlerts(newAlerts);
  }, [user]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="mb-6 animate-fade-in">
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Bell size={16} className="text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">
              Alertas Activas
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {visibleAlerts.length}
              </span>
            </h3>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {visibleAlerts.map(alert => {
            const Icon = TYPE_ICONS[alert.type];
            return (
              <div key={alert.id}
                className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all ${SEVERITY_STYLES[alert.severity]}`}>
                <Icon size={18} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold leading-tight">{alert.title}</p>
                  {alert.residentName && (
                    <p className="text-[10px] font-semibold opacity-80 mt-0.5">{alert.residentName}</p>
                  )}
                  <p className="text-[10px] opacity-70 mt-0.5 truncate">{alert.description}</p>
                </div>
                <button onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                  className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
