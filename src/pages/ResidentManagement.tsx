import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { UserPlus, Search, User, Pencil, Trash2, X, Save } from "lucide-react";

interface Resident {
  id: string;
  full_name: string;
  document_id: string | null;
  birth_date: string | null;
  eps: string | null;
  status: string;
  admission_date: string;
  room_id: string | null;
  birth_place: string | null;
  gender: string | null;
  blood_type: string | null;
  allergies: string | null;
  special_diet: string | null;
  emergency_contact_1_name: string | null;
  emergency_contact_1_phone: string | null;
  emergency_contact_1_relation: string | null;
  responsible_family_name: string | null;
  responsible_family_document: string | null;
  responsible_family_phone: string | null;
  treating_doctor_name: string | null;
  treating_doctor_phone: string | null;
  notes: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  prueba: '🟡 Prueba',
  permanente: '🟢 Permanente',
  egresado: '🔵 Egresado',
  fallecido: '⚫ Fallecido',
};

const EMPTY_FORM = {
  full_name: '', document_id: '', birth_date: '', birth_place: '',
  gender: 'M', eps: '', blood_type: '', allergies: '',
  emergency_contact_1_name: '', emergency_contact_1_phone: '', emergency_contact_1_relation: '',
  emergency_contact_2_name: '', emergency_contact_2_phone: '', emergency_contact_2_relation: '',
  responsible_family_name: '', responsible_family_document: '', responsible_family_phone: '',
  treating_doctor_name: '', treating_doctor_phone: '', special_diet: '', notes: '',
};

const ResidentManagement = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canAccessModule } = usePermissions();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusEdit, setStatusEdit] = useState<{ id: string; status: string } | null>(null);

  // Check if user can manage (edit/delete)
  const canManage = canAccessModule('residentes');

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('residents').select('*').order('full_name');
    if (data) setResidents(data as Resident[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchResidents(); }, [fetchResidents]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
  };

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
      toast({ title: "✅ Residente registrado" });
      resetForm();
      fetchResidents();
    }
  };

  const handleEdit = (r: Resident) => {
    setEditingId(r.id);
    setForm({
      full_name: r.full_name || '',
      document_id: r.document_id || '',
      birth_date: r.birth_date || '',
      birth_place: r.birth_place || '',
      gender: r.gender || 'M',
      eps: r.eps || '',
      blood_type: r.blood_type || '',
      allergies: r.allergies || '',
      emergency_contact_1_name: r.emergency_contact_1_name || '',
      emergency_contact_1_phone: r.emergency_contact_1_phone || '',
      emergency_contact_1_relation: r.emergency_contact_1_relation || '',
      emergency_contact_2_name: '',
      emergency_contact_2_phone: '',
      emergency_contact_2_relation: '',
      responsible_family_name: r.responsible_family_name || '',
      responsible_family_document: r.responsible_family_document || '',
      responsible_family_phone: r.responsible_family_phone || '',
      treating_doctor_name: r.treating_doctor_name || '',
      treating_doctor_phone: r.treating_doctor_phone || '',
      special_diet: r.special_diet || '',
      notes: r.notes || '',
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const { error } = await supabase.from('residents').update({
      full_name: form.full_name,
      document_id: form.document_id || null,
      birth_date: form.birth_date || null,
      birth_place: form.birth_place || null,
      gender: form.gender,
      eps: form.eps || null,
      blood_type: form.blood_type || null,
      allergies: form.allergies || null,
      emergency_contact_1_name: form.emergency_contact_1_name || null,
      emergency_contact_1_phone: form.emergency_contact_1_phone || null,
      emergency_contact_1_relation: form.emergency_contact_1_relation || null,
      responsible_family_name: form.responsible_family_name || null,
      responsible_family_document: form.responsible_family_document || null,
      responsible_family_phone: form.responsible_family_phone || null,
      treating_doctor_name: form.treating_doctor_name || null,
      treating_doctor_phone: form.treating_doctor_phone || null,
      special_diet: form.special_diet || null,
      notes: form.notes || null,
    }).eq('id', editingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Residente actualizado" });
      resetForm();
      fetchResidents();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('residents').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Residente eliminado" });
      setConfirmDelete(null);
      fetchResidents();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('residents').update({ status: newStatus as any }).eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Estado actualizado a ${STATUS_LABELS[newStatus] || newStatus}` });
      setStatusEdit(null);
      fetchResidents();
    }
  };

  const filtered = residents.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()));

  const FIELDS = [
    { label: 'Nombre completo*', key: 'full_name', required: true },
    { label: 'Documento', key: 'document_id' },
    { label: 'Fecha nacimiento', key: 'birth_date', type: 'date' },
    { label: 'Lugar nacimiento', key: 'birth_place' },
    { label: 'EPS', key: 'eps' },
    { label: 'Tipo sangre', key: 'blood_type' },
    { label: 'Alergias', key: 'allergies' },
    { label: 'Dieta especial', key: 'special_diet' },
  ];

  return (
    <div className="animate-fade-in">
      <FormHeader title="Gestión de Residentes" subtitle="Directorio y fichas personales" onBack={onBack} />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar residente..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 min-h-[48px] touch-manipulation">
          <UserPlus size={16} />
          Nuevo Residente
        </button>
      </div>

      {showForm && (
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-foreground">{editingId ? '✏️ Editar Residente' : '➕ Nuevo Residente'}</h3>
            <button type="button" onClick={resetForm} className="p-2 text-muted-foreground hover:text-foreground rounded-lg touch-manipulation">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key as keyof typeof form]}
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
                <input type="text" value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Notas</label>
            <textarea value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm min-h-[60px] resize-y" />
          </div>

          <button type="submit"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase hover:opacity-90 min-h-[48px] touch-manipulation">
            <Save size={16} />
            {editingId ? 'Guardar Cambios' : 'Registrar Residente'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-5 group relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{r.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.document_id || 'Sin documento'}</p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(r)}
                      className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/5 transition-colors touch-manipulation"
                      title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDelete(r.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/5 transition-colors touch-manipulation"
                      title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-bold">EPS:</span> {r.eps || 'N/A'}</p>
                <p><span className="font-bold">Ingreso:</span> {r.admission_date}</p>
                <div className="flex items-center gap-2">
                  <span className="font-bold">Estado:</span>
                  {statusEdit?.id === r.id ? (
                    <select
                      value={statusEdit.status}
                      onChange={e => setStatusEdit({ id: r.id, status: e.target.value })}
                      onBlur={() => { if (statusEdit.status !== r.status) handleStatusChange(r.id, statusEdit.status); else setStatusEdit(null); }}
                      className="text-xs px-2 py-1 rounded-lg border border-input bg-background"
                      autoFocus
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => canManage ? setStatusEdit({ id: r.id, status: r.status }) : null}
                      className={`${canManage ? 'cursor-pointer hover:underline' : 'cursor-default'}`}
                    >
                      {STATUS_LABELS[r.status] || r.status}
                    </button>
                  )}
                </div>
              </div>

              {/* Delete confirmation */}
              {confirmDelete === r.id && (
                <div className="absolute inset-0 bg-card/95 rounded-2xl flex flex-col items-center justify-center p-4 animate-fade-in z-10">
                  <p className="text-xs font-bold text-foreground mb-1">¿Eliminar a {r.full_name}?</p>
                  <p className="text-[10px] text-muted-foreground mb-4 text-center">Esta acción no se puede deshacer. Se eliminarán todos los registros asociados.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(null)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:bg-accent transition-colors touch-manipulation">
                      Cancelar
                    </button>
                    <button onClick={() => handleDelete(r.id)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity touch-manipulation">
                      Sí, eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No se encontraron residentes.</p>}
        </div>
      )}
    </div>
  );
};

export default ResidentManagement;
