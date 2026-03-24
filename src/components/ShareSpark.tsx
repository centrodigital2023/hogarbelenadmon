import { Sparkles, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareSparkProps {
  text: string;
  hashtags?: string;
  title?: string;
}

const ShareSpark = ({ text, hashtags, title = "Hogar Belén" }: ShareSparkProps) => {
  const { toast } = useToast();

  const getSparkContent = () =>
    [text, hashtags].filter(Boolean).join("\n\n");

  const shareSpark = async () => {
    const content = getSparkContent();
    if (navigator.share) {
      try {
        await navigator.share({ title, text: content });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "✨ Copiado para Spark", description: "Pega el contenido en Spark para publicar." });
    } catch {
      toast({ title: "No se pudo copiar", description: "Copia el texto manualmente.", variant: "destructive" });
    }
  };

  const copyForSpark = async () => {
    try {
      await navigator.clipboard.writeText(getSparkContent());
      toast({ title: "✨ Listo para Spark", description: "Contenido copiado. Ábrelo en Spark y pégalo." });
    } catch {
      toast({ title: "No se pudo copiar", description: "Copia el texto manualmente.", variant: "destructive" });
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={shareSpark}
        className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-500/20 transition-colors min-h-[40px]"
      >
        <Sparkles size={14} /> Spark
      </button>
      <button
        onClick={copyForSpark}
        className="flex items-center gap-1.5 bg-muted text-foreground px-3 py-2 rounded-xl text-xs font-bold hover:bg-muted/80 transition-colors min-h-[40px]"
      >
        <Copy size={14} />
      </button>
    </div>
  );
};

export default ShareSpark;
