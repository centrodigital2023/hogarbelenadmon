import { MessageCircle, Share2 } from "lucide-react";

interface ShareWhatsAppProps {
  residentName: string;
  date: string;
  shift?: string;
  nutrition?: number | null;
  hydration?: number | null;
  mood?: string | null;
  observations?: string | null;
}

const ShareWhatsApp = ({ residentName, date, shift, nutrition, hydration, mood, observations }: ShareWhatsAppProps) => {
  const generateMessage = () => {
    const lines = [
      `🏠 *Hogar Belén - Bitácora Diaria*`,
      `📅 Fecha: ${date}`,
      shift ? `🕐 Turno: ${shift}` : '',
      `👤 Residente: ${residentName}`,
      '',
      nutrition != null ? `🍽️ Nutrición: ${nutrition}%` : '',
      hydration != null ? `💧 Hidratación: ${hydration} vasos` : '',
      mood ? `😊 Ánimo: ${mood}` : '',
      observations ? `📝 Observaciones: ${observations}` : '',
      '',
      `_Juntos, Cuidamos Mejor_ ❤️`,
      `📞 3117015258 | hogarbelen2022@gmail.com`,
    ].filter(Boolean).join('\n');
    return encodeURIComponent(lines);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${generateMessage()}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({ title: `Bitácora - ${residentName}`, text: decodeURIComponent(generateMessage()) });
    } else {
      shareWhatsApp();
    }
  };

  return (
    <div className="flex gap-2">
      <button onClick={shareWhatsApp}
        className="flex items-center gap-1.5 bg-green-500/10 text-green-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-colors min-h-[40px]">
        <MessageCircle size={14} /> WhatsApp
      </button>
      <button onClick={shareNative}
        className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-2 rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors min-h-[40px]">
        <Share2 size={14} />
      </button>
    </div>
  );
};

export default ShareWhatsApp;
