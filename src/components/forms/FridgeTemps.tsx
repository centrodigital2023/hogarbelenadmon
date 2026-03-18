import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props { onBack: () => void; }

const FRIDGES = ['Nevera Principal', 'Nevera Carnes', 'Nevera Lácteos'];

const FridgeTemps = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [temps, setTemps] = useState<Record<string, number>>({});
  const [shift, setShift] = useState('mañana');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const isSafe = (temp: number) => temp >= 0 && temp <= 4;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const inserts = FRIDGES.map(f => ({
      created_by: user.id,
      fridge_name: f,
      temperature: temps[f] ?? 0,
      shift,
      record_date: recordDate,
      is_safe: isSafe(temps[f] ?? 0),
    }));
    const { error } = await supabase.from('fridge_temps').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Temperaturas registradas" });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F7: Temperatura Neveras" subtitle="Control de cadena de frío" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
          <input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)}
            className="mt-1 px-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Turno</label>
          <select value={shift} onChange={e => setShift(e.target.value)}
            className="mt-1 px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="mañana">Mañana (9 AM)</option>
            <option value="tarde">Tarde (3 PM)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {FRIDGES.map(f => {
          const temp = temps[f] ?? 0;
          const safe = isSafe(temp);
          return (
            <div key={f} className={`bg-card border-2 rounded-2xl p-6 ${safe ? 'border-cat-nutritional/30' : 'border-destructive/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-foreground">{f}</span>
                <div className={`flex items-center gap-1 text-xs font-bold ${safe ? 'text-cat-nutritional' : 'text-destructive'}`}>
                  {safe ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {safe ? 'Rango seguro' : '¡Fuera de rango!'}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input type="number" step="0.1" value={temp}
                  onChange={e => setTemps(prev => ({ ...prev, [f]: parseFloat(e.target.value) || 0 }))}
                  className="w-32 px-4 py-3 rounded-xl border border-input bg-background text-2xl font-black text-center" />
                <span className="text-lg text-muted-foreground">°C</span>
                <span className="text-xs text-muted-foreground">(Rango seguro: 0°C a 4°C)</span>
              </div>
            </div>
          );
        })}
      </div>
      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default FridgeTemps;
