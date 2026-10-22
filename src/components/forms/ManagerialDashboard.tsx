import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FormHeader from "@/components/FormHeader";
import SignaturePad from "@/components/SignaturePad";
import ActionButtons from "@/components/ActionButtons";
import { useToast } from "@/hooks/use-toast";

interface Props { onBack: () => void; }

const ManagerialDashboard = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [responsible, setResponsible] = useState("");
  const [indicators, setIndicators] = useState<Record<string, number | string>>({});
  const [observations, setObservations] = useState("");
  const [actions, setActions] = useState([{ accion: '', responsable: '', fecha_limite: '', estado: 'pendiente' }]);
  const [loading, setLoading] = useState(false);

  const loadIndicators = async () => {
    setLoading(true);
    const [residents, incidents, appointments, trainings, invoices, pqrsf] = await Promise.all([
      supabase.from('residents').select('id').in('status', ['permanente', 'prueba']),
      supabase.from('incidents').select('id').gte('incident_datetime', `${year}-${String(month).padStart(2,'0')}-01`),
      supabase.from('medical_appointments').select('id, was_attended').gte('appointment_date', `${year}-${String(month).padStart(2,'0')}-01`),
      supabase.from('training_courses' as any).select('id'),
      supabase.from('invoices').select('id, total, status'),
      supabase.from('pqrsf').select('id').gte('record_date', `${year}-${String(month).padStart(2,'0')}-01`),
    ]);
    const totalResidents = residents.data?.length || 0;
    const totalAppts = appointments.data?.length || 0;
    const attended = appointments.data?.filter(a => a.was_attended)?.length || 0;
    const totalInvoiced = invoices.data?.reduce((s, i) => s + (i.total || 0), 0) || 0;
    const paidInvoices = invoices.data?.filter(i => i.status === 'pagada')?.reduce((s, i) => s + (i.total || 0), 0) || 0;

    setIndicators({
      ocupacion: Math.round((totalResidents / 20) * 100),
      incidentes_mes: incidents.data?.length || 0,
      citas_cumplimiento: totalAppts > 0 ? Math.round((attended / totalAppts) * 100) : 0,
      capacitaciones: trainings.data?.length || 0,
      facturacion_emitida: totalInvoiced,
      facturacion_cobrada: paidInvoices,
      pqrsf_mes: pqrsf.data?.length || 0,
    });
    setLoading(false);
  };

  useEffect(() => { loadIndicators(); }, [month, year]);

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-G06: Tablero de Control Gerencial" subtitle="Indicadores consolidados para toma de decisiones" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-3 gap-4">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Mes</label>
          <select value={month} onChange={e => setMonth(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
            {Array.from({length:12},(_,i) => <option key={i} value={i+1}>{new Date(2026, i).toLocaleDateString('es', {month:'long'})}</option>)}
          </select></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Año</label>
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Responsable</label>
          <input value={responsible} onChange={e => setResponsible(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ocupación', value: `${indicators.ocupacion || 0}%`, color: 'text-primary' },
          { label: 'Incidentes (Mes)', value: indicators.incidentes_mes || 0, color: Number(indicators.incidentes_mes || 0) > 0 ? 'text-destructive' : 'text-primary' },
          { label: 'Citas Cumplidas', value: `${indicators.citas_cumplimiento || 0}%`, color: 'text-primary' },
          { label: 'Capacitaciones', value: indicators.capacitaciones || 0, color: 'text-foreground' },
          { label: 'Facturación Emitida', value: `$${(indicators.facturacion_emitida || 0).toLocaleString()}`, color: 'text-foreground' },
          { label: 'Facturación Cobrada', value: `$${(indicators.facturacion_cobrada || 0).toLocaleString()}`, color: 'text-primary' },
          { label: 'PQRSF (Mes)', value: indicators.pqrsf_mes || 0, color: 'text-foreground' },
        ].map(ind => (
          <div key={ind.label} className="bg-card border border-border rounded-2xl p-5 text-center">
            <p className={`text-2xl font-black ${ind.color}`}>{ind.value}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{ind.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-3">Novedades Administrativas</h3>
        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3}
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">Acciones Estratégicas</h3>
        {actions.map((a, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input placeholder="Acción" value={a.accion} onChange={e => { const u=[...actions]; u[i]={...u[i], accion:e.target.value}; setActions(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Responsable" value={a.responsable} onChange={e => { const u=[...actions]; u[i]={...u[i], responsable:e.target.value}; setActions(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input type="date" value={a.fecha_limite} onChange={e => { const u=[...actions]; u[i]={...u[i], fecha_limite:e.target.value}; setActions(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <select value={a.estado} onChange={e => { const u=[...actions]; u[i]={...u[i], estado:e.target.value}; setActions(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
              <option value="pendiente">Pendiente</option><option value="en_proceso">En Proceso</option><option value="completado">Completado</option>
            </select>
          </div>
        ))}
        <button onClick={() => setActions(p => [...p, { accion:'', responsable:'', fecha_limite:'', estado:'pendiente' }])} className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar acción</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6"><SignaturePad label="Vo.Bo. Representante Legal" /></div>
    </div>
  );
};

export default ManagerialDashboard;
