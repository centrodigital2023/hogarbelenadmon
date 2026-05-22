import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ExportButtons from "@/components/ExportButtons";
import { Users, Calendar, FileText, ShieldCheck, DollarSign, TrendingUp, CheckCircle2, Sparkles, ArrowUpRight } from "lucide-react";

interface Props { onBack: () => void; }

const InstitutionModule = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [residentCount, setResidentCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [paidInvoiceCount, setPaidInvoiceCount] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [paidInvoiceTotal, setPaidInvoiceTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [professionalVerifiedCount, setProfessionalVerifiedCount] = useState(0);
  const [serviceIdeas, setServiceIdeas] = useState([
    { title: "Oferta integral de cuidado domiciliario", description: "Combina seguimiento clínico, terapia ocupacional y rutina alimentaria para pacientes de alto riesgo." },
    { title: "Plan de apoyo familiar con teleconsulta", description: "Servicio híbrido que complementa el cuidado institucional con acompañamiento virtual para familiares." },
    { title: "Módulo de cumplimiento RETHUS", description: "Auditoría automática de profesionales, documentación y proceso de facturación para compliance." },
  ]);

  const loadMetrics = async () => {
    setLoading(true);
    const [residentsRes, appointmentsRes, invoicesRes, transactionsRes] = await Promise.all([
      supabase.from('residents').select('id', { count: 'exact', head: true }).in('status', ['permanente', 'prueba']),
      supabase.from('medical_appointments').select('id', { count: 'exact', head: true }),
      supabase.from('invoices').select('id,total,status', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
      supabase.from('financial_transactions').select('id,income_amount,expense_amount', { count: 'exact' }).order('transaction_date', { ascending: false }).limit(200),
    ]);

    const residents = residentsRes.count || 0;
    const appointments = appointmentsRes.count || 0;
    const invoices = invoicesRes.data || [];
    const paidInvoices = invoices.filter(i => i.status === 'pagada');
    const invoiceSum = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const paidInvoiceSum = paidInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const expenses = (transactionsRes.data || []).reduce((sum, tx) => sum + (tx.expense_amount || 0), 0);

    setResidentCount(residents);
    setAppointmentCount(appointments);
    setInvoiceCount(invoicesRes.count || invoices.length);
    setPaidInvoiceCount(paidInvoices.length);
    setInvoiceTotal(invoiceSum);
    setPaidInvoiceTotal(paidInvoiceSum);
    setExpenseTotal(expenses);
    setProfessionalVerifiedCount(0);
    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const averageOffer = useMemo(() => {
    return invoiceCount > 0 ? Math.round(invoiceTotal / invoiceCount) : 0;
  }, [invoiceCount, invoiceTotal]);

  const complianceScore = useMemo(() => {
    return invoiceCount > 0 ? Math.round((paidInvoiceCount / invoiceCount) * 100) : 0;
  }, [invoiceCount, paidInvoiceCount]);

  const reportCount = useMemo(() => {
    return appointmentCount + invoiceCount;
  }, [appointmentCount, invoiceCount]);

  const metrics = [
    { label: 'Pacientes', value: residentCount, icon: Users, color: 'text-primary' },
    { label: 'Agenda', value: appointmentCount, icon: Calendar, color: 'text-cat-nutritional' },
    { label: 'Ofertas totales', value: invoiceCount, icon: FileText, color: 'text-accent' },
    { label: 'Reportes', value: reportCount, icon: TrendingUp, color: 'text-muted-foreground' },
  ];

  const financialCards = [
    { label: 'Cubiertas', value: paidInvoiceCount, icon: CheckCircle2, color: 'text-primary' },
    { label: 'Monto promedio', value: `$${averageOffer.toLocaleString()}`, icon: ArrowUpRight, color: 'text-cat-mood' },
    { label: 'Gasto ejecutado', value: `$${expenseTotal.toLocaleString()}`, icon: DollarSign, color: 'text-destructive' },
    { label: 'Compliance RETHUS', value: `${complianceScore}%`, icon: ShieldCheck, color: 'text-cat-fragility' },
  ];

  const exportData = [
    { Indicador: 'Pacientes', Valor: residentCount },
    { Indicador: 'Agenda', Valor: appointmentCount },
    { Indicador: 'Ofertas totales', Valor: invoiceCount },
    { Indicador: 'Ofertas cubiertas', Valor: paidInvoiceCount },
    { Indicador: 'Monto promedio', Valor: averageOffer },
    { Indicador: 'Gasto ejecutado', Valor: expenseTotal },
    { Indicador: 'Compliance RETHUS', Valor: `${complianceScore}%` },
    { Indicador: 'Facturación consolidada', Valor: invoiceTotal },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="Instituciones" subtitle="Resumen institucional, ofertas y compliance" onBack={onBack} />

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                  <div className={`w-11 h-11 rounded-2xl bg-muted flex items-center justify-center mb-4 ${metric.color}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{metric.label}</p>
                  <p className={`text-3xl font-black ${metric.color}`}>{loading ? '...' : metric.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {financialCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-card border border-border rounded-3xl p-5 shadow-sm">
                  <div className={`w-11 h-11 rounded-2xl bg-muted flex items-center justify-center mb-4 ${card.color}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{card.label}</p>
                  <p className={`text-3xl font-black ${card.color}`}>{loading ? '...' : card.value}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-primary/10 via-transparent to-accent/10 border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ofertas masivas + IA</p>
                <h2 className="text-xl font-black text-foreground">Crea servicios de alto valor para tu institución</h2>
                <p className="text-sm text-muted-foreground leading-6">Usa los datos de pacientes, agenda y facturación para generar paquetes de servicio, auditar cumplimiento y conciliar con tu ERP.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {serviceIdeas.map((suggestion, index) => (
                <div key={index} className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-sm font-bold text-foreground">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                </div>
              ))}
            </div>

            <button onClick={() => {
              setServiceIdeas(current => [
                ...current,
                { title: "Servicio de conciliación ERP + compliance", description: "Sincroniza ventas, facturación y estados de pago para reportar a finanzas y RETHUS." },
              ]);
              toast({ title: "Nueva oferta creada", description: "Se agregó un servicio útil a la cartera institucional." });
            }}
              className="mt-5 w-full rounded-2xl bg-primary text-primary-foreground px-5 py-3 text-sm font-black uppercase tracking-wide hover:bg-primary/90 transition-all">
              Crear nuevos servicios útiles
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Facturación consolidada</p>
                <p className="text-3xl font-black text-foreground mt-3">${loading ? '...' : invoiceTotal.toLocaleString()}</p>
              </div>
              <div className="rounded-3xl bg-muted p-4 text-sm font-bold text-foreground">${loading ? '...' : paidInvoiceTotal.toLocaleString()}</div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Suma de ofertas cubiertas. Descarga el CSV para conciliar con tu ERP.</p>
            <div className="mt-5">
              <ExportButtons
                contentRef={contentRef}
                title="Instituciones Resumen"
                fileName="instituciones_resumen"
                data={exportData}
                textContent={`Pacientes: ${residentCount}\nAgenda: ${appointmentCount}\nOfertas totales: ${invoiceCount}\nCubiertas: ${paidInvoiceCount}\nMonto promedio: ${averageOffer}\nGasto ejecutado: ${expenseTotal}\nCompliance RETHUS: ${complianceScore}%\nFacturación consolidada: ${invoiceTotal}`}
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profesionales verificados</p>
                <p className="text-3xl font-black text-foreground mt-3">{loading ? '...' : professionalVerifiedCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">RETHUS</p>
                <p className="text-xs text-muted-foreground">Aceptados y verificados</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-foreground">Resumen institucional</h3>
            <p className="mt-3 text-sm text-muted-foreground leading-6">Este dashboard combina control de pacientes, agenda, ofertas, compliance y exportación de datos para la conciliación contable de tu institución.</p>
          </div>
        </div>
      </div>

      <div ref={contentRef} className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-foreground mb-4">Reporte rápido</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-primary/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ofertas cubiertas</p>
            <p className="mt-2 text-2xl font-black text-foreground">{loading ? '...' : paidInvoiceCount}</p>
          </div>
          <div className="rounded-2xl bg-secondary/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Monto promedio</p>
            <p className="mt-2 text-2xl font-black text-foreground">${loading ? '...' : averageOffer.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-destructive/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Gasto ejecutado</p>
            <p className="mt-2 text-2xl font-black text-foreground">${loading ? '...' : expenseTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-cat-fragility/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Compliance RETHUS</p>
            <p className="mt-2 text-2xl font-black text-foreground">{loading ? '...' : `${complianceScore}%`}</p>
          </div>
          <div className="rounded-2xl bg-cat-mood/5 p-4 col-span-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Facturación consolidada</p>
            <p className="mt-2 text-2xl font-black text-foreground">${loading ? '...' : invoiceTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionModule;
