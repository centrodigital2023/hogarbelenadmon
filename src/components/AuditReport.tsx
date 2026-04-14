import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import { useRef } from "react";
import { FileText, Download } from "lucide-react";

interface Props { onBack: () => void; }

const AuditReport = ({ onBack }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 12); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    const [residents, incidents, appointments, pqrsf, assessments, trainings, invoices] = await Promise.all([
      supabase.from('residents').select('*').in('status', ['permanente', 'prueba']),
      supabase.from('incidents').select('*').gte('incident_datetime', dateFrom).lte('incident_datetime', dateTo),
      supabase.from('medical_appointments').select('*').gte('appointment_date', dateFrom).lte('appointment_date', dateTo),
      supabase.from('pqrsf').select('*').gte('record_date', dateFrom).lte('record_date', dateTo),
      supabase.from('geriatric_assessments').select('*').gte('assessment_date', dateFrom).lte('assessment_date', dateTo),
      supabase.from('training_courses_public' as any).select('id, title'),
      supabase.from('invoices').select('*').gte('created_at', dateFrom).lte('created_at', dateTo),
    ]);
    setData({
      residents: residents.data || [],
      incidents: incidents.data || [],
      appointments: appointments.data || [],
      pqrsf: pqrsf.data || [],
      assessments: assessments.data || [],
      trainings: trainings.data || [],
      invoices: invoices.data || [],
    });
    setLoading(false);
  };

  const falls = data?.incidents?.filter((i: any) => i.incident_type === 'caída')?.length || 0;
  const attendedAppts = data?.appointments?.filter((a: any) => a.was_attended)?.length || 0;
  const totalAppts = data?.appointments?.length || 0;
  const pqrsfOpen = data?.pqrsf?.filter((p: any) => p.status === 'abierto')?.length || 0;
  const pqrsfClosed = data?.pqrsf?.filter((p: any) => p.status === 'cerrado')?.length || 0;

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="📋 Informe de Auditoría Consolidado" subtitle="Para Instituto Departamental de Salud y entes de control" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Desde</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Hasta</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <button onClick={generateReport} disabled={loading}
          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40">
          {loading ? 'Generando...' : '📊 Generar Informe'}
        </button>
      </div>

      {data && (
        <>
          <ExportButtons contentRef={contentRef} title="Informe de Auditoría" fileName="informe_auditoria" data={[
            { seccion: 'Residentes', total: data.residents.length },
            { seccion: 'Caídas', total: falls },
            { seccion: 'Citas cumplidas', total: `${attendedAppts}/${totalAppts}` },
            { seccion: 'PQRSF abiertas', total: pqrsfOpen },
            { seccion: 'Valoraciones', total: data.assessments.length },
          ]} />

          <div ref={contentRef} className="space-y-6">
            {/* Residentes */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-4">1. Listado de Residentes ({data.residents.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 font-bold text-muted-foreground">Nombre</th>
                    <th className="text-left py-2 font-bold text-muted-foreground">Documento</th>
                    <th className="text-left py-2 font-bold text-muted-foreground">Ingreso</th>
                    <th className="text-left py-2 font-bold text-muted-foreground">Estado</th>
                  </tr></thead>
                  <tbody>{data.residents.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 font-medium text-foreground">{r.full_name}</td>
                      <td className="py-2">{r.document_id || '-'}</td>
                      <td className="py-2">{new Date(r.admission_date).toLocaleDateString()}</td>
                      <td className="py-2 capitalize">{r.status}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            {/* Indicadores */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-4">2. Indicadores de Gestión</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Caídas', value: falls, color: falls > 0 ? 'text-destructive' : 'text-primary' },
                  { label: 'Citas Cumplidas', value: `${totalAppts > 0 ? Math.round(attendedAppts/totalAppts*100) : 0}%`, color: 'text-primary' },
                  { label: 'PQRSF Abiertas', value: pqrsfOpen, color: pqrsfOpen > 0 ? 'text-destructive' : 'text-primary' },
                  { label: 'PQRSF Cerradas', value: pqrsfClosed, color: 'text-primary' },
                  { label: 'Valoraciones', value: data.assessments.length, color: 'text-foreground' },
                  { label: 'Incidentes Total', value: data.incidents.length, color: 'text-foreground' },
                  { label: 'Capacitaciones', value: data.trainings.length, color: 'text-foreground' },
                  { label: 'Facturas', value: data.invoices.length, color: 'text-foreground' },
                ].map(ind => (
                  <div key={ind.label} className="bg-muted/30 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-black ${ind.color}`}>{ind.value}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">{ind.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Incidentes */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-4">3. Incidentes y Caídas ({data.incidents.length})</h3>
              {data.incidents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 font-bold text-muted-foreground">Fecha</th>
                      <th className="text-left py-2 font-bold text-muted-foreground">Tipo</th>
                      <th className="text-left py-2 font-bold text-muted-foreground">Descripción</th>
                    </tr></thead>
                    <tbody>{data.incidents.slice(0, 20).map((inc: any) => (
                      <tr key={inc.id} className="border-b border-border/50">
                        <td className="py-2">{new Date(inc.incident_datetime).toLocaleDateString()}</td>
                        <td className="py-2 capitalize">{inc.incident_type}</td>
                        <td className="py-2">{inc.description?.substring(0, 100) || '-'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-muted-foreground">Sin incidentes en el período</p>}
            </div>

            {/* PQRSF */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm font-black text-foreground mb-4">4. PQRSF ({data.pqrsf.length})</h3>
              {data.pqrsf.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 font-bold text-muted-foreground">Fecha</th>
                      <th className="text-left py-2 font-bold text-muted-foreground">Tipo</th>
                      <th className="text-left py-2 font-bold text-muted-foreground">Remitente</th>
                      <th className="text-left py-2 font-bold text-muted-foreground">Estado</th>
                    </tr></thead>
                    <tbody>{data.pqrsf.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2">{new Date(p.record_date).toLocaleDateString()}</td>
                        <td className="py-2 capitalize">{p.pqrsf_type}</td>
                        <td className="py-2">{p.sender_name}</td>
                        <td className="py-2"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${p.status==='cerrado'?'bg-primary/10 text-primary':'bg-destructive/10 text-destructive'}`}>{p.status}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-muted-foreground">Sin PQRSF en el período</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditReport;
