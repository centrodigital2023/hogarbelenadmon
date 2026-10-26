import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActiveResidents } from "@/hooks/useActiveResidents";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import DictationTextarea from "@/components/DictationTextarea";
import { Section, Field, ChoiceChips, ResidentSelect, Notice, inputCls } from "@/components/forms/ui";
import { Calendar, CheckCircle2, Clock, MapPin, Pencil, Trash2, User, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import type { Row, WithResident } from "@/integrations/supabase/tables";
import { todayLocal, relativeDay, blankToNull } from "@/lib/form-helpers";

interface Props { onBack: () => void; }

type Appointment = WithResident<Row<"medical_appointments">>;

const SPECIALTIES = ['Medicina general', 'Cardiología', 'Odontología', 'Oftalmología', 'Ortopedia', 'Neurología', 'Psiquiatría', 'Laboratorio', 'Geriatría'];
const COMPANIONS = [{ value: 'familiar', label: '👪 Familiar' }, { value: 'personal', label: '🧑‍⚕️ Personal del hogar' }];

const emptyForm = () => ({
  resident_id: '', appointment_date: '', appointment_time: '', specialty: '',
  location: '', companion: '', companion_type: 'familiar', notes: '',
});

const timeLabel = (t: string | null) => t ? t.slice(0, 5) : '';

const MedicalAppointments = ({ onBack }: Props) => {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { residents, loading } = useActiveResidents();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [attending, setAttending] = useState<Appointment | null>(null);
  const [summary, setSummary] = useState('');
  const canManage = roles.includes('super_admin') || roles.includes('coordinador');
  const today = todayLocal();

  const loadAppointments = useCallback(async () => {
    const { data } = await supabase.from('medical_appointments').select('*, residents(full_name)')
      .order('appointment_date', { ascending: false }).limit(100);
    setAppointments(data ?? []);
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const upcoming = appointments.filter(a => a.appointment_date >= today && !a.was_attended)
    .sort((a, b) => (a.appointment_date + (a.appointment_time ?? '')).localeCompare(b.appointment_date + (b.appointment_time ?? '')));
  const overdue = appointments.filter(a => a.appointment_date < today && !a.was_attended);
  const done = appointments.filter(a => a.was_attended);

  const clash = !editingId && form.resident_id && form.appointment_date
    ? appointments.find(a => a.resident_id === form.resident_id && a.appointment_date === form.appointment_date)
    : undefined;
  const missing = [
    ...(form.resident_id ? [] : ['residente']),
    ...(form.specialty.trim() ? [] : ['especialidad']),
    ...(form.appointment_date ? [] : ['fecha']),
  ];

  const resetForm = () => { setForm(emptyForm()); setEditingId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!user || missing.length) return;
    setSaving(true);
    const payload = {
      resident_id: form.resident_id, appointment_date: form.appointment_date,
      appointment_time: blankToNull(form.appointment_time), specialty: form.specialty.trim(),
      location: blankToNull(form.location.trim()), companion: blankToNull(form.companion.trim()),
      companion_type: form.companion_type, notes: blankToNull(form.notes.trim()),
    };
    const { error } = editingId
      ? await supabase.from('medical_appointments').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
      : await supabase.from('medical_appointments').insert({ ...payload, created_by: user.id });
    if (error) toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: editingId ? "Cita actualizada ✅" : "Cita agendada ✅", description: `${payload.specialty} · ${relativeDay(payload.appointment_date, today)}` });
      resetForm();
      loadAppointments();
    }
    setSaving(false);
  };

  const startEdit = (a: Appointment) => {
    setForm({
      resident_id: a.resident_id, appointment_date: a.appointment_date, appointment_time: timeLabel(a.appointment_time),
      specialty: a.specialty || '', location: a.location || '', companion: a.companion || '',
      companion_type: a.companion_type || 'familiar', notes: a.notes || '',
    });
    setEditingId(a.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('medical_appointments').delete().eq('id', deleteId);
    if (error) toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    else { toast({ title: "Cita eliminada" }); loadAppointments(); }
    setDeleting(false);
    setDeleteId(null);
  };

  const confirmAttended = async () => {
    if (!attending) return;
    const { error } = await supabase.from('medical_appointments')
      .update({ was_attended: true, medical_summary: blankToNull(summary.trim()), updated_at: new Date().toISOString() }).eq('id', attending.id);
    if (error) { toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cita marcada como atendida ✅", description: summary.trim() ? "Recuerde actualizar HB-F14 si cambió la fórmula." : undefined });
    setAttending(null);
    setSummary('');
    loadAppointments();
  };

  const undoAttended = async (a: Appointment) => {
    const { error } = await supabase.from('medical_appointments').update({ was_attended: false }).eq('id', a.id);
    if (error) toast({ title: "No se pudo cambiar", description: error.message, variant: "destructive" });
    else loadAppointments();
  };

  const card = (a: Appointment) => {
    const rel = relativeDay(a.appointment_date, today);
    const soon = !a.was_attended && (rel === 'hoy' || rel === 'mañana');
    return (
      <div key={a.id} className={`rounded-2xl border-2 bg-card p-4 shadow-sm ${soon ? 'border-primary/50' : a.appointment_date < today && !a.was_attended ? 'border-amber-400' : 'border-border'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">{a.residents?.full_name}</p>
            <p className="text-sm font-bold text-primary">{a.specialty}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar size={12} /> {a.appointment_date} <strong className={soon ? 'text-primary' : ''}>({rel})</strong></span>
              {a.appointment_time && <span className="flex items-center gap-1"><Clock size={12} /> {timeLabel(a.appointment_time)}</span>}
              {a.location && <span className="flex items-center gap-1"><MapPin size={12} /> {a.location}</span>}
              {a.companion && <span className="flex items-center gap-1"><User size={12} /> {a.companion} ({a.companion_type})</span>}
            </p>
            {a.medical_summary && <p className="mt-2 rounded-lg bg-muted p-2 text-xs text-foreground">{a.medical_summary}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {a.was_attended ? (
              <button type="button" onClick={() => undoAttended(a)} className="flex min-h-[40px] items-center gap-1 rounded-xl bg-emerald-500/10 px-3 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> Asistió</button>
            ) : (
              <button type="button" onClick={() => { setAttending(a); setSummary(a.medical_summary ?? ''); }}
                className="flex min-h-[40px] items-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground">Marcar asistió</button>
            )}
            {canManage && (
              <>
                <button type="button" onClick={() => startEdit(a)} aria-label="Editar" className="flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-primary/10"><Pencil size={15} /></button>
                <button type="button" onClick={() => setDeleteId(a.id)} aria-label="Eliminar" className="flex h-10 w-10 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10"><Trash2 size={15} /></button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getApptData = () => appointments.map(a => ({
    Residente: a.residents?.full_name, Especialidad: a.specialty, Fecha: a.appointment_date, Hora: timeLabel(a.appointment_time),
    Lugar: a.location, Acompañante: a.companion, Asistió: a.was_attended ? 'Sí' : 'No', Resumen: a.medical_summary,
  }));
  const shareText = `Próximas citas médicas:\n${upcoming.map(a => `• ${a.appointment_date} ${timeLabel(a.appointment_time)} — ${a.residents?.full_name}: ${a.specialty}${a.location ? ` en ${a.location}` : ''}`).join('\n') || 'Ninguna'}`;

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F17: Citas Médicas" subtitle="Agenda de citas externas y su resultado" onBack={onBack} />

      {!showForm && (
        <button type="button" onClick={() => { setForm(emptyForm()); setShowForm(true); }}
          className="mb-5 flex min-h-[48px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm">
          <Calendar size={18} /> Agendar cita
        </button>
      )}

      {showForm && (
        <Section title={editingId ? 'Editar cita' : 'Nueva cita'}
          actions={<button type="button" onClick={resetForm} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"><X size={18} /></button>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Residente" required>
              <ResidentSelect residents={residents} loading={loading} value={form.resident_id} onChange={v => setForm(p => ({ ...p, resident_id: v }))} />
            </Field>
            <Field label="Especialidad" required>
              <input value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} list="specialties" placeholder="Ej.: Cardiología" className={inputCls} />
              <datalist id="specialties">{SPECIALTIES.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Fecha" required>
              <input type="date" value={form.appointment_date} min={editingId ? undefined : today} onChange={e => setForm(p => ({ ...p, appointment_date: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Hora">
              <input type="time" value={form.appointment_time} onChange={e => setForm(p => ({ ...p, appointment_time: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Lugar" className="sm:col-span-2">
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="IPS, dirección o consultorio" className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Acompaña</span>
              <ChoiceChips size="sm" options={COMPANIONS} value={form.companion_type} onChange={v => setForm(p => ({ ...p, companion_type: v }))} />
              <input value={form.companion} onChange={e => setForm(p => ({ ...p, companion: e.target.value }))} placeholder="Nombre de quien acompaña" className={inputCls} />
            </div>
            <Field label="Notas" className="sm:col-span-2">
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ej.: llevar exámenes, ir en ayunas" className={inputCls} />
            </Field>
          </div>
          {clash && <div className="mt-3"><Notice tone="warning">Ese día ya tiene cita de {clash.specialty}{clash.appointment_time ? ` a las ${timeLabel(clash.appointment_time)}` : ''}. Verifique que no se crucen.</Notice></div>}
          <ActionButtons inline onFinish={handleSave} saving={saving} missing={missing} label={editingId ? 'Guardar cambios' : 'Agendar cita'} />
        </Section>
      )}

      <div ref={contentRef}>
        <h3 className="mb-2 text-sm font-black text-foreground">Próximas ({upcoming.length})</h3>
        <div className="mb-6 space-y-3">
          {upcoming.map(card)}
          {upcoming.length === 0 && <Notice>No hay citas próximas.</Notice>}
        </div>
        {overdue.length > 0 && (
          <>
            <h3 className="mb-2 text-sm font-black text-amber-700">Pendientes de confirmar ({overdue.length})</h3>
            <p className="mb-2 text-xs text-muted-foreground">Ya pasó la fecha: marque si asistió o edítela si se reprogramó.</p>
            <div className="mb-6 space-y-3">{overdue.map(card)}</div>
          </>
        )}
        {done.length > 0 && (
          <details className="mb-6">
            <summary className="cursor-pointer text-sm font-black text-foreground">Atendidas ({done.length})</summary>
            <div className="mt-3 space-y-3">{done.map(card)}</div>
          </details>
        )}
      </div>

      {appointments.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <ExportButtons contentRef={contentRef} title="HB-F17 Citas Médicas" fileName="citas_medicas" data={getApptData()} textContent={shareText} />
          <ShareButtons title="HB-F17 Citas Médicas" text={shareText} />
        </div>
      )}

      <Dialog open={!!attending} onOpenChange={open => { if (!open) setAttending(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cómo le fue en la cita?</DialogTitle>
            <DialogDescription>{attending?.residents?.full_name} · {attending?.specialty}</DialogDescription>
          </DialogHeader>
          <DictationTextarea label="Resumen e indicaciones del médico" value={summary} onChange={setSummary} minRows={4}
            placeholder="Diagnóstico, cambios de medicamentos, próximos controles…" />
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <button className="min-h-[44px] rounded-xl bg-muted px-4 text-sm font-bold text-muted-foreground">Cancelar</button>
            </DialogClose>
            <button onClick={confirmAttended} className="min-h-[44px] rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Guardar: asistió</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cita?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <button className="min-h-[44px] rounded-xl bg-muted px-4 text-sm font-bold text-muted-foreground">Cancelar</button>
            </DialogClose>
            <button onClick={handleDelete} disabled={deleting}
              className="min-h-[44px] rounded-xl bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50">
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalAppointments;
