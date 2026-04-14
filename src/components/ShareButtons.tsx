import { MessageCircle, Mail, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonsProps {
  title: string;
  text?: string;
}

const ShareButtons = ({ title, text }: ShareButtonsProps) => {
  const { toast } = useToast();

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`📄 *${title}*\n\n${(text || '').slice(0, 1000)}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`${title} - ${new Date().toLocaleDateString('es-CO')}`);
    const body = encodeURIComponent(text || title);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
    </div>
  );
};

export default ShareButtons;
