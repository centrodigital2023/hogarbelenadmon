import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SignaturePad from "@/components/SignaturePad";
import { Plus, Minus } from "lucide-react";

interface Props { onBack: () => void; }

const CATEGORIES = {
  vestuario: [
    'Pantalones/Sudaderas', 'Camisas/Camisetas', 'Ropa Interior/Medias',
    'Sacos/Chaquetas', 'Pijamas', 'Calzado (pares)', 'Gorros/Bufandas',
  ],
  aseo: [
    'Jabón/Champú', 'Crema/Loción', 'Cepillo/Crema Dental',
    'Pañales (paquetes)', 'Medicamentos (cajas)', 'Toallas', 'Cobijas/Almohada',
  ],
  documentos: ['Cédula Original', 'Carné EPS', 'Historia Clínica', 'Otros'],
  valores: ['Reloj/Cadena', 'Dinero en custodia'],
};

interface Resident { id: string; full_name: string; }

const BelongingsInventory = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [reason, setReason] = useState<'ingreso' | 'egreso' | 'actualizacion'>('ingreso');
  const [items, setItems] = useState<Record<string, { qty: number; obs: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').order('full_name').then(({ data }) => {
      if (data) setResidents(data);
    });
  }, []);

  const updateItem = (key: string, field: 'qty' | 'obs', value: number | string) => {
    setItems(prev => ({
      ...prev,
      [key]: { ...prev[key] || { qty: 0, obs: '' }, [field]: value }
    }));
  };

  const totalItems = Object.values(items).reduce((sum, i) => sum + (i.qty || 0), 0);
  const residentName = residents.find(r => r.id === selectedResident)?.full_name || '';

  const handleSave = async () => {
    if (!selectedResident || !user) return;
    setSaving(true);

    const { error } = await supabase.from('belongings_inventory').insert({
      resident_id: selectedResident,
      created_by: user.id,
      reason,
      items: items as any,
      total_items: totalItems,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Inventario guardado", description: `Total: ${totalItems} elementos` });
    }
    setSaving(false);
  };

  const renderCategory = (title: string, itemsList: string[], isDoc = false) => (
    <div className="mb-6">
      <h4 className="text-xs font-black text-foreground uppercase tracking-widest mb-3 bg-muted px-4 py-2 rounded-xl">{title}</h4>
      <div className="space-y-2">
        {itemsList.map(item => {
          const key = `${title}_${item}`;
          const val = items[key] || { qty: 0, obs: '' };
          return (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <span className="text-sm font-medium text-foreground flex-1 min-w-[120px]">{item}</span>
              {isDoc ? (
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={val.qty > 0}
                    onChange={e => updateItem(key, 'qty', e.target.checked ? 1 : 0)}
                    className="w-5 h-5 rounded accent-primary" />
                  <span className="text-xs text-muted-foreground">Presente</span>
                </label>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => updateItem(key, 'qty', Math.max(0, val.qty - 1))}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-accent"><Minus size={14} /></button>
                  <span className="w-10 text-center text-sm font-bold">{val.qty}</span>
                  <button onClick={() => updateItem(key, 'qty', val.qty + 1)}
                    className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Plus size={14} /></button>
                </div>
              )}
              <input type="text" placeholder="Observación" value={val.obs}
                onChange={e => updateItem(key, 'obs', e.target.value)}
                className="w-32 px-2 py-1 text-xs rounded-lg border border-input bg-background" />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F3: Inventario de Pertenencias" subtitle="Registro de pertenencias al ingreso/egreso" onBack={onBack} />

      <div ref={contentRef}>
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
            <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              <option value="">-- Seleccionar --</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Motivo</label>
            <select value={reason} onChange={e => setReason(e.target.value as any)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
              <option value="actualizacion">Actualización Mensual</option>
            </select>
          </div>
        </div>

        {selectedResident && (
          <>
            <div className="bg-primary/10 text-primary px-4 py-3 rounded-xl mb-6 text-sm font-bold flex justify-between">
              <span>Total elementos registrados</span>
              <span className="text-xl font-black">{totalItems}</span>
            </div>

            {renderCategory('Vestuario', CATEGORIES.vestuario)}
            {renderCategory('Aseo / Salud', CATEGORIES.aseo)}
            {renderCategory('Documentos', CATEGORIES.documentos, true)}
            {renderCategory('Valores / Joyas', CATEGORIES.valores)}

            {reason === 'egreso' && (
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-2xl p-6 mb-6">
                <h4 className="text-sm font-black text-destructive mb-4">Sección de Egreso</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Fecha de egreso</label>
                    <input type="date" className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase">Motivo</label>
                    <select className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                      <option>Retiro voluntario</option>
                      <option>Traslado</option>
                      <option>Fallecimiento</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Nombre familiar que recibe</label>
                    <input type="text" className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black text-foreground mb-4">Firmas</h3>
              <div className="flex flex-wrap gap-8 justify-center">
                <SignaturePad label="Residente" />
                <SignaturePad label="Familiar Responsable" />
                <SignaturePad label="Coordinador" />
              </div>
            </div>
          </>
        )}
      </div>

      {selectedResident && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ExportButtons contentRef={contentRef} title={`HB-F3 Inventario ${residentName}`} fileName={`inventario_${residentName}`} textContent={`Inventario de Pertenencias - ${residentName}\nTotal: ${totalItems} elementos`} />
          <ShareButtons title={`HB-F3 Inventario ${residentName}`} text={`Inventario de Pertenencias - ${residentName}\nTotal: ${totalItems} elementos`} />
        </div>
      )}

      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default BelongingsInventory;
