import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SmartReportSection from "@/components/SmartReportSection";
import { Upload } from "lucide-react";

interface Props { onBack: () => void; }

const FoodIntake = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [weeks, setWeeks] = useState<Array<{
    week_number: number; reception_date: string; supplier: string; invoice_number: string;
    packaging_ok: boolean; expiry_ok: boolean; temperature_ok: boolean; details: string;
  }>>([1, 2, 3, 4].map(w => ({
    week_number: w, reception_date: '', supplier: '', invoice_number: '',
    packaging_ok: true, expiry_ok: true, temperature_ok: true, details: '',
  })));
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const updateWeek = (idx: number, key: string, val: any) => {
    setWeeks(prev => prev.map((w, i) => i === idx ? { ...w, [key]: val } : w));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const inserts = weeks.filter(w => w.reception_date).map(w => ({
      ...w, created_by: user.id, record_month: month,
    }));
    const { error } = await supabase.from('food_intake_records').insert(inserts);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Registro de alimentos guardado" });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F6: Ingreso de Alimentos" subtitle="Control de calidad de alimentos recibidos" onBack={onBack} />
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase">Mes</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="mt-1 max-w-xs px-4 py-3 rounded-xl border border-input bg-background text-sm" />
      </div>
      {weeks.map((w, idx) => (
        <div key={idx} className="bg-card border border-border rounded-2xl p-6 mb-4">
          <h4 className="text-xs font-black text-foreground uppercase mb-3">Semana {w.week_number}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase">Fecha recepción</label>
              <input type="date" value={w.reception_date} onChange={e => updateWeek(idx, 'reception_date', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase">Proveedor</label>
              <input type="text" value={w.supplier} onChange={e => updateWeek(idx, 'supplier', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase">N° Factura</label>
              <input type="text" value={w.invoice_number} onChange={e => updateWeek(idx, 'invoice_number', e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" /></div>
          </div>
          <div className="flex gap-6 mt-3">
            {[
              { key: 'packaging_ok', label: 'Embalaje limpio' },
              { key: 'expiry_ok', label: 'Fecha vencimiento OK' },
              { key: 'temperature_ok', label: 'Temperatura OK' },
            ].map(c => (
              <label key={c.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={(w as any)[c.key]}
                  onChange={e => updateWeek(idx, c.key, e.target.checked)}
                  className="w-4 h-4 accent-primary" />
                {c.label}
              </label>
            ))}
          </div>
          <div className="mt-3">
            <textarea value={w.details} onChange={e => updateWeek(idx, 'details', e.target.value)}
              placeholder="Novedades..." rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" />
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <ExportButtons contentRef={contentRef} title={`HB-F6 Ingreso Alimentos ${month}`} fileName={`ingreso_alimentos_${month}`} textContent={`Ingreso Alimentos ${month}\n${weeks.map(w => `Sem ${w.week_number}: ${w.supplier} - ${w.details}`).join('\n')}`} />
        <ShareButtons title={`HB-F6 Ingreso Alimentos ${month}`} text={`Ingreso Alimentos ${month}`} />
      </div>
      <SmartReportSection module="alimentacion" formTitle="HB-F6: Ingreso Alimentos" formData={{ month, weeks }} contentRef={contentRef} />
      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default FoodIntake;
