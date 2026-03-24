import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import ShareSpark from "@/components/ShareSpark";
import { Sparkles, Send, Calendar, Copy } from "lucide-react";

interface Props { onBack: () => void; }

const PLATFORMS = ['Facebook', 'Instagram', 'Twitter', 'WhatsApp', 'Spark'];

const SocialMediaModule = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const generateContent = async () => {
    if (!prompt) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-nursing-notes', {
        body: {
          prompt: `Genera un post para redes sociales de un hogar geriátrico llamado "Hogar Belén" en Buesaco, Nariño, Colombia. El tema es: ${prompt}. Incluye un texto emotivo pero profesional, hashtags relevantes y un llamado a la acción. Formato: TEXTO:\n[texto]\nHASHTAGS:\n[hashtags]`,
        }
      });
      if (data?.note) {
        const parts = data.note.split('HASHTAGS:');
        setGeneratedText(parts[0]?.replace('TEXTO:', '')?.trim() || data.note);
        setHashtags(parts[1]?.trim() || '#HogarBelen #CuidadoPersonaMayor');
      }
    } catch (e) {
      toast({ title: "Error generando contenido", variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!user || !generatedText) return;
    setSaving(true);
    await (supabase.from('social_media_posts' as any) as any).insert({
      platforms: selectedPlatforms, content_text: generatedText,
      hashtags, status: scheduledAt ? 'programada' : 'borrador',
      scheduled_at: scheduledAt || null, ai_generated: true, created_by: user.id,
    });
    toast({ title: "Publicación guardada" });
    setSaving(false);
    setGeneratedText(""); setPrompt(""); setHashtags("");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${generatedText}\n\n${hashtags}`);
    toast({ title: "Copiado al portapapeles" });
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`${generatedText}\n\n${hashtags}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <FormHeader title="📱 Redes Sociales con IA" subtitle="Genera y programa publicaciones" onBack={onBack} />

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-sm font-black text-foreground mb-3">Generar Contenido con IA</h3>
        <div className="flex gap-2">
          <input value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="Ej: Taller de manualidades, celebración de cumpleaños..."
            className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          <button onClick={generateContent} disabled={generating || !prompt}
            className="bg-primary text-primary-foreground px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-40">
            <Sparkles size={14} /> {generating ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>

      {generatedText && (
        <>
          <div className="bg-card border border-border rounded-2xl p-6">
            <label className="text-xs font-bold text-muted-foreground uppercase">Texto (editable)</label>
            <textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)} rows={6}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none" />
            <label className="text-xs font-bold text-muted-foreground uppercase mt-4 block">Hashtags</label>
            <input value={hashtags} onChange={e => setHashtags(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-black text-foreground mb-3">Plataformas</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {PLATFORMS.map(p => (
                <button key={p} onClick={() => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedPlatforms.includes(p) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {p}
                </button>
              ))}
            </div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Programar (opcional)</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="mt-1 w-full max-w-xs px-3 py-2 rounded-xl border border-input bg-background text-sm" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={handleSave} disabled={saving}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-40">
              <Send size={14} /> Guardar Publicación
            </button>
            <button onClick={copyToClipboard}
              className="bg-muted text-foreground px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90">
              <Copy size={14} /> Copiar
            </button>
            <button onClick={shareWhatsApp}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90">
              <Send size={14} /> WhatsApp
            </button>
            <ShareSpark text={generatedText} hashtags={hashtags} />
          </div>
        </>
      )}
    </div>
  );
};

export default SocialMediaModule;
