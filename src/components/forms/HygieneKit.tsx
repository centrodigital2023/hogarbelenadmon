import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveResidents } from "@/hooks/useActiveResidents";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import { Section, Field, ResidentSelect, Notice, ProgressLine, inputCls } from "@/components/forms/ui";
import { Check, Minus, Package, Plus } from "lucide-react";
import type { Row } from "@/integrations/supabase/tables";
import type { Json } from "@/integrations/supabase/types";
import { todayLocal, daysBetween, relativeDay } from "@/lib/form-helpers";

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

type KitItem = { checked: boolean; qty: number; obs: string };
type KitItems = Record<string, KitItem>;

const emptyItems = (): KitItems => Object.fromEntries(KIT_ITEMS.map(i => [i.key, { checked: false, qty: 1, obs: '' }]));

const HygieneKit = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const [residentId, setResidentId] = useState("");
  const [kitDate, setKitDate] = useState(todayLocal());
  const [items, setItems] = useState<KitItems>(emptyItems);
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Row<"hygiene_kits">[]>([]);

  useEffect(() => {
    setItems(emptyItems());
    setObservations('');
    if (!residentId) { setHistory([]); return; }
    supabase.from('hygiene_kits').select('*').eq('resident_id', residentId)
      .order('kit_date', { ascending: false }).limit(12)
      .then(({ data }) => setHistory(data ?? []));
  }, [residentId]);

  const last = history[0];
  const lastItems = (last?.items ?? {}) as Record<string, Partial<KitItem>>;
  const daysSinceLast = last?.kit_date ? daysBetween(last.kit_date, todayLocal()) : null;

  const updateItem = (key: string, patch: Partial<KitItem>) => setItems(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // Same articles and quantities as last month, ready to adjust
  const repeatLast = () => setItems(Object.fromEntries(KIT_ITEMS.map(i => {
    const prev = lastItems[i.key];
    return [i.key, { checked: !!prev?.checked, qty: prev?.qty || 1, obs: '' }];
  })));

  const checked = KIT_ITEMS.filter(i => items[i.key]?.checked);
  const residentName = residents.find(r => r.id === residentId)?.full_name || '';
  const missing = [...(residentId ? [] : ['residente']), ...(residentId && !checked.length ? ['artículos entregados'] : [])];

  const handleSave = async () => {
    if (!residentId || !user || missing.length) return;
    setSaving(true);
    const delivered = Object.fromEntries(checked.map(i => [i.key, items[i.key]]));
    const { error } = await supabase.from('hygiene_kits').insert({
      resident_id: residentId, created_by: user.id, kit_date: kitDate, items: delivered as unknown as Json, observations: observations.trim() || null,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Kit entregado ✅", description: `${residentName}: ${checked.length} artículos` });
      setResidentId('');
    }
    setSaving(false);
  };

  const summary = `Kit de aseo — ${residentName} — ${kitDate}\n${checked.map(i => `• ${i.label}: ${items[i.key].qty} ${i.unit}${items[i.key].obs ? ` (${items[i.key].obs})` : ''}`).join('\n')}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="Kit de Aseo Mensual" subtitle="Entrega de artículos de higiene personal" onBack={onBack} />
      <div ref={contentRef}>
        <Section>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Residente" required>
              <ResidentSelect residents={residents} loading={loading} value={residentId} onChange={setResidentId} />
            </Field>
            <Field label="Fecha de entrega">
              <input type="date" value={kitDate} max={todayLocal()} onChange={e => setKitDate(e.target.value)} className={inputCls} />
            </Field>
          </div>
          {residentId && (
            <div className="mt-3">
              {last?.kit_date ? (
                <Notice tone={daysSinceLast !== null && daysSinceLast < 25 ? 'warning' : 'info'}>
                  Última entrega {relativeDay(last.kit_date)} ({last.kit_date}).
                  {daysSinceLast !== null && daysSinceLast < 25 ? ' Aún no se cumple el mes: confirme que se necesita.' : ''}
                  <button type="button" onClick={repeatLast} className="ml-2 font-bold text-primary underline">Repetir lo de esa vez</button>
                </Notice>
              ) : <Notice>Primera entrega registrada para este residente.</Notice>}
            </div>
          )}
        </Section>

        {residentId && (
          <>
            <Section title="Artículos" icon={Package}
              actions={<button type="button" onClick={() => setItems(prev => Object.fromEntries(KIT_ITEMS.map(i => [i.key, { ...prev[i.key], checked: true }])))}
                className="min-h-[36px] rounded-xl bg-muted px-3 text-xs font-bold hover:bg-accent">Kit completo</button>}>
              <div className="mb-3"><ProgressLine done={checked.length} total={KIT_ITEMS.length} label="artículos" /></div>
              <div className="space-y-2">
                {KIT_ITEMS.map(item => {
                  const it = items[item.key];
                  return (
                    <div key={item.key} className={`rounded-xl border-2 p-2 transition ${it?.checked ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border'}`}>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateItem(item.key, { checked: !it?.checked })} aria-pressed={it?.checked}
                          className="flex min-h-[44px] flex-1 items-center gap-3 text-left">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${it?.checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-input'}`}>
                            {it?.checked && <Check size={16} strokeWidth={3} />}
                          </span>
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                        {it?.checked && (
                          <div className="flex items-center gap-1">
                            <button type="button" aria-label="Menos" onClick={() => updateItem(item.key, { qty: Math.max(1, it.qty - 1) })} className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Minus size={14} /></button>
                            <span className="w-12 text-center text-sm font-black">{it.qty} <span className="text-[10px] font-medium text-muted-foreground">{item.unit}</span></span>
                            <button type="button" aria-label="Más" onClick={() => updateItem(item.key, { qty: Math.min(99, it.qty + 1) })} className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Plus size={14} /></button>
                          </div>
                        )}
                      </div>
                      {it?.checked && (
                        <input placeholder="Observación (opcional)" value={it.obs} onChange={e => updateItem(item.key, { obs: e.target.value })} className={`${inputCls} mt-1`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
            <Section>
              <Field label="Observaciones generales">
                <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Ej.: la familia trae el shampoo" />
              </Field>
            </Section>
            {history.length > 1 && (
              <details className="mb-5">
                <summary className="cursor-pointer text-sm font-bold text-foreground">Entregas anteriores ({history.length})</summary>
                <div className="mt-2 space-y-1">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-xs">
                      <span className="font-medium">{h.kit_date}</span>
                      <span className="text-muted-foreground">{Object.values((h.items ?? {}) as Record<string, { checked?: boolean }>).filter(i => i.checked).length} artículos</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
      {residentId && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ExportButtons contentRef={contentRef} title={`Kit Aseo ${residentName}`} fileName={`kit_aseo_${residentName}_${kitDate}`} textContent={summary} />
          <ShareButtons title={`Kit Aseo ${residentName}`} text={summary} />
        </div>
      )}
      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} label="Registrar entrega" />
    </div>
  );
};

export default HygieneKit;
