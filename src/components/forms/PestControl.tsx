import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";
import HistorialGerencial from "@/components/HistorialGerencial";

interface Props { onBack: () => void; }

const PEST_TYPES = ['Roedores', 'Cucarachas', 'Hormigas', 'Moscas', 'Mosquitos', 'Otros'];
const AREAS = ['Cocina', 'Habitaciones', 'Baños', 'Áreas comunes', 'Almacén', 'Jardín'];

const PestControl = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [year, setYear] = useState(new Date().getFullYear());
  const [company, setCompany] = useState({ name: '', nit: '', license: '', contract_date: '' });
  const [schedule, setSchedule] = useState([{ fecha: '', tipo: '', area: '', producto: '', concentracion: '', responsable: '' }]);
  const [monitoring, setMonitoring] = useState([{ fecha: '', area: '', plaga: '', nivel: 'bajo', accion: '', verificado: '' }]);
  const [certs, setCerts] = useState({ certificado: false, fichas: false, registro: false });
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('pest_control' as any).insert({
      period_quarter: quarter, period_year: year,
      company_name: company.name, company_nit: company.nit, company_license: company.license,
      schedule_data: schedule, monitoring_data: monitoring, certificates: certs,
      observations, created_by: user.id,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "HB-G02 guardado" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-G02: Control Integrado de Plagas" subtitle="Fumigaciones y monitoreo" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Trimestre</label>
            <select value={quarter} onChange={e => setQuarter(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
              {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select></div>
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Año</label>
            <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">1. Empresa Contratada</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{k:'name',l:'Nombre'},{k:'nit',l:'NIT'},{k:'license',l:'Licencia Sanitaria'},{k:'contract_date',l:'Fecha Contrato'}].map(f => (
            <div key={f.k}><label className="text-xs font-bold text-muted-foreground uppercase">{f.l}</label>
              <input value={(company as any)[f.k]} onChange={e => setCompany(p => ({...p,[f.k]:e.target.value}))}
                type={f.k === 'contract_date' ? 'date' : 'text'}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">2. Cronograma de Intervenciones</h3>
        {schedule.map((row, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
            {Object.entries(row).map(([k, v]) => (
              <input key={k} placeholder={k} value={v} onChange={e => {
                const u = [...schedule]; u[i] = {...u[i], [k]: e.target.value}; setSchedule(u);
              }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            ))}
          </div>
        ))}
        <button onClick={() => setSchedule(p => [...p, { fecha:'', tipo:'', area:'', producto:'', concentracion:'', responsable:'' }])}
          className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">3. Monitoreo</h3>
        {monitoring.map((row, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
            <input placeholder="Fecha" type="date" value={row.fecha} onChange={e => { const u=[...monitoring]; u[i]={...u[i], fecha:e.target.value}; setMonitoring(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <select value={row.area} onChange={e => { const u=[...monitoring]; u[i]={...u[i], area:e.target.value}; setMonitoring(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
              <option value="">Área</option>{AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={row.plaga} onChange={e => { const u=[...monitoring]; u[i]={...u[i], plaga:e.target.value}; setMonitoring(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
              <option value="">Plaga</option>{PEST_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={row.nivel} onChange={e => { const u=[...monitoring]; u[i]={...u[i], nivel:e.target.value}; setMonitoring(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
              <option value="bajo">Bajo</option><option value="medio">Medio</option><option value="alto">Alto</option>
            </select>
            <input placeholder="Acción" value={row.accion} onChange={e => { const u=[...monitoring]; u[i]={...u[i], accion:e.target.value}; setMonitoring(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Verificado por" value={row.verificado} onChange={e => { const u=[...monitoring]; u[i]={...u[i], verificado:e.target.value}; setMonitoring(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
          </div>
        ))}
        <button onClick={() => setMonitoring(p => [...p, { fecha:'', area:'', plaga:'', nivel:'bajo', accion:'', verificado:'' }])}
          className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">4. Certificados</h3>
        {Object.entries(certs).map(([k, v]) => (
          <label key={k} className="flex items-center gap-3 p-3 rounded-xl border border-border mb-2 cursor-pointer">
            <input type="checkbox" checked={v} onChange={e => setCerts(p => ({...p, [k]: e.target.checked}))} className="w-5 h-5 rounded accent-primary" />
            <span className="text-sm font-medium text-foreground capitalize">{k.replace('_', ' ')}</span>
          </label>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Observaciones</label>
        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-2 gap-6">
        <SignaturePad label="Responsable" /><SignaturePad label="Vo.Bo. Coordinador" />
      </div>
      <ActionButtons onFinish={handleSave} disabled={saving} />

      <HistorialGerencial 
        moduleId="HB-G02" 
        moduleName="HB-G02: Control Integrado de Plagas"
        tableName="pest_control"
      />
    </div>
  );
};

export default PestControl;
