import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import { Camera } from "lucide-react";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }

const LifeHistory = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [form, setForm] = useState({
    preferred_name: '', occupation: '', marital_status: '', children_info: '',
    favorite_food: '', favorite_music: '', hobbies: '', morning_or_night: '',
    spiritual_beliefs: '', most_important_person: '', dislikes: '', dreams: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { supabase.from('residents').select('id, full_name').order('full_name').then(({ data }) => { if (data) setResidents(data); }); }, []);

  useEffect(() => {
    if (!selectedResident) return;
    supabase.from('life_histories').select('*').eq('resident_id', selectedResident).maybeSingle()
      .then(({ data }) => {
        if (data) setForm({
          preferred_name: data.preferred_name || '', occupation: data.occupation || '',
          marital_status: data.marital_status || '', children_info: data.children_info || '',
          favorite_food: data.favorite_food || '', favorite_music: data.favorite_music || '',
          hobbies: data.hobbies || '', morning_or_night: data.morning_or_night || '',
          spiritual_beliefs: data.spiritual_beliefs || '', most_important_person: data.most_important_person || '',
          dislikes: data.dislikes || '', dreams: data.dreams || '',
        });
      });
  }, [selectedResident]);

  const handleSave = async () => {
    if (!selectedResident || !user) return;
    setSaving(true);
    const { error } = await supabase.from('life_histories').upsert({ resident_id: selectedResident, created_by: user.id, ...form }, { onConflict: 'resident_id' });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Historia de vida guardada" });
    setSaving(false);
  };

  const residentName = residents.find(r => r.id === selectedResident)?.full_name || '';

  const fields = [
    { key: 'preferred_name', label: '¿Cómo le gusta que lo llamen?', section: '¿Quién soy yo?' },
    { key: 'occupation', label: 'Oficio / Profesión de vida' },
    { key: 'marital_status', label: 'Estado civil' },
    { key: 'children_info', label: 'Información sobre hijos' },
    { key: 'favorite_food', label: 'Comida favorita', section: 'Mis gustos y preferencias' },
    { key: 'favorite_music', label: 'Música o canciones que le traen recuerdos' },
    { key: 'hobbies', label: 'Pasatiempos' },
    { key: 'morning_or_night', label: '¿Es madrugador o le gusta trasnochar?', type: 'select', options: ['Madrugador', 'Noctámbulo', 'Flexible'] },
    { key: 'spiritual_beliefs', label: 'Creencias religiosas / Prácticas', section: 'Mi entorno espiritual y social' },
    { key: 'most_important_person', label: '¿Quién es la persona más importante para usted hoy?' },
    { key: 'dislikes', label: '¿Qué le molesta o le pone de mal humor?' },
    { key: 'dreams', label: 'Sueños y deseos en el Hogar', type: 'textarea' },
  ];

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F22: Historia de Vida" subtitle="Información biográfica y preferencias del residente" onBack={onBack} />
      <div ref={contentRef}>
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <label className="text-xs font-bold text-muted-foreground uppercase">Residente</label>
          <select value={selectedResident} onChange={e => setSelectedResident(e.target.value)}
            className="mt-1 w-full max-w-md px-4 py-3 rounded-xl border border-input bg-background text-sm">
            <option value="">-- Seleccionar --</option>
            {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </div>
        {selectedResident && (
          <>
            {fields.map((f) => (
              <div key={f.key}>
                {f.section && <h3 className="text-sm font-black text-foreground mt-6 mb-3 bg-primary/10 text-primary px-4 py-2 rounded-xl">{f.section}</h3>}
                <div className="bg-card border border-border rounded-2xl p-4 mb-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      rows={3} className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
                  ) : f.type === 'select' ? (
                    <select value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                      <option value="">-- Seleccionar --</option>
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
                  )}
                </div>
              </div>
            ))}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black text-foreground mb-3">Fotos</h3>
              <label className="flex items-center gap-2 text-sm text-primary font-bold cursor-pointer">
                <Camera size={16} /> Adjuntar fotos
                <input type="file" multiple accept="image/*" className="hidden" onChange={e => setPhotos(Array.from(e.target.files || []))} />
              </label>
              {photos.length > 0 && <p className="text-xs text-muted-foreground mt-2">{photos.length} foto(s) seleccionada(s)</p>}
            </div>
          </>
        )}
      </div>
      {selectedResident && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ExportButtons contentRef={contentRef} title={`HB-F22 Historia de Vida ${residentName}`} fileName={`historia_vida_${residentName}`} textContent={`Historia de Vida - ${residentName}`} />
          <ShareButtons title={`HB-F22 Historia de Vida ${residentName}`} text={`Historia de Vida - ${residentName}`} />
        </div>
      )}
      <ActionButtons onFinish={handleSave} disabled={saving} />
    </div>
  );
};

export default LifeHistory;
