import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }

const ITEMS = [
  { key: 'used_ppe', label: 'Usé gorro, tapabocas y delantal limpio' },
  { key: 'respected_diets', label: 'Respeté las dietas especiales de cada residente' },
  { key: 'washed_produce', label: 'Lavé y desinfecté frutas y verduras' },
  { key: 'cleaned_kitchen', label: 'Limpié y desinfecté toda la cocina al terminar' },
];

const KitchenChecklist = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState("");
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('kitchen_checklists').insert({
      created_by: user.id,
      check_date: checkDate,
      used_ppe: checks.used_ppe || false,
      respected_diets: checks.respected_diets || false,
      washed_produce: checks.washed_produce || false,
      cleaned_kitchen: checks.cleaned_kitchen || false,
      observations,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Checklist de cocina guardado" });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F5: Checklist Cocina" subtitle="Verificación diaria de buenas prácticas" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
        <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)}
          className="mt-1 w-full max-w-xs px-4 py-3 rounded-xl border border-input bg-background text-sm" />
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-3">
        {ITEMS.map(item => (
          <label key={item.key} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checks[item.key] ? 'border-cat-nutritional/30 bg-cat-nutritional/5' : 'border-border'}`}>
            <input type="checkbox" checked={checks[item.key] || false}
              onChange={e => setChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
              className="w-5 h-5 rounded accent-primary" />
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </label>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Observaciones</label>
        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
      </div>
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <SignaturePad label="Responsable" />
      </div>
      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default KitchenChecklist;
