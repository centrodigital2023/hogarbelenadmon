import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }

const AREAS_COCINA = ['Lacena', 'Comedor', 'Pisos cocina', 'Puertas y ventanas', 'Mesones', 'Equipos', 'Utensilios'];
const AREAS_GENERAL = ['Lavamanos', 'Inodoros', 'Pisos', 'Puertas y ventanas', 'Paredes/techos', 'Áreas comunes', 'Lavandería', 'Nocheros', 'Camas', 'Tendidos', 'Pasamanos', 'Puntos ecológicos', 'Almacén'];

const DisinfectionRecord = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recordType, setRecordType] = useState<'cocina' | 'general'>('cocina');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const areas = recordType === 'cocina' ? AREAS_COCINA : AREAS_GENERAL;
  const completedCount = areas.filter(a => checks[a]).length;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const inserts = areas.map(area => ({
      created_by: user.id,
      area,
      completed: checks[area] || false,
      record_date: recordDate,
      record_type: recordType,
    }));
    const { error } = await supabase.from('disinfection_records').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Desinfección registrada", description: `${completedCount}/${areas.length} áreas` });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title={recordType === 'cocina' ? "HB-F8: Desinfección Cocina" : "HB-F8a1: Desinfección General"} subtitle="Control de limpieza y desinfección" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Tipo</label>
          <select value={recordType} onChange={e => { setRecordType(e.target.value as any); setChecks({}); }}
            className="mt-1 px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="cocina">Cocina y comedor</option>
            <option value="general">General del hogar</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
          <input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)}
            className="mt-1 px-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
        <div className="flex items-end">
          <span className="text-sm font-bold text-primary">{completedCount}/{areas.length} completadas</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-2">
        {areas.map(area => (
          <label key={area} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checks[area] ? 'border-cat-nutritional/30 bg-cat-nutritional/5' : 'border-border'}`}>
            <input type="checkbox" checked={checks[area] || false}
              onChange={e => setChecks(prev => ({ ...prev, [area]: e.target.checked }))}
              className="w-5 h-5 rounded accent-primary" />
            <span className="text-sm font-medium text-foreground">{area}</span>
          </label>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <SignaturePad label="Responsable" />
      </div>

      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default DisinfectionRecord;
