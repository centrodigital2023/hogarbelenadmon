import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";
import HistorialGerencial from "@/components/HistorialGerencial";

interface Props { onBack: () => void; }

const AREAS = ['Habitaciones', 'Enfermería', 'Cocina', 'Baños comunes', 'Áreas sociales', 'Consultorios'];
const WASTE_TYPES = ['Biocontaminados', 'Cortopunzantes', 'Ordinarios', 'Reciclables'];

const WasteManagement = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [responsible, setResponsible] = useState("");
  const [classification, setClassification] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(AREAS.map(a => [a, { no_peligrosos: '', peligrosos: '', reciclables: '', obs: '' }]))
  );
  const [storage, setStorage] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(WASTE_TYPES.map(t => [t, { ubicacion: '', capacidad: '', dias: '' }]))
  );
  const [disposalRows, setDisposalRows] = useState([{ fecha: '', empresa: '', tipo: '', cantidad: '', manifiesto: '', recibido: '' }]);
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('waste_management' as any).insert({
      period_month: month, period_year: year, responsible,
      classification_data: classification, storage_data: storage,
      disposal_data: disposalRows, observations, created_by: user.id,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "HB-G01 guardado correctamente" }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="HB-G01: Plan de Gestión Integral de Residuos (PEGIR)" subtitle="Clasificación, almacenamiento y disposición final" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="grid grid-cols-3 gap-4">
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Mes</label>
            <select value={month} onChange={e => setMonth(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Año</label>
            <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div><label className="text-xs font-bold text-muted-foreground uppercase">Responsable</label>
            <input value={responsible} onChange={e => setResponsible(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" />
          </div>
        </div>
      </div>

      {/* Sección 1 – Clasificación por área */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">1. Clasificación por Área</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 font-bold text-muted-foreground">Área</th>
              <th className="text-left py-2 font-bold text-muted-foreground">No Peligrosos (kg)</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Peligrosos (kg)</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Reciclables (kg)</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Observaciones</th>
            </tr></thead>
            <tbody>
              {AREAS.map(area => (
                <tr key={area} className="border-b border-border/50">
                  <td className="py-2 font-medium text-foreground">{area}</td>
                  {['no_peligrosos', 'peligrosos', 'reciclables', 'obs'].map(field => (
                    <td key={field} className="py-2 pr-2">
                      <input value={classification[area]?.[field] || ''} onChange={e => setClassification(prev => ({
                        ...prev, [area]: { ...prev[area], [field]: e.target.value }
                      }))} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 2 – Almacenamiento temporal */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">2. Almacenamiento Temporal</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 font-bold text-muted-foreground">Tipo Residuo</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Ubicación</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Capacidad (L)</th>
              <th className="text-left py-2 font-bold text-muted-foreground">Días Almacenado</th>
            </tr></thead>
            <tbody>
              {WASTE_TYPES.map(type => (
                <tr key={type} className="border-b border-border/50">
                  <td className="py-2 font-medium text-foreground">{type}</td>
                  {['ubicacion', 'capacidad', 'dias'].map(field => (
                    <td key={field} className="py-2 pr-2">
                      <input value={storage[type]?.[field] || ''} onChange={e => setStorage(prev => ({
                        ...prev, [type]: { ...prev[type], [field]: e.target.value }
                      }))} className="w-full px-2 py-1 rounded-lg border border-input bg-background text-xs" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección 3 – Disposición final */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">3. Registro de Disposición Final</h3>
        {disposalRows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
            {Object.entries(row).map(([k, v]) => (
              <input key={k} placeholder={k} value={v} onChange={e => {
                const updated = [...disposalRows];
                updated[i] = { ...updated[i], [k]: e.target.value };
                setDisposalRows(updated);
              }} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            ))}
          </div>
        ))}
        <button onClick={() => setDisposalRows(prev => [...prev, { fecha: '', empresa: '', tipo: '', cantidad: '', manifiesto: '', recibido: '' }])}
          className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar fila</button>
      </div>

      {/* Sección 4 – Novedades */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">4. Novedades y Acciones Correctivas</h3>
        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={4}
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-2 gap-6">
        <SignaturePad label="Responsable" />
        <SignaturePad label="Vo.Bo. Coordinador" />
      </div>

      <ActionButtons onFinish={handleSave} disabled={saving} />

      <HistorialGerencial 
        moduleId="HB-G01" 
        moduleName="HB-G01: Plan de Gestión Integral de Residuos (PEGIR)"
        tableName="waste_management"
      />
    </div>
  );
};

export default WasteManagement;
