import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const MedicalAppointments = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    resident_id: '', appointment_date: '', appointment_time: '', specialty: '',
    location: '', companion: '', companion_type: 'familiar', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').in('status', ['prueba', 'permanente']).order('full_name')
      .then(({ data }) => { if (data) setResidents(data); });
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const { data } = await supabase.from('medical_appointments').select('*, residents(full_name)')
      .order('appointment_date', { ascending: false }).limit(20);
    if (data) setAppointments(data);
  };

  const handleSave = async () => {
    if (!user || !form.resident_id) return;
    setSaving(true);
    const { error } = await supabase.from('medical_appointments').insert({ ...form, created_by: user.id });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Cita registrada" }); setShowForm(false); loadAppointments(); }
    setSaving(false);
  };

  const toggleAttended = async (id: string, current: boolean | null) => {
    await supabase.from('medical_appointments').update({ was_attended: !current }).eq('id', id);
    loadAppointments();
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
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase min-h-[48px]">
          <Calendar size={16} /> Nueva Cita
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
            <select value={form.resident_id} onChange={e => setForm(p => ({ ...p, resident_id: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
              <option value="">-- Seleccionar --</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Especialidad</label>
            <input type="text" value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Fecha</label>
            <input type="date" value={form.appointment_date} onChange={e => setForm(p => ({ ...p, appointment_date: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Hora</label>
            <input type="time" value={form.appointment_time} onChange={e => setForm(p => ({ ...p, appointment_time: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Lugar</label>
            <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Acompañante</label>
            <input type="text" value={form.companion} onChange={e => setForm(p => ({ ...p, companion: e.target.value }))}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>
          <div className="sm:col-span-2">
            <ActionButtons onFinish={handleSave} disabled={saving || !form.resident_id} />
          </div>
        </div>
      )}

      <div ref={contentRef} className="space-y-3 mb-6">
        {appointments.map(a => (
          <div key={a.id} className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{(a.residents as any)?.full_name}</p>
              <p className="text-xs text-muted-foreground">{a.specialty} — {a.appointment_date} {a.appointment_time}</p>
              <p className="text-xs text-muted-foreground">{a.location}</p>
            </div>
            <button onClick={() => toggleAttended(a.id, a.was_attended)}
              className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg ${a.was_attended ? 'bg-cat-nutritional/10 text-cat-nutritional' : 'bg-muted text-muted-foreground'}`}>
              {a.was_attended ? <><CheckCircle2 size={14} /> Asistió</> : <><XCircle size={14} /> Pendiente</>}
            </button>
          </div>
        ))}
      </div>
      {appointments.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ExportButtons contentRef={contentRef} title="HB-F17 Citas Médicas" fileName="citas_medicas" data={getApptData()} textContent="Citas Médicas" />
          <ShareButtons title="HB-F17 Citas Médicas" text={`Citas médicas registradas: ${appointments.length}`} />
        </div>
      )}
    </div>
  );
};

export default MedicalAppointments;
