import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import SignaturePad from "@/components/SignaturePad";

interface Props { onBack: () => void; }

const PaymentVoucher = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const y = new Date().getFullYear();
  const [provider, setProvider] = useState({ name: '', document: '', role: '', bank: '', account: '' });
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [items, setItems] = useState([{ fecha_turno: '', tipo_servicio: '', horas: '', valor_unitario: '', total: '' }]);
  const [retentions, setRetentions] = useState('0');
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const netPaid = subtotal - (parseFloat(retentions) || 0);

  const recalcItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'horas' || field === 'valor_unitario') {
      const h = parseFloat(updated[idx].horas) || 0;
      const v = parseFloat(updated[idx].valor_unitario) || 0;
      updated[idx].total = (h * v).toString();
    }
    setItems(updated);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const voucherNumber = `P-${y}-${String(Date.now()).slice(-4)}`;
    const { error } = await supabase.from('payment_vouchers').insert({
      voucher_number: voucherNumber, payment_date: paymentDate,
      provider_name: provider.name, provider_document: provider.document,
      provider_role: provider.role, provider_bank: provider.bank,
      provider_account: provider.account, items, subtotal,
      retentions: parseFloat(retentions) || 0, net_paid: netPaid,
      payment_method: paymentMethod, created_by: user.id,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Comprobante ${voucherNumber} creado` }); onBack(); }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="Comprobante de Pago a Cuidadores" subtitle="Registro de pagos por turnos y servicios" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">Datos del Prestador</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[{k:'name',l:'Nombre'},{k:'document',l:'Documento'},{k:'role',l:'Cargo'},{k:'bank',l:'Banco'},{k:'account',l:'Cuenta'}].map(f => (
            <div key={f.k}><label className="text-xs font-bold text-muted-foreground uppercase">{f.l}</label>
              <input value={provider[f.k as keyof typeof provider]} onChange={e => setProvider(p => ({...p,[f.k]:e.target.value}))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-4">Detalle de Turnos/Servicios</h3>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
            <input type="date" value={item.fecha_turno} onChange={e => recalcItem(i, 'fecha_turno', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Tipo servicio" value={item.tipo_servicio} onChange={e => recalcItem(i, 'tipo_servicio', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Horas" type="number" value={item.horas} onChange={e => recalcItem(i, 'horas', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Valor/hora" type="number" value={item.valor_unitario} onChange={e => recalcItem(i, 'valor_unitario', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs" />
            <input placeholder="Total" value={item.total} readOnly className="px-2 py-1.5 rounded-lg border border-input bg-muted text-xs font-bold" />
          </div>
        ))}
        <button onClick={() => setItems(p => [...p, { fecha_turno:'', tipo_servicio:'', horas:'', valor_unitario:'', total:'' }])} className="text-xs font-bold text-primary hover:underline mt-2">+ Agregar turno</button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Subtotal</label>
          <p className="text-lg font-black text-foreground">${subtotal.toLocaleString()}</p></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Retenciones</label>
          <input type="number" value={retentions} onChange={e => setRetentions(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Neto a Pagar</label>
          <p className="text-lg font-black text-primary">${netPaid.toLocaleString()}</p></div>
        <div><label className="text-xs font-bold text-muted-foreground uppercase">Forma de Pago</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-input bg-background text-sm">
            <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option>
          </select></div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6"><label className="text-xs font-bold text-muted-foreground uppercase">Fecha de Pago</label>
        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 w-full max-w-xs px-3 py-2 rounded-xl border border-input bg-background text-sm" /></div>

      <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-2 gap-6">
        <SignaturePad label="Prestador" /><SignaturePad label="Representante Legal" />
      </div>
      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default PaymentVoucher;
