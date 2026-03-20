import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import { DollarSign, Plus, FileText, Printer, User, Calendar, Trash2, Edit } from "lucide-react";

interface Props { onBack: () => void; }

const BillingModule = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [period, setPeriod] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState([{ description: 'Alojamiento y cuidado (pensión mensual)', qty: 1, price: 0 }]);
  const [paymentMethod, setPaymentMethod] = useState("transferencia");

  useEffect(() => {
    supabase.from('invoices').select('*, residents(full_name)').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setInvoices(data); });
    supabase.from('residents').select('id, full_name, responsible_family_name, responsible_family_phone')
      .in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, price: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
  const total = subtotal; // IVA exento

  const generateNumber = () => {
    const year = new Date().getFullYear();
    const num = String(invoices.length + 1).padStart(3, '0');
    return `${year}-${num}`;
  };

  const handleSave = async () => {
    if (!user || !selectedResident) return;
    const { error } = await supabase.from('invoices').insert({
      created_by: user.id,
      resident_id: selectedResident,
      invoice_number: generateNumber(),
      period, due_date: dueDate || null,
      items: items as any,
      subtotal, tax: 0, total,
      payment_method: paymentMethod,
      status: 'pendiente',
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Factura creada", description: `Total: $${total.toLocaleString('es-CO')}` });
      setView('list');
      supabase.from('invoices').select('*, residents(full_name)').order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setInvoices(data); });
    }
  };

  const markPaid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'pagada' }).eq('id', id);
    toast({ title: "Factura marcada como pagada" });
    supabase.from('invoices').select('*, residents(full_name)').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setInvoices(data); });
  };

  if (view === 'create') {
    return (
      <div className="animate-fade-in">
        <FormHeader title="Nueva Factura de Cobro" subtitle="Generar factura para familiar" onBack={() => setView('list')} />
        <div className="space-y-6 max-w-3xl">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
                <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                  <option value="">-- Seleccionar --</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Período</label>
                <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="Ej: Marzo 2026"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Fecha de vencimiento</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Forma de pago</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-black mb-4">Detalle de servicios</h3>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <div className="col-span-6">
                  <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="Descripción" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div className="col-span-2">
                  <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-center" />
                </div>
                <div className="col-span-3">
                  <input type="number" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" placeholder="$ Valor" />
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && <button onClick={() => removeItem(idx)} className="text-destructive"><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
            <button onClick={addItem} className="text-xs text-primary font-bold mt-2 flex items-center gap-1">
              <Plus size={12} /> Agregar ítem
            </button>
            <div className="border-t border-border mt-4 pt-4 text-right">
              <p className="text-sm text-muted-foreground">Subtotal: <span className="font-bold text-foreground">${subtotal.toLocaleString('es-CO')}</span></p>
              <p className="text-sm text-muted-foreground">IVA: <span className="font-bold text-foreground">Exento</span></p>
              <p className="text-lg font-black text-foreground mt-1">Total: ${total.toLocaleString('es-CO')}</p>
            </div>
          </div>

          <button onClick={handleSave} disabled={!selectedResident || total <= 0}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
            Generar Factura
          </button>
        </div>
      </div>
    );
  }

  const exportData = invoices.map(i => ({
    Número: i.invoice_number,
    Residente: i.residents?.full_name,
    Período: i.period,
    Total: i.total,
    Estado: i.status,
    Fecha: new Date(i.created_at).toLocaleDateString('es-CO'),
  }));

  return (
    <div className="animate-fade-in">
      <FormHeader title="Facturación" subtitle="Facturas de cobro y control financiero" onBack={onBack} />

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => setView('create')}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold min-h-[48px] flex items-center gap-2">
          <Plus size={14} /> Nueva factura
        </button>
        <ExportButtons contentRef={contentRef} title="Facturas" fileName="facturas" data={exportData} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-bold uppercase">Total facturado</p>
          <p className="text-2xl font-black text-foreground">${invoices.reduce((s, i) => s + (i.total || 0), 0).toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-bold uppercase">Pendientes</p>
          <p className="text-2xl font-black text-cat-fragility">{invoices.filter(i => i.status === 'pendiente').length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-bold uppercase">Pagadas</p>
          <p className="text-2xl font-black text-cat-nutritional">{invoices.filter(i => i.status === 'pagada').length}</p>
        </div>
      </div>

      {/* Invoice list */}
      <div ref={contentRef} className="space-y-2">
        {invoices.map(inv => (
          <div key={inv.id} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{inv.invoice_number} - {inv.residents?.full_name}</p>
              <p className="text-[10px] text-muted-foreground">{inv.period} • ${(inv.total || 0).toLocaleString('es-CO')}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${inv.status === 'pagada' ? 'bg-cat-nutritional/10 text-cat-nutritional' : 'bg-cat-fragility/10 text-cat-fragility'}`}>
              {inv.status?.toUpperCase()}
            </span>
            {inv.status === 'pendiente' && (
              <button onClick={() => markPaid(inv.id)} className="text-xs font-bold text-cat-nutritional hover:underline">Pagar</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillingModule;
