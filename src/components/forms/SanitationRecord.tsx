import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";
import HistorialGerencial from "@/components/HistorialGerencial";

interface Props { onBack: () => void; }

const WASTEWATER = ['Pozo séptico', 'Trampas de grasa', 'Red de alcantarillado'];
const SANITARY_AREAS = ['Punto ecológico principal', 'Baños personal', 'Baños visitantes', 'Cuarto de aseo', 'Área de desinfección'];

const SanitationRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [responsible, setResponsible] = useState("");
  const [waterTests, setWaterTests] = useState([{ fecha: '', procedencia: 'acueducto', cloro: '', bacteriologico: 'Apto' }]);
  const [wastewater, setWastewater] = useState<Record<string, { mantenimiento: boolean; ultimo: string; proximo: string }>>(
    Object.fromEntries(WASTEWATER.map(w => [w, { mantenimiento: false, ultimo: '', proximo: '' }]))
  );
  const [sanitary, setSanitary] = useState<Record<string, { condicion: string; obs: string; correccion: string }>>(
    Object.fromEntries(SANITARY_AREAS.map(a => [a, { condicion: 'Buena', obs: '', correccion: '' }]))
  );
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('sanitation_records' as any).insert({
      period_month: month, period_year: year, responsible,
      water_tests: waterTests, wastewater_systems: wastewater,
      sanitary_conditions: sanitary, observations, created_by: user.id,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "HB-G04 guardado" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-G04: Saneamiento Básico" subtitle="Agua potable, aguas residuales y puntos ecológicos" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-3 gap-4">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Mes</label>
          <select value={month} onChange={e => setMonth(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
            {Array.from({length:12},(_,i) => <option key={i} value={i+1}>{i+1}</option>)}
          </select></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Año</label>
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Responsable</label>
          <input value={responsible} onChange={e => setResponsible(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">1. Control de Agua Potable</h3>
        {waterTests.map((row, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <input type="date" value={row.fecha} onChange={e => { const u=[...waterTests]; u[i]={...u[i], fecha:e.target.value}; setWaterTests(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <select value={row.procedencia} onChange={e => { const u=[...waterTests]; u[i]={...u[i], procedencia:e.target.value}; setWaterTests(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs">
              <option value="acueducto">Acueducto</option><option value="pozo">Pozo</option>
            </select>
            <input placeholder="Cloro residual (mg/L)" value={row.cloro} onChange={e => { const u=[...waterTests]; u[i]={...u[i], cloro:e.target.value}; setWaterTests(u); }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <select value={row.bacteriologico} onChange={e => { const u=[...waterTests]; u[i]={...u[i], bacteriologico:e.target.value}; setWaterTests(u); }} className={`px-2 py-1.5 rounded-lg border text-xs ${row.bacteriologico === 'No apto' ? 'border-destructive bg-destructive/10 text-destructive' : 'border-input bg-background'}`}>
              <option value="Apto">Apto</option><option value="No apto">No apto</option>
            </select>
          </div>
        ))}
        <button onClick={() => setWaterTests(p => [...p, { fecha:'', procedencia:'acueducto', cloro:'', bacteriologico:'Apto' }])} className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">2. Aguas Residuales</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 font-bold text-muted-foreground">Sistema</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Mantenimiento</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Último</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Próximo</th>
            </tr></thead>
            <tbody>{WASTEWATER.map(sys => (
              <tr key={sys} className="border-b border-border/50">
                <td className="py-2 font-medium">{sys}</td>
                <td className="py-2"><input type="checkbox" checked={wastewater[sys]?.mantenimiento} onChange={e => setWastewater(p => ({...p, [sys]: {...p[sys], mantenimiento:e.target.checked}}))} /></td>
                <td className="py-2"><input type="date" value={wastewater[sys]?.ultimo || ''} onChange={e => setWastewater(p => ({...p, [sys]: {...p[sys], ultimo:e.target.value}}))} className="px-2 py-1 rounded-lg border border-input bg-background text-xs" /></td>
                <td className="py-2"><input type="date" value={wastewater[sys]?.proximo || ''} onChange={e => setWastewater(p => ({...p, [sys]: {...p[sys], proximo:e.target.value}}))} className="px-2 py-1 rounded-lg border border-input bg-background text-xs" /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">3. Condiciones Sanitarias</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 font-bold text-muted-foreground">Área</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Condición</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Observaciones</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Fecha Corrección</th>
            </tr></thead>
            <tbody>{SANITARY_AREAS.map(area => (
              <tr key={area} className="border-b border-border/50">
                <td className="py-2 font-medium">{area}</td>
                <td className="py-2"><select value={sanitary[area]?.condicion || 'Buena'} onChange={e => setSanitary(p => ({...p, [area]: {...p[area], condicion:e.target.value}}))} className="px-2 py-1 rounded-lg border border-input bg-background text-xs">
                  <option>Buena</option><option>Regular</option><option>Mala</option>
                </select></td>
                <td className="py-2"><input value={sanitary[area]?.obs || ''} onChange={e => setSanitary(p => ({...p, [area]: {...p[area], obs:e.target.value}}))} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs" /></td>
                <td className="py-2"><input type="date" value={sanitary[area]?.correccion || ''} onChange={e => setSanitary(p => ({...p, [area]: {...p[area], correccion:e.target.value}}))} className="px-2 py-1 rounded-lg border border-input bg-background text-xs" /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
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
        moduleId="HB-G04" 
        moduleName="HB-G04: Saneamiento Básico"
        tableName="sanitation_record"
      />
    </div>
  );
};

export default SanitationRecord;
