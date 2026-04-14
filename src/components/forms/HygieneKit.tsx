import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import { Package, History } from "lucide-react";

interface Props { onBack: () => void; }

const KIT_ITEMS = [
  { key: 'jabon_bano', label: 'Jabón de baño', unit: 'und' },
  { key: 'shampoo', label: 'Shampoo', unit: 'und' },
  { key: 'crema_dental', label: 'Crema dental', unit: 'und' },
  { key: 'cepillo_dental', label: 'Cepillo dental', unit: 'und' },
  { key: 'papel_higienico', label: 'Papel higiénico', unit: 'rollos' },
  { key: 'pañales', label: 'Pañales (si aplica)', unit: 'paq' },
  { key: 'toallas_humedas', label: 'Toallas húmedas', unit: 'paq' },
  { key: 'crema_corporal', label: 'Crema corporal', unit: 'und' },
  { key: 'desodorante', label: 'Desodorante', unit: 'und' },
  { key: 'peinilla', label: 'Peinilla / cepillo cabello', unit: 'und' },
  { key: 'cortauñas', label: 'Cortaúñas', unit: 'und' },
  { key: 'jabon_ropa', label: 'Jabón ropa', unit: 'und' },
  { key: 'protector_solar', label: 'Protector solar', unit: 'und' },
  { key: 'crema_antipañalitis', label: 'Crema antipañalitis', unit: 'und' },
];

interface Resident { id: string; full_name: string; }

const HygieneKit = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [kitDate, setKitDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Record<string, { checked: boolean; qty: number; obs: string }>>({});
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente'])
      .order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  useEffect(() => {
    if (!selectedResident) return;
    const init: Record<string, { checked: boolean; qty: number; obs: string }> = {};
    KIT_ITEMS.forEach(i => { init[i.key] = { checked: false, qty: 1, obs: '' }; });
    setItems(init);
    supabase.from('hygiene_kits').select('*').eq('resident_id', selectedResident)
      .order('kit_date', { ascending: false }).limit(12)
      .then(({ data }) => { if (data) setHistory(data); });
  }, [selectedResident]);

  const updateItem = (key: string, field: string, value: any) => {
    setItems(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const checkedCount = Object.values(items).filter(i => i.checked).length;
  const residentName = residents.find(r => r.id === selectedResident)?.full_name || '';

  const handleSave = async () => {
    if (!selectedResident || !user) return;
    setSaving(true);
    const { error } = await supabase.from('hygiene_kits').insert({
      resident_id: selectedResident, created_by: user.id, kit_date: kitDate, items: items as any, observations,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Kit guardado", description: `${checkedCount} artículos entregados` });
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="Kit de Aseo Mensual" subtitle="Control de entrega de artículos de higiene personal" onBack={onBack} />
      <div ref={contentRef}>
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Residente</label>
              <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                <option value="">-- Seleccionar --</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fecha de entrega</label>
              <input type="date" value={kitDate} onChange={e => setKitDate(e.target.value)}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
          </div>
        </div>
        {selectedResident && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-foreground">{checkedCount}/{KIT_ITEMS.length} artículos marcados</p>
              <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                <History size={14} /> {showHistory ? 'Ocultar' : 'Ver'} historial
              </button>
            </div>
            {showHistory && history.length > 0 && (
              <div className="bg-muted/50 rounded-2xl p-4 mb-6">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Últimas entregas</h4>
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center justify-between bg-card rounded-xl px-4 py-2 text-xs">
                      <span className="font-medium">{h.kit_date}</span>
                      <span className="text-muted-foreground">{Object.values(h.items as Record<string, any>).filter((i: any) => i.checked).length} artículos</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
                <Package size={16} className="text-primary" /> Artículos del Kit
              </h3>
              <div className="space-y-3">
                {KIT_ITEMS.map((item) => (
                  <div key={item.key} className={`grid grid-cols-12 gap-3 items-center p-3 rounded-xl border-2 transition-all ${items[item.key]?.checked ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                    <div className="col-span-1 flex items-center">
                      <input type="checkbox" checked={items[item.key]?.checked || false}
                        onChange={e => updateItem(item.key, 'checked', e.target.checked)} className="w-5 h-5 rounded border-2 border-input accent-primary" />
                    </div>
                    <div className="col-span-4"><span className="text-sm font-medium">{item.label}</span></div>
                    <div className="col-span-2">
                      <input type="number" min={0} max={99} value={items[item.key]?.qty || 1}
                        onChange={e => updateItem(item.key, 'qty', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded-lg border border-input bg-background text-sm text-center" />
                      <span className="text-[10px] text-muted-foreground block text-center">{item.unit}</span>
                    </div>
                    <div className="col-span-5">
                      <input type="text" placeholder="Observación..." value={items[item.key]?.obs || ''}
                        onChange={e => updateItem(item.key, 'obs', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Observaciones generales</label>
              <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3}
                className="mt-2 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" placeholder="Notas sobre la entrega del kit..." />
            </div>
          </>
        )}
      </div>
      {selectedResident && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ExportButtons contentRef={contentRef} title={`Kit Aseo ${residentName}`} fileName={`kit_aseo_${residentName}_${kitDate}`} textContent={`Kit de Aseo - ${residentName} - ${kitDate}\n${checkedCount} artículos entregados`} />
          <ShareButtons title={`Kit Aseo ${residentName}`} text={`Kit de Aseo - ${residentName} - ${kitDate}\n${checkedCount} artículos entregados`} />
        </div>
      )}
      <ActionButtons onFinish={handleSave} disabled={saving || !selectedResident} />
    </div>
  );
};

export default HygieneKit;
