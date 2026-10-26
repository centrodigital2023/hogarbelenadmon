import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import FormHeader from "@/components/FormHeader";
import SignaturePad from "@/components/SignaturePad";
import ExportButtons from "@/components/ExportButtons";
import { Section, Field, Notice, inputCls, smallInputCls } from "@/components/forms/ui";
import { useResponsible } from "@/components/forms/gerencial";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { MONTHS_ES, monthBounds, formatCOP } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

type Indicators = {
  residentes: number; capacidad: number; incidentes: number; caidas: number;
  citas: number; citasAtendidas: number; capacitaciones: number;
  facturado: number; cobrado: number; pqrsf: number; pqrsfAbiertas: number;
};
type Action = { accion: string; responsable: string; fecha_limite: string; estado: string };
const emptyAction = (): Action => ({ accion: '', responsable: '', fecha_limite: '', estado: 'pendiente' });

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : null);

const ManagerialDashboard = ({ onBack }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [responsible, setResponsible] = useResponsible();
  const [ind, setInd] = useState<Indicators | null>(null);
  const [observations, setObservations] = useState("");
  const [actions, setActions] = useState<Action[]>([emptyAction()]);
  const [loading, setLoading] = useState(false);

  const loadIndicators = useCallback(async () => {
    setLoading(true);
    // Every monthly figure is bounded on both ends so past months stay comparable
    const { from, to } = monthBounds(year, month);
    const [residents, rooms, incidents, appointments, trainings, invoices, pqrsf] = await Promise.all([
      supabase.from('residents').select('id', { count: 'exact', head: true }).in('status', ['permanente', 'prueba']),
      supabase.from('rooms').select('capacity'),
      supabase.from('incidents').select('incident_type').gte('incident_datetime', from).lt('incident_datetime', to),
      supabase.from('medical_appointments').select('was_attended').gte('appointment_date', from).lt('appointment_date', to).lt('appointment_date', new Date().toISOString().slice(0, 10)),
      supabase.from('trainings').select('id', { count: 'exact', head: true }).gte('training_date', from).lt('training_date', to),
      supabase.from('invoices').select('total, status').gte('created_at', from).lt('created_at', to),
      supabase.from('pqrsf').select('status').gte('record_date', from).lt('record_date', to),
    ]);
    const inc = incidents.data ?? [];
    const appts = appointments.data ?? [];
    const inv = invoices.data ?? [];
    setInd({
      residentes: residents.count ?? 0,
      capacidad: (rooms.data ?? []).reduce((s, r) => s + (r.capacity || 0), 0),
      incidentes: inc.length,
      caidas: inc.filter(i => /^ca[ií]da/i.test(i.incident_type)).length,
      citas: appts.length,
      citasAtendidas: appts.filter(a => a.was_attended).length,
      capacitaciones: trainings.count ?? 0,
      facturado: inv.reduce((s, i) => s + (i.total || 0), 0),
      cobrado: inv.filter(i => i.status === 'pagada').reduce((s, i) => s + (i.total || 0), 0),
      pqrsf: pqrsf.data?.length ?? 0,
      pqrsfAbiertas: (pqrsf.data ?? []).filter(p => p.status !== 'cerrado').length,
    });
    setLoading(false);
  }, [month, year]);

  useEffect(() => { loadIndicators(); }, [loadIndicators]);

  const ocupacion = ind ? pct(ind.residentes, ind.capacidad) : null;
  const citas = ind ? pct(ind.citasAtendidas, ind.citas) : null;
  const cartera = ind ? pct(ind.cobrado, ind.facturado) : null;
  const cards = ind ? [
    { label: 'Ocupación', value: ocupacion === null ? '—' : `${ocupacion}%`, sub: `${ind.residentes} de ${ind.capacidad || '?'} camas`, tone: 'text-primary' },
    { label: 'Incidentes del mes', value: ind.incidentes, sub: `${ind.caidas} caídas`, tone: ind.incidentes ? 'text-destructive' : 'text-emerald-700' },
    { label: 'Citas cumplidas', value: citas === null ? '—' : `${citas}%`, sub: `${ind.citasAtendidas} de ${ind.citas} citas`, tone: citas !== null && citas < 80 ? 'text-amber-700' : 'text-primary' },
    { label: 'Capacitaciones', value: ind.capacitaciones, sub: 'realizadas en el mes', tone: 'text-foreground' },
    { label: 'Facturado', value: formatCOP(ind.facturado), sub: 'emitido en el mes', tone: 'text-foreground' },
    { label: 'Cobrado', value: formatCOP(ind.cobrado), sub: cartera === null ? 'sin facturas' : `${cartera}% de lo facturado`, tone: 'text-primary' },
    { label: 'PQRSF del mes', value: ind.pqrsf, sub: `${ind.pqrsfAbiertas} abiertas`, tone: ind.pqrsfAbiertas ? 'text-amber-700' : 'text-foreground' },
  ] : [];

  const setAction = (i: number, patch: Partial<Action>) => setActions(l => l.map((a, j) => j === i ? { ...a, ...patch } : a));
  const period = `${MONTHS_ES[month - 1]} ${year}`;
  const text = `Tablero gerencial — ${period}\nResponsable: ${responsible}\n${cards.map(c => `• ${c.label}: ${c.value} (${c.sub})`).join('\n')}\nNovedades: ${observations}\nAcciones:\n${actions.filter(a => a.accion.trim()).map(a => `• ${a.accion} — ${a.responsable} — ${a.fecha_limite} — ${a.estado}`).join('\n')}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-G06: Tablero de Control Gerencial" subtitle="Indicadores consolidados para toma de decisiones" onBack={onBack} />

      <Section>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid grid-cols-[1fr_auto] gap-3 sm:col-span-2 sm:grid-cols-2">
            <Field label="Mes">
              <select value={month} onChange={e => setMonth(+e.target.value)} className={inputCls}>
                {MONTHS_ES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </Field>
            <Field label="Año">
              <select value={year} onChange={e => setYear(+e.target.value)} className={inputCls}>
                {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Responsable">
            <input value={responsible} onChange={e => setResponsible(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Section>

      <div ref={contentRef}>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-foreground">Indicadores de {period} {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}</h3>
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map(c => (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className={`text-xl font-black sm:text-2xl ${c.tone}`}>{c.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">{c.label}</p>
              <p className="text-[11px] text-muted-foreground">{c.sub}</p>
            </div>
          ))}
        </div>
        {ind && ind.capacidad === 0 && <div className="mb-5"><Notice tone="warning">No hay habitaciones registradas con capacidad, así que la ocupación no se puede calcular.</Notice></div>}

        <Section title="Novedades administrativas">
          <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} className={`${inputCls} resize-none`}
            placeholder="Lo más importante del mes para la junta" />
        </Section>

        <Section title="Acciones estratégicas">
          <div className="space-y-3">
            {actions.map((a, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <input placeholder="Acción" value={a.accion} onChange={e => setAction(i, { accion: e.target.value })} className={`${smallInputCls} col-span-2 md:col-span-1`} />
                <input placeholder="Responsable" value={a.responsable} onChange={e => setAction(i, { responsable: e.target.value })} className={smallInputCls} />
                <input type="date" aria-label="Fecha límite" value={a.fecha_limite} onChange={e => setAction(i, { fecha_limite: e.target.value })} className={smallInputCls} />
                <select value={a.estado} onChange={e => setAction(i, { estado: e.target.value })} className={smallInputCls}>
                  <option value="pendiente">Pendiente</option><option value="en_proceso">En proceso</option><option value="completado">Completado</option>
                </select>
                {actions.length > 1 && (
                  <button type="button" aria-label="Quitar acción" onClick={() => setActions(l => l.filter((_, j) => j !== i))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setActions(l => [...l, emptyAction()])} className="mt-3 flex min-h-[40px] items-center gap-2 text-xs font-bold text-primary"><Plus size={16} /> Agregar acción</button>
        </Section>

        <Section title="Firma"><div className="flex justify-center"><SignaturePad label="Vo.Bo. Representante legal" /></div></Section>
      </div>

      <Notice>Este tablero se calcula en vivo; para archivarlo, descárguelo en PDF o Word.</Notice>
      <div className="my-4"><ExportButtons contentRef={contentRef} title={`HB-G06 Tablero ${period}`} fileName={`tablero_gerencial_${year}_${month}`} textContent={text} /></div>
    </div>
  );
};

export default ManagerialDashboard;
