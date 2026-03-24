import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import { Calendar, CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const SPECIALTY_CHECKLIST: Record<string, string[]> = {
  'Cardiología': ['Llevar EKG recientes (últimos 3 meses)', 'Lista actualizada de medicamentos cardíacos', 'Registro de TA de los últimos 7 días', 'Ayunas si se va a realizar ecocardiograma'],
  'Neurología': ['Llevar neuroimágenes previas (TAC, RMN)', 'Descripción detallada de episodios o cambios cognitivos', 'Lista de medicamentos antiepilépticos o neuroprotectores', 'Escala de valoración cognitiva más reciente'],
  'Oftalmología': ['Llevar gafas actuales del paciente', 'Lista de gotas oftálmicas en uso', 'No aplicar maquillaje en ojos', 'Ayunas no requerido generalmente'],
  'Ortopedia': ['Radiografías previas de la zona afectada', 'Descripción de dolor: localización, intensidad, duración', 'Lista de analgésicos o antiinflamatorios en uso', 'Ropa cómoda que permita acceso a la zona afectada'],
  'Gastroenterología': ['Ayunas de 8 horas si se realiza endoscopia', 'Preparación intestinal si se realiza colonoscopia', 'Lista de medicamentos gastrointestinales', 'Últimos resultados de laboratorio (hepatograma si aplica)'],
  'Endocrinología': ['Ayunas de 8-12 horas para laboratorios', 'Glucómetro y registro de glucemias de los últimos 30 días', 'Lista de insulinas y antidiabéticos orales', 'Llevar carné de diabetes o tiroides si aplica'],
  'Psiquiatría': ['Lista completa de medicamentos psicotrópicos', 'Descripción de conductas o cambios de comportamiento recientes', 'Última nota de psicología o trabajo social', 'Familiar o cuidador que acompañe para contextualizar'],
  'Urología': ['Muestra de orina fresca (frasco estéril)', 'Lista de medicamentos para próstata o vejiga', 'Descripción de sintomatología urinaria', 'Hidratación adecuada el día anterior'],
};

const getChecklist = (specialty: string): string[] => {
  const normalized = Object.keys(SPECIALTY_CHECKLIST).find(k => specialty.toLowerCase().includes(k.toLowerCase()));
  return normalized
    ? SPECIALTY_CHECKLIST[normalized]
    : [
        'Documento de identidad del residente',
        'Carné de EPS / seguro médico vigente',
        'Lista completa y actualizada de medicamentos',
        'Historia clínica o resumen médico del hogar',
        'Acompañante designado (familiar o auxiliar)',
      ];
};

const MedicalAppointments = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    resident_id: '', appointment_date: '', appointment_time: '', specialty: '',
    location: '', companion: '', companion_type: 'familiar', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);

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
    const { error } = await supabase.from('medical_appointments').insert({
      ...form, created_by: user.id,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Cita registrada" }); setShowForm(false); loadAppointments(); }
    setSaving(false);
  };

  const generateChecklist = () => {
    if (!form.specialty) return;
    setGeneratingAI(true);
    setChecklist(getChecklist(form.specialty));
    setGeneratingAI(false);
  };

  const toggleAttended = async (id: string, current: boolean | null) => {
    await supabase.from('medical_appointments').update({ was_attended: !current }).eq('id', id);
    loadAppointments();
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F17: Citas Médicas" subtitle="Gestión de citas médicas externas" onBack={onBack} />

      <button onClick={() => setShowForm(!showForm)}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase mb-6 min-h-[48px]">
        <Calendar size={16} /> Nueva Cita
      </button>

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
            <button
              type="button"
              onClick={generateChecklist}
              disabled={generatingAI || !form.specialty}
              className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 min-h-[40px]"
            >
              {generatingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Generar checklist de preparación con IA
            </button>
          </div>
          {checklist.length > 0 && (
            <div className="sm:col-span-2 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                <Sparkles size={10} /> Preparación recomendada — {form.specialty}
              </p>
              <ul className="space-y-1">
                {checklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="sm:col-span-2">
            <ActionButtons onFinish={handleSave} disabled={saving || !form.resident_id} />
          </div>
        </div>
      )}

      <div className="space-y-3">
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
    </div>
  );
};

export default MedicalAppointments;
