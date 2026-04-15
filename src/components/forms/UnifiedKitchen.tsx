import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";
import FormHistory from "@/components/FormHistory";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import { useRef } from "react";

interface Props { onBack: () => void; }

const CHECKLIST_ITEMS = [
  { key: 'used_ppe', label: 'Usé gorro, tapabocas y delantal limpio' },
  { key: 'respected_diets', label: 'Respeté las dietas especiales de cada residente' },
  { key: 'washed_produce', label: 'Lavé y desinfecté frutas y verduras' },
  { key: 'cleaned_kitchen', label: 'Limpié y desinfecté toda la cocina al terminar' },
];

const FRIDGES = ['Nevera principal', 'Nevera medicamentos', 'Congelador'];
const DISINFECTION_AREAS = ['Mesones', 'Estufa', 'Lavaplatos', 'Pisos', 'Paredes', 'Campana extractora', 'Utensilios'];

const UnifiedKitchen = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'checklist' | 'temperature' | 'disinfection'>('checklist');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('mañana');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [checkObs, setCheckObs] = useState("");
  const [temps, setTemps] = useState<Record<string, { temp: string; safe: boolean; notes: string }>>(
    Object.fromEntries(FRIDGES.map(f => [f, { temp: '', safe: true, notes: '' }]))
  );
  const [disinfection, setDisinfection] = useState<Record<string, boolean>>(
    Object.fromEntries(DISINFECTION_AREAS.map(a => [a, false]))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const promises = [];

    promises.push(supabase.from('kitchen_checklists').insert({
      created_by: user.id, check_date: checkDate,
      used_ppe: checks.used_ppe || false, respected_diets: checks.respected_diets || false,
      washed_produce: checks.washed_produce || false, cleaned_kitchen: checks.cleaned_kitchen || false,
      observations: checkObs,
    }));

    for (const [name, data] of Object.entries(temps)) {
      if (data.temp) {
        const t = parseFloat(data.temp);
        promises.push(supabase.from('fridge_temps').insert({
          created_by: user.id, record_date: checkDate, fridge_name: name,
          shift, temperature: t, is_safe: t >= 0 && t <= 5, notes: data.notes,
        }));
      }
    }

    for (const [area, completed] of Object.entries(disinfection)) {
      promises.push(supabase.from('disinfection_records').insert({
        created_by: user.id, record_date: checkDate, area,
        completed, record_type: 'cocina',
      }));
    }

    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);
    if (hasError) toast({ title: "Error al guardar algunos registros", variant: "destructive" });
    else { toast({ title: "Control diario de cocina guardado ✅" }); onBack(); }
    setSaving(false);
  };

  const tabs = [
    { k: 'checklist', l: '✅ Checklist', count: Object.values(checks).filter(Boolean).length },
    { k: 'temperature', l: '🌡️ Temperaturas', count: Object.values(temps).filter(t => t.temp).length },
    { k: 'disinfection', l: '🧹 Desinfección', count: Object.values(disinfection).filter(Boolean).length },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="Control Diario de Cocina" subtitle="HB-F5 + HB-F7 + HB-F8 unificados" onBack={onBack} />

      <div ref={contentRef}>
        {/* Date & Shift */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fecha</label>
            <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Turno</label>
            <select value={shift} onChange={e => setShift(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 transition-all">
              <option value="mañana">Mañana</option><option value="tarde">Tarde</option><option value="noche">Noche</option>
            </select>
          </div>
        </div>

        {/* Premium Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] ${
                tab === t.k 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}>
              {t.l}
              {t.count > 0 && (
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  tab === t.k ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'checklist' && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mt-4 space-y-3 shadow-sm">
            {CHECKLIST_ITEMS.map(item => (
              <label key={item.key} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                checks[item.key] ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border hover:border-primary/20'
              }`}>
                <input type="checkbox" checked={checks[item.key] || false}
                  onChange={e => setChecks(p => ({...p, [item.key]: e.target.checked}))}
                  className="w-5 h-5 rounded accent-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </label>
            ))}
            <textarea value={checkObs} onChange={e => setCheckObs(e.target.value)} placeholder="Observaciones..."
              rows={2} className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20" />
          </div>
        )}

        {tab === 'temperature' && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mt-4 space-y-4 shadow-sm">
            {FRIDGES.map(fridge => {
              const data = temps[fridge];
              const t = parseFloat(data?.temp || '');
              const unsafe = !isNaN(t) && (t < 0 || t > 5);
              return (
                <div key={fridge} className={`p-4 rounded-xl border-2 transition-all ${
                  unsafe ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                }`}>
                  <p className="text-sm font-bold text-foreground mb-3">{fridge}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Temperatura (°C)</label>
                      <input type="number" step="0.1" value={data?.temp || ''}
                        onChange={e => setTemps(p => ({...p, [fridge]: {...p[fridge], temp: e.target.value}}))}
                        className="mt-1 w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground font-medium">Notas</label>
                      <input value={data?.notes || ''}
                        onChange={e => setTemps(p => ({...p, [fridge]: {...p[fridge], notes: e.target.value}}))}
                        className="mt-1 w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm" />
                    </div>
                  </div>
                  {unsafe && <p className="text-xs font-bold text-destructive mt-2">⚠️ Temperatura fuera de rango seguro (0-5°C)</p>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'disinfection' && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mt-4 space-y-3 shadow-sm">
            {DISINFECTION_AREAS.map(area => (
              <label key={area} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                disinfection[area] ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border hover:border-primary/20'
              }`}>
                <input type="checkbox" checked={disinfection[area] || false}
                  onChange={e => setDisinfection(p => ({...p, [area]: e.target.checked}))}
                  className="w-5 h-5 rounded accent-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{area}</span>
              </label>
            ))}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mt-6 shadow-sm">
          <SignaturePad label="Responsable Cocina" />
        </div>
      </div>

      {/* Export & Share */}
      <div className="flex flex-wrap items-center gap-3">
        <ExportButtons contentRef={contentRef} title="Control Diario Cocina"
          fileName={`cocina_${checkDate}`} textContent={`Control Cocina ${checkDate}\nTurno: ${shift}`} />
        <ShareButtons title="Control Diario Cocina" text={`Control Cocina ${checkDate} - Turno: ${shift}`} />
      </div>

      {/* History sections */}
      <div className="space-y-4">
        <FormHistory tableName="kitchen_checklists" title="Historial Checklist Cocina" fileName="hist_checklist_cocina"
          columns={[
            { key: 'check_date', label: 'Fecha' },
            { key: 'used_ppe', label: 'EPP', render: (v: boolean) => v ? '✅' : '❌' },
            { key: 'respected_diets', label: 'Dietas', render: (v: boolean) => v ? '✅' : '❌' },
            { key: 'washed_produce', label: 'Lavado', render: (v: boolean) => v ? '✅' : '❌' },
            { key: 'cleaned_kitchen', label: 'Limpieza', render: (v: boolean) => v ? '✅' : '❌' },
            { key: 'observations', label: 'Obs' },
          ]}
          dateColumn="check_date"
          editableFields={[{ key: 'observations', label: 'Observaciones', type: 'text' }]}
        />
        <FormHistory tableName="fridge_temps" title="Historial Temperaturas" fileName="hist_temperaturas"
          columns={[
            { key: 'record_date', label: 'Fecha' },
            { key: 'fridge_name', label: 'Nevera' },
            { key: 'shift', label: 'Turno' },
            { key: 'temperature', label: '°C' },
            { key: 'is_safe', label: 'Segura', render: (v: boolean) => v ? '✅' : '⚠️' },
            { key: 'notes', label: 'Notas' },
          ]}
          dateColumn="record_date"
          editableFields={[
            { key: 'temperature', label: 'Temperatura', type: 'number' },
            { key: 'notes', label: 'Notas', type: 'text' },
          ]}
        />
        <FormHistory tableName="disinfection_records" title="Historial Desinfección" fileName="hist_desinfeccion"
          columns={[
            { key: 'record_date', label: 'Fecha' },
            { key: 'area', label: 'Área' },
            { key: 'completed', label: 'Completado', render: (v: boolean) => v ? '✅' : '❌' },
          ]}
          dateColumn="record_date"
          filters={[['record_type', 'eq', 'cocina']]}
        />
      </div>

      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default UnifiedKitchen;
