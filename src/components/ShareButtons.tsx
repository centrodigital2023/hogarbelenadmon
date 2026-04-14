import { useState } from "react";
import { MessageCircle, Mail, Share2, HardDrive, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  title: string;
  text?: string;
  getFileBlob?: () => Promise<{ blob: Blob; fileName: string; mimeType: string } | null>;
}

const ShareButtons = ({ title, text, getFileBlob }: ShareButtonsProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`📄 *${title}*\n\n${(text || '').slice(0, 1000)}`);
    window.open(`https://wa.me/3117015258?text=${msg}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`${title} - ${new Date().toLocaleDateString('es-CO')}`);
    const body = encodeURIComponent(text || title);
    window.location.href = `mailto:hogarbelen2022@gmail.com?subject=${subject}&body=${body}`;
  };

  const shareSocial = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: (text || '').slice(0, 500), url: window.location.href });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text || title);
      toast({ title: "Copiado", description: "Texto copiado al portapapeles" });
    }
  };

  const uploadToDrive = async () => {
    if (!getFileBlob) {
      toast({ title: "No disponible", description: "Primero genere o exporte el documento", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const result = await getFileBlob();
      if (!result) {
        toast({ title: "Error", description: "No se pudo generar el archivo", variant: "destructive" });
        return;
      }

      // Convert blob to base64
      const buffer = await result.blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileBase64 = btoa(binary);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch(`${supabaseUrl}/functions/v1/upload-drive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          fileBase64,
          fileName: result.fileName,
          mimeType: result.mimeType,
        }),
      });

      const data = await resp.json();
      if (data.success) {
        toast({
          title: "✅ Subido a Google Drive",
          description: `Archivo "${data.file?.name}" guardado exitosamente`,
        });
        if (data.file?.webViewLink) {
          window.open(data.file.webViewLink, "_blank");
        }
      } else {
        throw new Error(data.error || "Error desconocido");
      }
    } catch (e: any) {
      console.error("Drive upload error:", e);
      toast({ title: "Error al subir", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={shareWhatsApp}
        className="flex items-center gap-1.5 bg-green-600/10 text-green-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-600/20 transition-colors min-h-[40px]">
        <MessageCircle size={14} /> WhatsApp
      </button>
      <button onClick={shareEmail}
        className="flex items-center gap-1.5 bg-blue-600/10 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600/20 transition-colors min-h-[40px]">
        <Mail size={14} /> Email
      </button>
      <button onClick={shareSocial}
        className="flex items-center gap-1.5 bg-purple-600/10 text-purple-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-600/20 transition-colors min-h-[40px]">
        <Share2 size={14} /> Compartir
      </button>
      <button onClick={uploadToDrive} disabled={uploading || !getFileBlob}
        className="flex items-center gap-1.5 bg-yellow-600/10 text-yellow-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-600/20 transition-colors disabled:opacity-40 min-h-[40px]">
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
        Google Drive
      </button>
    </div>
  );
};

export default ShareButtons;
