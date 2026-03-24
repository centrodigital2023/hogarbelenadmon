import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ImportData from "@/components/ImportData";
import { UserPlus, Search, User, Upload } from "lucide-react";

interface Resident {
  id: string;
  full_name: string;
  document_id: string | null;
  birth_date: string | null;
  eps: string | null;
  status: string;
  admission_date: string;
  room_id: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  prueba: '🟡 Prueba',
  permanente: '🟢 Permanente',
  egresado: '🔵 Egresado',
  fallecido: '⚫ Fallecido',
};

const ResidentManagement = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({
    full_name: '', document_id: '', birth_date: '', birth_place: '',
    gender: 'M', eps: '', blood_type: '', allergies: '',
    emergency_contact_1_name: '', emergency_contact_1_phone: '', emergency_contact_1_relation: '',
    emergency_contact_2_name: '', emergency_contact_2_phone: '', emergency_contact_2_relation: '',
    responsible_family_name: '', responsible_family_document: '', responsible_family_phone: '',
    treating_doctor_name: '', treating_doctor_phone: '', special_diet: '', notes: '',
  });

  const fetchResidents = async () => {
    setLoading(true);
    const { data } = await supabase.from('residents').select('id, full_name, document_id, birth_date, eps, status, admission_date, room_id')
      .order('full_name');
    if (data) setResidents(data);
    setLoading(false);
  };

  useEffect(() => { fetchResidents(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const admDate = new Date();
    const trialEnd = new Date(admDate);
    trialEnd.setDate(trialEnd.getDate() + 15);

    const { error } = await supabase.from('residents').insert({
      ...form,
      admission_date: admDate.toISOString().split('T')[0],
      trial_end_date: trialEnd.toISOString().split('T')[0],
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Residente registrado" });
      setShowForm(false);
      setForm({ full_name: '', document_id: '', birth_date: '', birth_place: '', gender: 'M', eps: '', blood_type: '', allergies: '', emergency_contact_1_name: '', emergency_contact_1_phone: '', emergency_contact_1_relation: '', emergency_contact_2_name: '', emergency_contact_2_phone: '', emergency_contact_2_relation: '', responsible_family_name: '', responsible_family_document: '', responsible_family_phone: '', treating_doctor_name: '', treating_doctor_phone: '', special_diet: '', notes: '' });
      fetchResidents();
    }
  };

  const filtered = residents.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <FormHeader title="Gestión de Residentes" subtitle="Directorio y fichas personales" onBack={onBack} />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar residente..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 min-h-[48px]">
          <UserPlus size={16} />
          Nuevo Residente
        </button>
        <button onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-2 bg-muted text-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-muted/80 transition-colors min-h-[48px]">
          <Upload size={16} />
          Importar CSV
        </button>
      </div>

      {showImport && (
        <div className="mb-6">
          <ImportData onImported={() => { fetchResidents(); setShowImport(false); }} />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
          <h3 className="text-sm font-black text-foreground">Datos del Residente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Nombre completo*', key: 'full_name', required: true },
              { label: 'Documento', key: 'document_id' },
              { label: 'Fecha nacimiento', key: 'birth_date', type: 'date' },
              { label: 'Lugar nacimiento', key: 'birth_place' },
              { label: 'EPS', key: 'eps' },
              { label: 'Tipo sangre', key: 'blood_type' },
              { label: 'Alergias', key: 'allergies' },
              { label: 'Dieta especial', key: 'special_diet' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.label}</label>
                <input type={f.type || 'text'} value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  required={f.required} />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Género</label>
              <select value={form.gender} onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </div>

          <h4 className="text-xs font-black text-foreground mt-4">Contactos de Emergencia</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {['emergency_contact_1_name', 'emergency_contact_1_phone', 'emergency_contact_1_relation'].map(k => (
              <div key={k}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  {k.replace('emergency_contact_1_', '').replace('_', ' ')}
                </label>
                <input type="text" value={(form as any)[k]}
                  onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
            ))}
          </div>

          <h4 className="text-xs font-black text-foreground mt-4">Familiar Responsable</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Nombre', key: 'responsible_family_name' },
              { label: 'Documento', key: 'responsible_family_document' },
              { label: 'Teléfono', key: 'responsible_family_phone' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.label}</label>
                <input type="text" value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
            ))}
          </div>

          <button type="submit"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase hover:opacity-90 min-h-[48px]">
            Registrar Residente
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{r.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.document_id || 'Sin documento'}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-bold">EPS:</span> {r.eps || 'N/A'}</p>
                <p><span className="font-bold">Ingreso:</span> {r.admission_date}</p>
                <p><span className="font-bold">Estado:</span> {STATUS_LABELS[r.status] || r.status}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full">No se encontraron residentes.</p>}
        </div>
      )}
    </div>
  );
};

export default ResidentManagement;
