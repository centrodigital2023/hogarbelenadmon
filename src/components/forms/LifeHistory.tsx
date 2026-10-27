import { useState, useEffect, useRef } from "react";
import type { TablesInsert } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import ShareButtons from "@/components/ShareButtons";
import SignaturePad from "@/components/SignaturePad";
import { Camera, Sparkles, Loader2, History, ChevronDown, ChevronUp, Upload, User } from "lucide-react";
import { errorMessage } from "@/lib/errors";
import DictationTextarea from "@/components/DictationTextarea";
import LifeHistoryDictation from "@/components/forms/LifeHistoryDictation";
import { EMPTY_LIFE_FORM, type LifeHistoryForm } from "@/lib/life-history-dictation";

interface Props { onBack: () => void; }
interface Resident { id: string; full_name: string; }
interface HistoryEntry { date: string; data: Record<string, string>; version: number; }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const LifeHistory = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [form, setForm] = useState<LifeHistoryForm>(EMPTY_LIFE_FORM);
  /** Campos que llegaron del dictado y aún no se han revisado a mano. */
  const [fromDictation, setFromDictation] = useState<Set<string>>(new Set());
  const [existingId, setExistingId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [generating, setGenerating] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    supabase.from('residents').select('id, full_name').order('full_name').then(({ data }) => { if (data) setResidents(data); });
  }, []);

  const loadVersions = async (lifeHistoryId: string | null) => {
    if (!lifeHistoryId) { setHistory([]); return; }
    const { data } = await supabase.from('life_history_versions').select('*')
      .eq('life_history_id', lifeHistoryId)
      .order('version', { ascending: false }).limit(20);
    setHistory((data ?? []).map(v => ({
      date: new Date(v.created_at).toLocaleString('es-CO'),
      data: v.data as unknown as Record<string, string>,
      version: v.version,
    })));
  };

  useEffect(() => {
    setPhotos([]);
    setSignature(null);
    setFromDictation(new Set());
    if (!selectedResident) return;
    supabase.from('life_histories').select('*').eq('resident_id', selectedResident)
      .order('updated_at', { ascending: false }).limit(1)
      .then(({ data: rows }) => {
        const data = rows?.[0];
        setExistingId(data?.id ?? null);
        loadVersions(data?.id ?? null);
        setAvatarPreview(null);
        if (!data) setForm(EMPTY_LIFE_FORM);
        if (data) {
          setForm({
            preferred_name: data.preferred_name || '', occupation: data.occupation || '',
            marital_status: data.marital_status || '', children_info: data.children_info || '',
            favorite_food: data.favorite_food || '', favorite_music: data.favorite_music || '',
            hobbies: data.hobbies || '', morning_or_night: data.morning_or_night || '',
            spiritual_beliefs: data.spiritual_beliefs || '', most_important_person: data.most_important_person || '',
            dislikes: data.dislikes || '', dreams: data.dreams || '',
          });
          const photoArr = data.photos as string[] | null;
          if (photoArr && photoArr.length > 0) setAvatarPreview(photoArr[0]);
        }
      });
  }, [selectedResident]);

  // The portrait is kept small (max 480 px JPEG) so the record stays light on phones
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 480 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatarPreview(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAIGenerate = async () => {
    if (!keywords.trim()) {
      toast({ title: "Ingrese palabras clave", description: "Ej: Bogotá, ingeniería, 3 hijos, católico, boleros", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const residentName = residents.find(r => r.id === selectedResident)?.full_name || '';
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-life-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ keywords, currentForm: form, residentName }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      if (result.data) {
        setForm(prev => {
          const updated = { ...prev };
          Object.entries(result.data).forEach(([key, val]) => {
            if (key in updated && val && typeof val === 'string') {
              updated[key as keyof typeof updated] = val;
            }
          });
          return updated;
        });
        toast({ title: "✨ Historia generada por IA", description: "Revise y ajuste el contenido antes de guardar." });
      }
    } catch (err) {
      toast({ title: "Error al generar", description: errorMessage(err), variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!selectedResident || !user) return;
    setSaving(true);
    const payload: TablesInsert<"life_histories"> = { resident_id: selectedResident, created_by: user.id, ...form };
    if (avatarPreview) payload.photos = [avatarPreview];
    // Before overwriting, keep the previous text as a version that can be restored
    if (existingId) {
      const { data: current } = await supabase.from('life_histories').select('*').eq('id', existingId).single();
      if (current) {
        const { photos: _photos, ...previousData } = current;
        await supabase.from('life_history_versions').insert({
          life_history_id: existingId, modified_by: user.id,
          version: (history[0]?.version ?? 0) + 1, data: previousData,
        });
      }
    }
    // No hay restricción única por residente en la base: se actualiza el registro existente o se crea uno
    const { data, error } = existingId
      ? await supabase.from('life_histories').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existingId).select('id').single()
      : await supabase.from('life_histories').insert(payload).select('id').single();
    if (error) { toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" }); setSaving(false); return; }
    setExistingId(data.id);
    loadVersions(data.id);
    setFromDictation(new Set());

    // Extra photos go to the resident's documents, where the whole team can see them
    let uploaded = 0;
    for (const photo of photos) {
      const path = `residents/${selectedResident}/${Date.now()}_historia_vida_${photo.name.normalize('NFD').replace(/[^\w.-]+/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, photo, { contentType: photo.type || undefined });
      if (upErr) continue;
      const { error: dbErr } = await supabase.from('document_attachments').insert({
        entity_type: 'resident', entity_id: selectedResident, file_name: `Historia de vida - ${photo.name}`, file_type: 'image', file_url: path, uploaded_by: user.id,
      });
      if (!dbErr) uploaded++;
    }
    setPhotos([]);
    toast({
      title: "Historia de vida guardada ✅",
      description: photos.length ? `${uploaded} de ${photos.length} fotos quedaron en Documentos del residente.` : undefined,
      variant: photos.length && uploaded < photos.length ? "destructive" : undefined,
    });
    setSaving(false);
  };

  const loadVersion = (entry: HistoryEntry) => {
    setForm(prev => {
      const updated = { ...prev };
      Object.entries(entry.data).forEach(([key, val]) => {
        if (key in updated) updated[key as keyof typeof updated] = String(val || '');
      });
      return updated;
    });
    toast({ title: `Versión ${entry.version} cargada`, description: "Recuerde guardar para aplicar cambios." });
  };

  const residentName = residents.find(r => r.id === selectedResident)?.full_name || '';

  const setField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFromDictation(prev => { if (!prev.has(key)) return prev; const next = new Set(prev); next.delete(key); return next; });
  };

  const applyDictation = (values: Partial<LifeHistoryForm>) => {
    setForm(prev => ({ ...prev, ...values }));
    setFromDictation(prev => new Set([...prev, ...Object.keys(values)]));
  };

  const fields = [
    { key: 'preferred_name', label: '¿Cómo le gusta que lo llamen?', icon: '👤', section: '¿Quién soy yo?' },
    { key: 'occupation', label: 'Oficio / Profesión de vida', icon: '💼' },
    { key: 'marital_status', label: 'Estado civil', icon: '💍' },
    { key: 'children_info', label: 'Información sobre hijos', icon: '👨‍👩‍👧‍👦' },
    { key: 'favorite_food', label: 'Comida favorita', icon: '🍲', section: 'Mis gustos y preferencias' },
    { key: 'favorite_music', label: 'Música o canciones que le traen recuerdos', icon: '🎵' },
    { key: 'hobbies', label: 'Pasatiempos', icon: '🎨' },
    { key: 'morning_or_night', label: '¿Es madrugador o le gusta trasnochar?', icon: '🌅', type: 'select', options: ['Madrugador', 'Noctámbulo', 'Flexible'] },
    { key: 'spiritual_beliefs', label: 'Creencias religiosas / Prácticas', icon: '🙏', section: 'Mi entorno espiritual y social' },
    { key: 'most_important_person', label: '¿Quién es la persona más importante para usted hoy?', icon: '❤️' },
    { key: 'dislikes', label: '¿Qué le molesta o le pone de mal humor?', icon: '😤' },
    { key: 'dreams', label: 'Sueños y deseos en el Hogar', icon: '⭐', type: 'textarea' },
  ];

  return (
    <div className="animate-fade-in">
      <FormHeader title="HB-F22: Historia de Vida" subtitle="Información biográfica y preferencias del residente • Dicte la historia por voz y la IA la organiza" onBack={onBack} />
      <div ref={contentRef}>
        {/* Resident selector */}
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
            <LifeHistoryDictation key={selectedResident} residentId={selectedResident} residentName={residentName} form={form} onApply={applyDictation} />

            {/* Avatar + AI Keywords Section */}
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-primary/30 bg-background flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Foto residente" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <User size={40} className="text-muted-foreground/40" />
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-primary font-bold cursor-pointer hover:underline">
                    <Upload size={12} /> Subir foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>

                {/* AI Keywords */}
                <div className="flex-1">
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-primary" /> Generación Inteligente con IA
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Ingrese palabras clave y la IA generará una narrativa biográfica coherente y cálida.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={keywords}
                      onChange={e => setKeywords(e.target.value)}
                      placeholder="Ej: Bogotá, ingeniería, 3 hijos, católico, boleros, madrugador..."
                      className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-sm"
                    />
                    <button
                      onClick={handleAIGenerate}
                      disabled={generating || !keywords.trim()}
                      className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-[160px]"
                    >
                      {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {generating ? 'Generando...' : 'Generar con IA'}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 italic">
                    💡 Tip: Incluya ciudad natal, profesión, número de hijos, religión, género musical favorito, rutina (madrugador/noctámbulo).
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            {fields.map((f) => (
              <div key={f.key}>
                {f.section && (
                  <h3 className="text-sm font-black text-foreground mt-6 mb-3 bg-primary/10 text-primary px-4 py-2 rounded-xl flex items-center gap-2">
                    {f.section}
                  </h3>
                )}
                <div className={`bg-card border rounded-2xl p-4 mb-3 transition ${fromDictation.has(f.key) ? 'border-primary/50 ring-2 ring-primary/10' : 'border-border'}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <span>{f.icon}</span> {f.label}
                    </span>
                    {fromDictation.has(f.key) && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">✨ Del dictado · revise</span>
                    )}
                  </div>
                  {f.type === 'select' ? (
                    <select value={form[f.key as keyof typeof form]} onChange={e => setField(f.key, e.target.value)} aria-label={f.label}
                      className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm">
                      <option value="">-- Seleccionar --</option>
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <DictationTextarea value={form[f.key as keyof typeof form]} onChange={v => setField(f.key, v)} minRows={f.type === 'textarea' ? 3 : 1} />
                  )}
                </div>
              </div>
            ))}

            {/* Photos section */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black text-foreground mb-3">📷 Fotos adicionales</h3>
              <label className="flex items-center gap-2 text-sm text-primary font-bold cursor-pointer hover:underline">
                <Camera size={16} /> Adjuntar fotos
                <input type="file" multiple accept="image/*" className="hidden" onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setPhotos(prev => [...prev, ...files]);
                }} />
              </label>
              {photos.length > 0 && <p className="text-xs text-muted-foreground mt-2">{photos.length} foto(s) listas: se guardan en Documentos del residente al tocar Guardar.</p>}
            </div>

            {/* Digital Signature */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-black text-foreground mb-4">✍️ Firma del profesional responsable</h3>
              <div className="flex flex-col items-center">
                <SignaturePad label="Firma del responsable" value={signature || undefined} onChange={setSignature} />
                {signature && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    🕐 Timestamp: {new Date().toLocaleString('es-CO')} — Firma vinculada al registro
                  </p>
                )}
              </div>
            </div>

            {/* Version History */}
            {history.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 mb-6">
                <button onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-sm font-bold text-foreground w-full">
                  <History size={16} className="text-primary" />
                  Historial de versiones ({history.length})
                  {showHistory ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
                </button>
                {showHistory && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {history.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-xs font-bold">Versión {entry.version}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.date}</p>
                        </div>
                        <button onClick={() => loadVersion(entry)}
                          className="text-[10px] text-primary font-bold hover:underline">
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Export + Share + Actions */}
      {selectedResident && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ExportButtons contentRef={contentRef} title={`HB-F22 Historia de Vida ${residentName}`} fileName={`historia_vida_${residentName}`} textContent={`Historia de Vida - ${residentName}\n\n${Object.entries(form).map(([k, v]) => `${k}: ${v}`).join('\n')}`} />
          <ShareButtons title={`HB-F22 Historia de Vida ${residentName}`} text={`Historia de Vida - ${residentName}`} />
        </div>
      )}
      <ActionButtons onFinish={handleSave} saving={saving} missing={selectedResident ? [] : ['residente']} />
    </div>
  );
};

export default LifeHistory;
