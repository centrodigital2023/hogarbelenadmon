import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFormDraft } from "@/hooks/useFormDraft";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import DraftNotice from "@/components/DraftNotice";
import ExportButtons from "@/components/ExportButtons";
import SignaturePad from "@/components/SignaturePad";
import { Section, Field, ChoiceChips, Notice, inputCls, smallInputCls } from "@/components/forms/ui";
import { Plus, Receipt, Trash2, UserRound } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import type { Row } from "@/integrations/supabase/tables";
import { todayLocal, numberOrNull, formatCOP, blankToNull } from "@/lib/form-helpers";
import { nextVoucherNumber } from "@/lib/form-rules";

interface Props { onBack: () => void; }

type Item = { fecha_turno: string; tipo_servicio: string; horas: string; valor_unitario: string; total: string };
type Provider = { name: string; document: string; role: string; bank: string; account: string };
type VoucherForm = { provider: Provider; payment_date: string; payment_method: string; items: Item[]; retentions: string };

const emptyItem = (): Item => ({ fecha_turno: '', tipo_servicio: '', horas: '', valor_unitario: '', total: '' });
const emptyForm = (): VoucherForm => ({
  provider: { name: '', document: '', role: '', bank: '', account: '' },
  payment_date: todayLocal(), payment_method: 'transferencia', items: [emptyItem()], retentions: '',
});

const METHODS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];
const SERVICES = ['Turno día', 'Turno noche', 'Turno 24 h', 'Acompañamiento cita', 'Reemplazo'];

const itemTotal = (i: Item) => (numberOrNull(i.horas) ?? 0) * (numberOrNull(i.valor_unitario) ?? 0);

const PaymentVoucher = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [recent, setRecent] = useState<Row<"payment_vouchers">[]>([]);
  const [saving, setSaving] = useState(false);
  const [sigKey, setSigKey] = useState(0);
  const draft = useFormDraft('comprobante-pago', form, setForm, d => !d.provider.name && d.items.every(i => !i.horas && !i.tipo_servicio));

  const loadRecent = useCallback(() => {
    supabase.from('payment_vouchers').select('*').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setRecent(data ?? []));
  }, []);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  const year = Number(form.payment_date.slice(0, 4)) || new Date().getFullYear();
  const latestOfYear = recent.map(v => v.voucher_number).filter(n => n.startsWith(`P-${year}-`)).sort().pop();
  const voucherNumber = nextVoucherNumber(year, latestOfYear);

  const providers = [...new Map(recent.map(v => [v.provider_name.trim().toLowerCase(), v])).values()];
  const setProvider = (k: keyof Provider, v: string) => setForm(p => ({ ...p, provider: { ...p.provider, [k]: v } }));
  // Picking a known caregiver fills in their document and bank details
  const pickProvider = (name: string) => {
    const known = providers.find(v => v.provider_name.trim().toLowerCase() === name.trim().toLowerCase());
    setForm(p => ({ ...p, provider: known ? {
      name: known.provider_name, document: known.provider_document ?? '', role: known.provider_role ?? '',
      bank: known.provider_bank ?? '', account: known.provider_account ?? '',
    } : { ...p.provider, name } }));
  };

  const setItem = (idx: number, patch: Partial<Item>) => setForm(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const subtotal = form.items.reduce((s, i) => s + itemTotal(i), 0);
  const retentions = numberOrNull(form.retentions) ?? 0;
  const netPaid = subtotal - retentions;
  const filled = form.items.filter(i => itemTotal(i) > 0);
  const missing = [
    ...(form.provider.name.trim() ? [] : ['nombre del prestador']),
    ...(form.provider.document.trim() ? [] : ['documento']),
    ...(filled.length ? [] : ['al menos un turno con horas y valor']),
    ...(retentions > subtotal ? ['retenciones mayores al subtotal'] : []),
    ...(form.payment_method === 'transferencia' && !form.provider.account.trim() ? ['cuenta para la transferencia'] : []),
  ];

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const { provider } = form;
    const { error } = await supabase.from('payment_vouchers').insert({
      voucher_number: voucherNumber, payment_date: form.payment_date,
      provider_name: provider.name.trim(), provider_document: provider.document.trim(),
      provider_role: blankToNull(provider.role.trim()), provider_bank: blankToNull(provider.bank.trim()),
      provider_account: blankToNull(provider.account.trim()),
      items: filled.map(i => ({ ...i, total: String(itemTotal(i)) })) as unknown as Json,
      subtotal, retentions, net_paid: netPaid, payment_method: form.payment_method, created_by: user.id,
    });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Comprobante ${voucherNumber} creado ✅`, description: `${provider.name}: ${formatCOP(netPaid)}` });
      draft.clear();
      setForm(emptyForm());
      setSigKey(k => k + 1);
      loadRecent();
    }
    setSaving(false);
  };

  const text = `Comprobante ${voucherNumber} — ${form.payment_date}\nPrestador: ${form.provider.name} (${form.provider.document})\n${filled.map(i => `• ${i.fecha_turno} ${i.tipo_servicio}: ${i.horas} h × ${formatCOP(numberOrNull(i.valor_unitario) ?? 0)} = ${formatCOP(itemTotal(i))}`).join('\n')}\nSubtotal ${formatCOP(subtotal)} · Retenciones ${formatCOP(retentions)} · Neto ${formatCOP(netPaid)}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="Comprobante de Pago a Cuidadores" subtitle="Registro de pagos por turnos y servicios" onBack={onBack} />
      <DraftNotice restoredAt={draft.restoredAt} onDiscard={() => { draft.clear(); setForm(emptyForm()); }} />

      <div ref={contentRef}>
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-primary/5 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-black text-foreground"><Receipt size={18} className="text-primary" /> {voucherNumber}</span>
          <input type="date" value={form.payment_date} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} aria-label="Fecha de pago"
            className="min-h-[40px] rounded-xl border border-input bg-background px-2 text-base sm:text-sm" />
        </div>

        <Section title="Prestador" icon={UserRound} hint={providers.length ? 'Escriba el nombre: si ya le pagaron antes, se llenan sus datos.' : undefined}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" required>
              <input list="hb-pv-providers" value={form.provider.name} onChange={e => pickProvider(e.target.value)} className={inputCls} />
              <datalist id="hb-pv-providers">{providers.map(v => <option key={v.id} value={v.provider_name} />)}</datalist>
            </Field>
            <Field label="Documento" required>
              <input inputMode="numeric" value={form.provider.document} onChange={e => setProvider('document', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Cargo">
              <input value={form.provider.role} onChange={e => setProvider('role', e.target.value)} placeholder="Ej.: Cuidadora" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Banco"><input value={form.provider.bank} onChange={e => setProvider('bank', e.target.value)} placeholder="Ej.: Nequi" className={inputCls} /></Field>
              <Field label="Cuenta"><input inputMode="numeric" value={form.provider.account} onChange={e => setProvider('account', e.target.value)} className={inputCls} /></Field>
            </div>
          </div>
        </Section>

        <Section title="Turnos y servicios">
          <div className="space-y-3">
            {form.items.map((it, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.4fr_0.7fr_1fr_auto]">
                  <input type="date" aria-label="Fecha del turno" value={it.fecha_turno} onChange={e => setItem(i, { fecha_turno: e.target.value })} className={smallInputCls} />
                  <input list="hb-pv-services" placeholder="Servicio" value={it.tipo_servicio} onChange={e => setItem(i, { tipo_servicio: e.target.value })} className={smallInputCls} />
                  <input inputMode="decimal" placeholder="Horas" value={it.horas} onChange={e => setItem(i, { horas: e.target.value })} className={smallInputCls} />
                  <input inputMode="numeric" placeholder="Valor por hora" value={it.valor_unitario} onChange={e => setItem(i, { valor_unitario: e.target.value })} className={smallInputCls} />
                  <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1">
                    <span className="text-sm font-black text-foreground">{formatCOP(itemTotal(it))}</span>
                    {form.items.length > 1 && (
                      <button type="button" aria-label="Quitar turno" onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <datalist id="hb-pv-services">{SERVICES.map(s => <option key={s} value={s} />)}</datalist>
          <button type="button" onClick={() => setForm(p => {
            const last = p.items[p.items.length - 1];
            // A new row repeats the service and rate of the previous one
            return { ...p, items: [...p.items, { ...emptyItem(), tipo_servicio: last?.tipo_servicio ?? '', horas: last?.horas ?? '', valor_unitario: last?.valor_unitario ?? '' }] };
          })} className="mt-3 flex min-h-[40px] items-center gap-2 text-xs font-bold text-primary"><Plus size={16} /> Agregar turno</button>
        </Section>

        <Section title="Pago">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Subtotal</span><p className="mt-1 text-xl font-black text-foreground">{formatCOP(subtotal)}</p></div>
            <Field label="Retenciones">
              <input inputMode="numeric" value={form.retentions} onChange={e => setForm(p => ({ ...p, retentions: e.target.value }))} placeholder="0" className={inputCls} />
            </Field>
            <div><span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Neto a pagar</span><p className="mt-1 text-2xl font-black text-primary">{formatCOP(netPaid)}</p></div>
          </div>
          {retentions > subtotal && <div className="mt-3"><Notice tone="danger">Las retenciones no pueden superar el subtotal.</Notice></div>}
          <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Forma de pago</span>
            <ChoiceChips options={METHODS} value={form.payment_method} onChange={v => setForm(p => ({ ...p, payment_method: v }))} />
          </div>
        </Section>

        <Section title="Firmas" hint="Se imprimen en el PDF del comprobante.">
          <div key={sigKey} className="flex flex-wrap justify-center gap-6">
            <SignaturePad label="Prestador" /><SignaturePad label="Representante legal" />
          </div>
        </Section>
      </div>

      <div className="mb-4"><ExportButtons contentRef={contentRef} title={`Comprobante ${voucherNumber}`} fileName={`comprobante_${voucherNumber}`} textContent={text} /></div>

      {recent.length > 0 && (
        <details className="mb-5">
          <summary className="cursor-pointer text-sm font-bold text-foreground">Comprobantes recientes ({recent.length})</summary>
          <div className="mt-2 space-y-1">
            {recent.map(v => (
              <div key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs">
                <span className="font-medium">{v.voucher_number} · {v.payment_date} · {v.provider_name}</span>
                <span className="shrink-0 font-bold">{formatCOP(Number(v.net_paid ?? 0))}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <ActionButtons onFinish={handleSave} saving={saving} missing={missing} label="Crear comprobante" draftSavedAt={draft.savedAt} />
    </div>
  );
};

export default PaymentVoucher;
