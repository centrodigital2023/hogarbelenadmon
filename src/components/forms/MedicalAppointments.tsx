import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import FormHistory from "@/components/FormHistory";
import { Calendar, CheckCircle2, XCircle, Pencil, Trash2, Save, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const MedicalAppointments = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canAccessModule } = usePermissions();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    resident_id: '', appointment_date: '', appointment_time: '', specialty: '',
    location: '', companion: '', companion_type: 'familiar', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
    loadAppointments();
    if (user) {
      supabase.from('user_roles').select('role').eq('user_id', user.id).then(({ data }) => {
        if (data && data.length > 0) {
          const roles = data.map(x => x.role);
          if (roles.includes('super_admin')) setUserRole('super_admin');
          else if (roles.includes('coordinador')) setUserRole('coordinador');
          else setUserRole(roles[0]);
        }
      });
    }
  }, [user]);

  const canManage = userRole === 'super_admin' || userRole === 'coordinador';

  const loadAppointments = async () => {
    const { data } = await supabase.from('medical_appointments').select('*, residents(full_name)')
      .order('appointment_date', { ascending: false }).limit(50);
    if (data) setAppointments(data);
  };

  const handleSave = async () => {
    if (!user || !form.resident_id) return;
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from('medical_appointments').update(form).eq('id', editingId);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Cita actualizada ✅" }); setEditingId(null); setShowForm(false); loadAppointments(); }
    } else {
      const { error } = await supabase.from('medical_appointments').insert({ ...form, created_by: user.id });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Cita registrada ✅" }); setShowForm(false); loadAppointments(); }
    }
    setSaving(false);
  };

  const startEdit = (a: any) => {
    setForm({
      resident_id: a.resident_id, appointment_date: a.appointment_date, appointment_time: a.appointment_time || '',
      specialty: a.specialty || '', location: a.location || '', companion: a.companion || '',
      companion_type: a.companion_type || 'familiar', notes: a.notes || '',
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('medical_appointments').delete().eq('id', deleteId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Cita eliminada" }); loadAppointments(); }
    setDeleting(false);
    setDeleteId(null);
  };

  const toggleAttended = async (id: string, current: boolean | null) => {
    await supabase.from('medical_appointments').update({ was_attended: !current }).eq('id', id);
    loadAppointments();
  };

  const resetForm = () => {
    setForm({ resident_id: '', appointment_date: '', appointment_time: '', specialty: '', location: '', companion: '', companion_type: 'familiar', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const getApptData = () => appointments.map(a => ({
    Residente: (a.residents as any)?.full_name, Especialidad: a.specialty,
    Fecha: a.appointment_date, Hora: a.appointment_time, Lugar: a.location,
    Asistió: a.was_attended ? 'Sí' : 'No',
  }));

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F17: Citas Médicas" subtitle="Gestión de citas médicas externas" onBack={onBack} />

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase min-h-[48px] shadow-md hover:shadow-lg transition-all">
          <Calendar size={16} /> {showForm ? 'Cancelar' : 'Nueva Cita'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Residente</label>
            <select value={form.resident_id} onChange={e => setForm(p => ({ ...p, resident_id: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20">
              <option value="">-- Seleccionar --</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Especialidad</label>
            <input type="text" value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fecha</label>
            <input type="date" value={form.appointment_date} onChange={e => setForm(p => ({ ...p, appointment_date: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Hora</label>
            <input type="time" value={form.appointment_time} onChange={e => setForm(p => ({ ...p, appointment_time: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lugar</label>
            <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Acompañante</label>
            <input type="text" value={form.companion} onChange={e => setForm(p => ({ ...p, companion: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Notas</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="sm:col-span-2">
            <ActionButtons onFinish={handleSave} disabled={saving || !form.resident_id} />
          </div>
        </div>
      )}

      <div ref={contentRef} className="space-y-3 mb-6">
        {appointments.map(a => (
          <div key={a.id} className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm hover:border-primary/20 transition-all">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{(a.residents as any)?.full_name}</p>
              <p className="text-xs text-muted-foreground">{a.specialty} — {a.appointment_date} {a.appointment_time}</p>
              <p className="text-xs text-muted-foreground">{a.location}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleAttended(a.id, a.was_attended)}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                  a.was_attended ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}>
                {a.was_attended ? <><CheckCircle2 size={14} /> Asistió</> : <><XCircle size={14} /> Pendiente</>}
              </button>
              {canManage && (
                <>
                  <button onClick={() => startEdit(a)} className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteId(a.id)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {appointments.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ExportButtons contentRef={contentRef} title="HB-F17 Citas Médicas" fileName="citas_medicas" data={getApptData()} textContent="Citas Médicas" />
          <ShareButtons title="HB-F17 Citas Médicas" text={`Citas médicas registradas: ${appointments.length}`} />
        </div>
      )}

      <FormHistory tableName="medical_appointments" title="Historial Citas Médicas" fileName="hist_citas_medicas"
        selectClause="*, residents(full_name)"
        columns={[
          { key: 'appointment_date', label: 'Fecha' },
          { key: 'residents', label: 'Residente', render: (v: any) => v?.full_name || '-' },
          { key: 'specialty', label: 'Especialidad' },
          { key: 'location', label: 'Lugar' },
          { key: 'was_attended', label: 'Asistió', render: (v: boolean | null) => v ? '✅' : '❌' },
        ]}
        dateColumn="appointment_date"
        editableFields={[
          { key: 'specialty', label: 'Especialidad', type: 'text' },
          { key: 'location', label: 'Lugar', type: 'text' },
          { key: 'notes', label: 'Notas', type: 'text' },
        ]}
      />

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cita?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="px-4 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground">Cancelar</button>
            </DialogClose>
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground disabled:opacity-50">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MedicalAppointments;
