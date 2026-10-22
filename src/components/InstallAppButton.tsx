import { useState } from "react";
import { Download, Share, SquarePlus } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InstallAppButtonProps {
  variant?: "compact" | "card";
}

/**
 * "Instalar app" call to action. Uses the native prompt on Android/Chrome/Edge and
 * shows step-by-step instructions on iPhone/iPad, where no prompt exists.
 * Renders nothing once the app runs installed.
 */
const InstallAppButton = ({ variant = "compact" }: InstallAppButtonProps) => {
  const { canInstall, iosInstructions, install } = useInstallPrompt();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (!canInstall && !iosInstructions) return null;

  const onClick = () => (canInstall ? install() : setShowIOSHelp(true));

  return (
    <>
      {variant === "card" ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-left hover:border-primary transition-colors min-h-[56px]"
        >
          <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Download size={18} />
          </span>
          <span>
            <span className="block text-sm font-black text-foreground">Instala Hogar Belén en tu celular</span>
            <span className="block text-xs text-muted-foreground">
              Ábrela desde tu pantalla de inicio, a pantalla completa y más rápida.
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-black text-primary-foreground hover:opacity-90 touch-manipulation min-h-[32px]"
        >
          <Download size={14} />
          Instalar app
        </button>
      )}

      <Dialog open={showIOSHelp} onOpenChange={setShowIOSHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar en iPhone o iPad</DialogTitle>
            <DialogDescription>Son solo dos pasos desde Safari.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Share size={16} />
              </span>
              Toca el botón <strong>Compartir</strong> en la barra de Safari.
            </li>
            <li className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <SquarePlus size={16} />
              </span>
              Elige <strong>Agregar a pantalla de inicio</strong> y confirma.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppButton;
