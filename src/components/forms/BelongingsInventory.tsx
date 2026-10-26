import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveResidents } from "@/hooks/useActiveResidents";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SignaturePad from "@/components/SignaturePad";
import FormHistory from "@/components/FormHistory";
import { Section, Field, ChoiceChips, ResidentSelect, Notice, inputCls } from "@/components/forms/ui";
import { Check, Minus, Plus } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { todayLocal, blankToNull } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

const CATEGORIES: { title: string; items: string[]; presence?: boolean }[] = [
  { title: 'Vestuario', items: ['Pantalones/Sudaderas', 'Camisas/Camisetas', 'Ropa Interior/Medias', 'Sacos/Chaquetas', 'Pijamas', 'Calzado (pares)', 'Gorros/Bufandas'] },
  { title: 'Aseo / Salud', items: ['Jabón/Champú', 'Crema/Loción', 'Cepillo/Crema Dental', 'Pañales (paquetes)', 'Medicamentos (cajas)', 'Toallas', 'Cobijas/Almohada'] },
  { title: 'Documentos', items: ['Cédula Original', 'Carné EPS', 'Historia Clínica', 'Otros'], presence: true },
  { title: 'Valores / Joyas', items: ['Reloj/Cadena', 'Dinero en custodia'] },
];
const REASONS = [
  { value: 'ingreso' as const, label: '📥 Ingreso' },
  { value: 'actualizacion' as const, label: '🔄 Actualización' },
  { value: 'egreso' as const, label: '📤 Egreso' },
];
const EGRESS_REASONS = ['Retiro voluntario', 'Traslado', 'Fallecimiento'];

type Reason = 'ingreso' | 'egreso' | 'actualizacion';
type Items = Record<string, { qty: number; obs: string }>;

const BelongingsInventory = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents({ includeAll: true });
  const [residentId, setResidentId] = useState("");
  const [reason, setReason] = useState<Reason>('ingreso');
  const [items, setItems] = useState<Items>({});
  const [previous, setPrevious] = useState<{ reason: string; created_at: string; items: Items } | null>(null);
  const [egress, setEgress] = useState({ date: todayLocal(), reason: EGRESS_REASONS[0], familyName: '', familyDocument: '' });
  const [sigResident, setSigResident] = useState<string | null>(null);
  const [sigFamily, setSigFamily] = useState<string | null>(null);
  const [sigCoordinator, setSigCoordinator] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Last inventory: an egreso or update starts from what the resident already had
  useEffect(() => {
    setItems({});
    setPrevious(null);
    if (!residentId) return;
    supabase.from('belongings_inventory').select('reason, created_at, items').eq('resident_id', residentId)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        const last = data?.[0];
        if (!last) { setReason('ingreso'); return; }
        setPrevious({ reason: last.reason, created_at: last.created_at, items: (last.items ?? {}) as Items });
        const resident = residents.find(r => r.id === residentId);
        setReason(resident?.status === 'egresado' || resident?.status === 'fallecido' ? 'egreso' : 'actualizacion');
      });
  }, [residentId, residents]);

  const updateItem = (key: string, patch: Partial<{ qty: number; obs: string }>) =>
    setItems(prev => ({ ...prev, [key]: { ...(prev[key] ?? { qty: 0, obs: '' }), ...patch } }));

  const totalItems = Object.values(items).reduce((sum, i) => sum + (i.qty || 0), 0);
  const residentName = residents.find(r => r.id === residentId)?.full_name || '';
  const differences = previous ? Object.entries(previous.items).filter(([k, v]) => (v.qty || 0) > (items[k]?.qty || 0)) : [];

  const missing = [
    ...(residentId ? [] : ['residente']),
    ...(residentId && totalItems === 0 ? ['al menos un elemento'] : []),
    ...(reason === 'egreso' && !egress.familyName.trim() ? ['familiar que recibe'] : []),
  ];

  const handleSave = async () => {
    if (!residentId || !user || missing.length) return;
    setSaving(true);
    const kept = Object.fromEntries(Object.entries(items).filter(([, v]) => v.qty > 0 || v.obs.trim()));
    const isEgress = reason === 'egreso';
    const { error } = await supabase.from('belongings_inventory').insert({
      resident_id: residentId, created_by: user.id, reason,
      items: kept as unknown as Json, total_items: totalItems,
      signature_resident: sigResident, signature_family: isEgress ? null : sigFamily, signature_coordinator: isEgress ? null : sigCoordinator,
      egress_date: isEgress ? egress.date : null, egress_reason: isEgress ? egress.reason : null,
      egress_family_name: isEgress ? egress.familyName.trim() : null, egress_family_document: isEgress ? blankToNull(egress.familyDocument.trim()) : null,
      egress_signature_family: isEgress ? sigFamily : null, egress_signature_hogar: isEgress ? sigCoordinator : null,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Inventario guardado ✅", description: `${residentName}: ${totalItems} elementos` });
      setResidentId('');
      setSigResident(null); setSigFamily(null); setSigCoordinator(null);
    }
    setSaving(false);
  };

  const summary = `HB-F3 Inventario (${reason}) — ${residentName}\n${Object.entries(items).filter(([, v]) => v.qty > 0).map(([k, v]) => `• ${k.split('_').slice(1).join('_')}: ${v.qty}${v.obs ? ` (${v.obs})` : ''}`).join('\n')}\nTotal: ${totalItems}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F3: Inventario de Pertenencias" subtitle="Lo que trae el residente al ingresar y lo que se entrega al salir" onBack={onBack} />
      <div ref={contentRef}>
        <Section>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Residente" required>
              <ResidentSelect residents={residents} loading={loading} value={residentId} onChange={setResidentId} />
            </Field>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Motivo</span>
              <ChoiceChips size="sm" options={REASONS} value={reason} onChange={setReason} />
            </div>
          </div>
          {previous && (
            <div className="mt-3">
              <Notice>
                Último inventario: {previous.reason} del {new Date(previous.created_at).toLocaleDateString('es-CO')}.
                <button type="button" onClick={() => setItems(Object.fromEntries(Object.entries(previous.items).map(([k, v]) => [k, { qty: v.qty || 0, obs: v.obs || '' }])))}
                  className="ml-2 font-bold text-primary underline">Cargar ese inventario</button>
              </Notice>
            </div>
          )}
        </Section>

        {residentId && (
          <>
            <div className="sticky top-2 z-10 mb-4 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow">
              <span className="text-sm font-bold">Total de elementos</span>
              <span className="text-2xl font-black">{totalItems}</span>
            </div>

            {CATEGORIES.map(cat => (
              <Section key={cat.title} title={cat.title}>
                <div className="space-y-2">
                  {cat.items.map(item => {
                    const key = `${cat.title}_${item}`;
                    const val = items[key] ?? { qty: 0, obs: '' };
                    return (
                      <div key={key} className={`rounded-xl border-2 p-2 ${val.qty > 0 ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                        <div className="flex min-h-[44px] items-center gap-2">
                          <span className="flex-1 text-sm font-medium">{item}</span>
                          {cat.presence ? (
                            <button type="button" onClick={() => updateItem(key, { qty: val.qty > 0 ? 0 : 1 })} aria-pressed={val.qty > 0}
                              className={`flex min-h-[40px] items-center gap-1 rounded-xl border-2 px-3 text-xs font-bold ${val.qty > 0 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700' : 'border-border text-muted-foreground'}`}>
                              {val.qty > 0 && <Check size={14} />} {val.qty > 0 ? 'Presente' : 'No trae'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button type="button" aria-label={`Menos ${item}`} onClick={() => updateItem(key, { qty: Math.max(0, val.qty - 1) })}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Minus size={15} /></button>
                              <span className="w-9 text-center text-base font-black">{val.qty}</span>
                              <button type="button" aria-label={`Más ${item}`} onClick={() => updateItem(key, { qty: val.qty + 1 })}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Plus size={15} /></button>
                            </div>
                          )}
                        </div>
                        {val.qty > 0 && (
                          <input value={val.obs} onChange={e => updateItem(key, { obs: e.target.value })} placeholder="Detalle (color, marca, estado)"
                            className={`${inputCls} mt-1`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            ))}

            {reason !== 'ingreso' && differences.length > 0 && (
              <div className="mb-5"><Notice tone="warning">Frente al inventario anterior hay menos: {differences.map(([k, v]) => `${k.split('_').slice(1).join(' ')} (${v.qty} → ${items[k]?.qty || 0})`).join(', ')}. Anote el motivo en el detalle.</Notice></div>
            )}

            {reason === 'egreso' && (
              <Section title="Entrega por egreso" className="border-destructive/30">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Fecha de egreso">
                    <input type="date" value={egress.date} onChange={e => setEgress(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                  </Field>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Motivo</span>
                    <ChoiceChips size="sm" options={EGRESS_REASONS.map(r => ({ value: r, label: r }))} value={egress.reason} onChange={v => setEgress(p => ({ ...p, reason: v }))} />
                  </div>
                  <Field label="Familiar que recibe" required>
                    <input value={egress.familyName} onChange={e => setEgress(p => ({ ...p, familyName: e.target.value }))} className={inputCls} />
                  </Field>
                  <Field label="Documento del familiar">
                    <input value={egress.familyDocument} inputMode="numeric" onChange={e => setEgress(p => ({ ...p, familyDocument: e.target.value }))} className={inputCls} />
                  </Field>
                </div>
              </Section>
            )}

            <Section title="Firmas">
              <div className="flex flex-wrap justify-center gap-8">
                {reason !== 'egreso' && <SignaturePad label="Residente" value={sigResident || undefined} onChange={setSigResident} />}
                <SignaturePad label={reason === 'egreso' ? 'Familiar que recibe' : 'Familiar responsable'} value={sigFamily || undefined} onChange={setSigFamily} />
                <SignaturePad label={reason === 'egreso' ? 'Hogar Belén entrega' : 'Coordinador'} value={sigCoordinator || undefined} onChange={setSigCoordinator} />
              </div>
            </Section>
          </>
        )}
      </div>

      {residentId && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ExportButtons contentRef={contentRef} title={`HB-F3 Inventario ${residentName}`} fileName={`inventario_${residentName}`} textContent={summary} />
          <ShareButtons title={`HB-F3 Inventario ${residentName}`} text={summary} />
          <FormHistory tableName="belongings_inventory" title="Inventarios anteriores" fileName="hist_inventario" days={3650}
            filters={[['resident_id', 'eq', residentId]]}
            columns={[
              { key: 'created_at', label: 'Fecha', render: (v) => v ? new Date(String(v)).toLocaleDateString('es-CO') : '-' },
              { key: 'reason', label: 'Motivo' }, { key: 'total_items', label: 'Elementos' }, { key: 'egress_family_name', label: 'Recibió' },
            ]} />
        </div>
      )}

      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} label="Guardar inventario" />
    </div>
  );
};

export default BelongingsInventory;
