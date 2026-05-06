import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";
import HistorialGerencial from "@/components/HistorialGerencial";

interface Props { onBack: () => void; }

const EQUIPMENT = ['Extintores', 'Botiquín central', 'Camilla', 'Linternas', 'Alarmas', 'Señalización', 'Iluminación emergencia'];
const DRILL_TYPES = ['Sismo', 'Incendio', 'Emergencia médica', 'Derrame químico'];

const EmergencyPlan = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [semester, setSemester] = useState(new Date().getMonth() < 6 ? 1 : 2);
  const [year, setYear] = useState(new Date().getFullYear());
  const [responsible, setResponsible] = useState("");
  const [brigade, setBrigade] = useState([{ nombre: '', cargo: '', rol: 'Coordinador', capacitacion: true }]);
  const [drills, setDrills] = useState([{ fecha: '', tipo: DRILL_TYPES[0], tiempo_evacuacion: '', participacion: '', observaciones: '', evaluador: '' }]);
  const [equipment, setEquipment] = useState<Record<string, { ubicacion: string; revision: string; vigente: string }>>(
    Object.fromEntries(EQUIPMENT.map(e => [e, { ubicacion: '', revision: '', vigente: '' }]))
  );
  const [routes, setRoutes] = useState({ senalizadas: false, iluminadas: false, libres: false, puntos_encuentro: false, mapa_visible: false });
  const [emergencyNumbers, setEmergencyNumbers] = useState({ bomberos: '', policia: '', ambulancia: '', hospital: '', defensa_civil: '' });
  const [actionPlan, setActionPlan] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('emergency_plans' as any).insert({
      period_semester: semester, period_year: year, responsible,
      brigade_members: brigade, drills, equipment_inspections: equipment,
      evacuation_routes: routes, emergency_numbers: emergencyNumbers,
      action_plan: actionPlan, created_by: user.id,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "HB-G05 guardado" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-G05: Plan de Emergencias y Evacuación" subtitle="Simulacros, brigadas y equipos" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-3 gap-4">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Semestre</label>
          <select value={semester} onChange={e => setSemester(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
            <option value={1}>1er semestre</option><option value={2}>2do semestre</option>
          </select></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Año</label>
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Responsable</label>
          <input value={responsible} onChange={e => setResponsible(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
      </div>

      {/* Brigada */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">1. Brigada de Emergencias</h3>
        {brigade.map((m, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 items-center">
            <input placeholder="Nombre" value={m.nombre} onChange={e => { const u=[...brigade]; u[i]={...u[i], nombre:e.target.value}; setBrigade(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Cargo" value={m.cargo} onChange={e => { const u=[...brigade]; u[i]={...u[i], cargo:e.target.value}; setBrigade(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <select value={m.rol} onChange={e => { const u=[...brigade]; u[i]={...u[i], rol:e.target.value}; setBrigade(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
              <option>Coordinador</option><option>Evacuador</option><option>Primeros auxilios</option><option>Control de incendios</option><option>Comunicaciones</option>
            </select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={m.capacitacion} onChange={e => { const u=[...brigade]; u[i]={...u[i], capacitacion:e.target.checked}; setBrigade(u); }} /> Capacitación vigente</label>
          </div>
        ))}
        <button onClick={() => setBrigade(p => [...p, { nombre:'', cargo:'', rol:'Coordinador', capacitacion:true }])} className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar</button>
      </div>

      {/* Simulacros */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">2. Simulacros Realizados</h3>
        {drills.map((d, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
            <input type="date" value={d.fecha} onChange={e => { const u=[...drills]; u[i]={...u[i], fecha:e.target.value}; setDrills(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <select value={d.tipo} onChange={e => { const u=[...drills]; u[i]={...u[i], tipo:e.target.value}; setDrills(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
              {DRILL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Tiempo evacuación" value={d.tiempo_evacuacion} onChange={e => { const u=[...drills]; u[i]={...u[i], tiempo_evacuacion:e.target.value}; setDrills(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="% participación" value={d.participacion} onChange={e => { const u=[...drills]; u[i]={...u[i], participacion:e.target.value}; setDrills(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Observaciones" value={d.observaciones} onChange={e => { const u=[...drills]; u[i]={...u[i], observaciones:e.target.value}; setDrills(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Evaluador" value={d.evaluador} onChange={e => { const u=[...drills]; u[i]={...u[i], evaluador:e.target.value}; setDrills(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
          </div>
        ))}
        <button onClick={() => setDrills(p => [...p, { fecha:'', tipo:DRILL_TYPES[0], tiempo_evacuacion:'', participacion:'', observaciones:'', evaluador:'' }])} className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar</button>
      </div>

      {/* Equipos */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">3. Inspección de Equipos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 font-bold text-muted-foreground">Equipo</th>
              <th className="text-left py-2">Ubicación</th><th className="text-left py-2">Fecha Revisión</th><th className="text-left py-2">Vigente Hasta</th>
            </tr></thead>
            <tbody>{EQUIPMENT.map(eq => (
              <tr key={eq} className="border-b border-border/50">
                <td className="py-2 font-medium">{eq}</td>
                <td className="py-2"><input value={equipment[eq]?.ubicacion||''} onChange={e => setEquipment(p => ({...p,[eq]:{...p[eq], ubicacion:e.target.value}}))} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs" /></td>
                <td className="py-2"><input type="date" value={equipment[eq]?.revision||''} onChange={e => setEquipment(p => ({...p,[eq]:{...p[eq], revision:e.target.value}}))} className="px-2 py-1 rounded-lg border border-input bg-background text-xs" /></td>
                <td className="py-2"><input type="date" value={equipment[eq]?.vigente||''} onChange={e => setEquipment(p => ({...p,[eq]:{...p[eq], vigente:e.target.value}}))} className="px-2 py-1 rounded-lg border border-input bg-background text-xs" /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Rutas */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">4. Rutas de Evacuación</h3>
        {Object.entries(routes).map(([k, v]) => (
          <label key={k} className="flex items-center gap-3 p-3 rounded-xl border border-border mb-2 cursor-pointer">
            <input type="checkbox" checked={v} onChange={e => setRoutes(p => ({...p, [k]:e.target.checked}))} className="w-5 h-5 rounded accent-primary" />
            <span className="text-sm font-medium text-foreground capitalize">{k.replace(/_/g, ' ')}</span>
          </label>
        ))}
      </div>

      {/* Números de emergencia */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">5. Números de Emergencia</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(emergencyNumbers).map(([k, v]) => (
            <div key={k}><label className="text-xs font-bold text-muted-foreground uppercase capitalize">{k.replace(/_/g,' ')}</label>
              <input value={v} onChange={e => setEmergencyNumbers(p => ({...p,[k]:e.target.value}))} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Novedades y Acciones Correctivas</label>
        <textarea value={actionPlan} onChange={e => setActionPlan(e.target.value)} rows={4}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-2 gap-6">
        <SignaturePad label="Responsable" /><SignaturePad label="Vo.Bo. Coordinador" />
      </div>
      <ActionButtons onFinish={handleSave} disabled={saving} />

      <HistorialGerencial 
        moduleId="HB-G05" 
        moduleName="HB-G05: Plan de Emergencias y Evacuación"
        tableName="emergency_plan"
      />
    </div>
  );
};

export default EmergencyPlan;
