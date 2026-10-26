import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { Upload, Image, Loader2, Trash2 } from "lucide-react";
import { signedDocumentUrl } from "@/lib/private-documents";

interface Props { onBack: () => void; }

const LogoSettings = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data, error } = await supabase.from('system_settings').select('value').eq('key', 'logo_url').maybeSingle();
        if (error) throw error;
        const url = data?.value ? await signedDocumentUrl(data.value, 3600) : null;
        if (active) setLogoUrl(url);
      } catch (error) {
        if (active) toast({ title: "No se pudo mostrar el logo", description: error instanceof Error ? error.message : "Intente de nuevo", variant: "destructive" });
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 50 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [toast]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Máximo 2 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `branding/logo_${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setUploading(false); return; }

    // Upsert setting
    const { data: existing } = await supabase.from('system_settings').select('id').eq('key', 'logo_url').maybeSingle();
    const { error: dbError } = existing
      ? await supabase.from('system_settings').update({ value: path, updated_by: user.id }).eq('key', 'logo_url')
      : await supabase.from('system_settings').insert({ key: 'logo_url', value: path, updated_by: user.id });
    if (dbError) { toast({ title: "No se pudo guardar", description: dbError.message, variant: "destructive" }); setUploading(false); return; }

    try {
      setLogoUrl(await signedDocumentUrl(path, 3600));
    } catch (error) {
      toast({ title: "Logo guardado, pero no se pudo mostrar", description: error instanceof Error ? error.message : "Intente de nuevo", variant: "destructive" });
      setUploading(false);
      return;
    }
    setUploading(false);
    toast({ title: "Logo actualizado" });
  };

  const handleRemove = async () => {
    await supabase.from('system_settings').update({ value: null }).eq('key', 'logo_url');
    setLogoUrl(null);
    toast({ title: "Logo eliminado" });
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="Configuración del Sistema" subtitle="Logo institucional y ajustes" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-8 max-w-lg">
        <h3 className="text-sm font-black text-foreground mb-6 flex items-center gap-2">
          <Image size={16} className="text-primary" /> Logo Institucional
        </h3>

        <div className="flex flex-col items-center gap-6">
          {logoUrl ? (
            <div className="relative">
              <img src={logoUrl} alt="Logo" className="w-48 h-48 object-contain rounded-2xl border-2 border-border bg-white p-4" />
              <button onClick={handleRemove}
                className="absolute -top-2 -right-2 w-8 h-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <div className="w-48 h-48 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
              <Image size={32} className="mb-2 opacity-30" />
              <span className="text-xs font-medium">Sin logo</span>
              <span className="text-[10px]">Hogar Belén</span>
            </div>
          )}

          <label className={`flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold cursor-pointer min-h-[48px] ${uploading ? 'opacity-40' : 'hover:opacity-90'}`}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Subiendo...' : 'Subir logo (PNG, JPG, SVG)'}
            <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.svg" disabled={uploading}
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </label>

          <p className="text-[10px] text-muted-foreground text-center">
            Dimensiones recomendadas: 200×200 px • Máximo 2 MB<br />
            Se mostrará en encabezado y documentos exportados
          </p>
        </div>
      </div>
    </div>
  );
};

export default LogoSettings;
