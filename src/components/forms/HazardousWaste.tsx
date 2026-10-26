import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { PeriodBar, GerencialSignatures, emptySigs, useResponsible, fieldLabel, filledRows, type GerencialSigs } from "@/components/forms/gerencial";
import HistorialGerencial from "@/components/HistorialGerencial";

interface Props { onBack: () => void; }

const WASTE_TYPES = ['Biosanitarios', 'Cortopunzantes', 'Anatomopatológicos', 'Químicos', 'Farmacéuticos'];
const COLOR_CODES: Record<string, string> = { 'Biosanitarios': 'Rojo', 'Cortopunzantes': 'Rojo (guardián)', 'Anatomopatológicos': 'Rojo', 'Químicos': 'Naranja', 'Farmacéuticos': 'Blanco' };

const HazardousWaste = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [responsible, setResponsible] = useResponsible();
  const [sigs, setSigs] = useState<GerencialSigs>(emptySigs);
  const [inventory, setInventory] = useState([{ fecha: '', tipo: WASTE_TYPES[0], descripcion: '', cantidad: '', recipiente: COLOR_CODES[WASTE_TYPES[0]], responsable: '' }]);
  const [compliance, setCompliance] = useState({ bio_48h: false, quim_30d: false, corto_80pct: false });
  const [disposals, setDisposals] = useState([{ fecha: '', empresa: '', certificado: '', tipo: '', cantidad: '', recibido: '' }]);
  const [incidents, setIncidents] = useState([{ fecha: '', tipo: '', personal: '', accion: '', reporte_arl: '', cerrado: false }]);
  const [saving, setSaving] = useState(false);

  const missing = [...(responsible.trim() ? [] : ['responsable']), ...(sigs.responsible ? [] : ['firma del responsable'])];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { error } = await supabase.from('hazardous_waste').insert({
      period_month: month, period_year: year, responsible,
      inventory_data: filledRows(inventory, ['tipo', 'recipiente']), compliance_checks: compliance,
      disposal_records: filledRows(disposals), incidents: filledRows(incidents), created_by: user.id,
      signature_responsible: sigs.responsible, signature_coordinator: sigs.coordinator,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else { toast({ title: "HB-G03 guardado" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-G03: Manejo de Residuos Peligrosos (RESPEL)" subtitle="Control de residuos biológicos, cortopunzantes y químicos" onBack={onBack} />

      <PeriodBar kind="month" table="hazardous_waste" period={month} year={year} onPeriod={setMonth} onYear={setYear} responsible={responsible} onResponsible={setResponsible} />

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">1. Inventario de Generación</h3>
        {inventory.map((row, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
            <input type="date" value={row.fecha} onChange={e => { const u=[...inventory]; u[i]={...u[i], fecha:e.target.value}; setInventory(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
            <select value={row.tipo} onChange={e => { const u=[...inventory]; u[i]={...u[i], tipo:e.target.value, recipiente: COLOR_CODES[e.target.value]||''}; setInventory(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs">
              {WASTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Descripción" value={row.descripcion} onChange={e => { const u=[...inventory]; u[i]={...u[i], descripcion:e.target.value}; setInventory(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
            <input placeholder="Cantidad" value={row.cantidad} onChange={e => { const u=[...inventory]; u[i]={...u[i], cantidad:e.target.value}; setInventory(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
            <input placeholder="Recipiente" value={row.recipiente} readOnly className="px-2 py-1.5 rounded-lg border border-input bg-muted text-xs" />
            <input placeholder="Responsable" value={row.responsable} onChange={e => { const u=[...inventory]; u[i]={...u[i], responsable:e.target.value}; setInventory(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
          </div>
        ))}
        <button type="button" onClick={() => setInventory(p => [...p, { fecha:'', tipo:WASTE_TYPES[0], descripcion:'', cantidad:'', recipiente:COLOR_CODES[WASTE_TYPES[0]], responsable:'' }])} className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">2. Verificación de Cumplimiento</h3>
        {[{k:'bio_48h',l:'Biocontaminados almacenados < 48 horas'},{k:'quim_30d',l:'Químicos almacenados < 30 días'},{k:'corto_80pct',l:'Cortopunzantes: cambio al 80% de capacidad'}].map(item => (
          <label key={item.k} className="flex items-center gap-3 p-3 rounded-xl border border-border mb-2 cursor-pointer">
            <input type="checkbox" checked={compliance[item.k as keyof typeof compliance]} onChange={e => setCompliance(p => ({...p, [item.k]: e.target.checked}))} className="w-5 h-5 rounded accent-primary" />
            <span className="text-sm font-medium text-foreground">{item.l}</span>
          </label>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">3. Entrega a Gestor Externo</h3>
        {disposals.map((row, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
            {Object.entries(row).map(([k, v]) => (
              <input key={k} placeholder={fieldLabel(k)} type={k==='fecha'?'date':'text'} value={v} onChange={e => { const u=[...disposals]; u[i]={...u[i],[k]:e.target.value}; setDisposals(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
            ))}
          </div>
        ))}
        <button type="button" onClick={() => setDisposals(p => [...p, { fecha:'', empresa:'', certificado:'', tipo:'', cantidad:'', recibido:'' }])} className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">4. Incidentes RESPEL</h3>
        {incidents.map((row, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2 items-center">
            <input type="date" value={row.fecha} onChange={e => { const u=[...incidents]; u[i]={...u[i], fecha:e.target.value}; setIncidents(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
            <select value={row.tipo} onChange={e => { const u=[...incidents]; u[i]={...u[i], tipo:e.target.value}; setIncidents(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs">
              <option value="">Tipo</option><option>Punción</option><option>Derrame químico</option><option>Rotura de bolsa</option><option>Contacto accidental</option>
            </select>
            <input placeholder="Personal" value={row.personal} onChange={e => { const u=[...incidents]; u[i]={...u[i], personal:e.target.value}; setIncidents(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
            <input placeholder="Acción inmediata" value={row.accion} onChange={e => { const u=[...incidents]; u[i]={...u[i], accion:e.target.value}; setIncidents(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
            <input placeholder="Reporte ARL" value={row.reporte_arl} onChange={e => { const u=[...incidents]; u[i]={...u[i], reporte_arl:e.target.value}; setIncidents(u); }} className="min-h-[40px] px-2 py-1.5 rounded-lg border border-input bg-background text-base sm:text-xs" />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={row.cerrado} onChange={e => { const u=[...incidents]; u[i]={...u[i], cerrado:e.target.checked}; setIncidents(u); }} /> Cerrado</label>
          </div>
        ))}
        <button type="button" onClick={() => setIncidents(p => [...p, { fecha:'', tipo:'', personal:'', accion:'', reporte_arl:'', cerrado:false }])} className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar</button>
      </div>

      <GerencialSignatures value={sigs} onChange={setSigs} />
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} />

      <HistorialGerencial 
        moduleId="HB-G03" 
        moduleName="HB-G03: Manejo de Residuos Peligrosos (RESPEL)"
        tableName="hazardous_waste"
      />
    </div>
  );
};

export default HazardousWaste;
