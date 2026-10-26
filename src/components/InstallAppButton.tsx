import { useState } from "react";
import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { PLATFORM_LABEL } from "@/lib/install-platform";
import InstallGuide from "@/components/install/InstallGuide";
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
 * "Instalar app" call to action. Uses the browser's own prompt when it offers one
 * (Android Chrome, Samsung, Edge) and otherwise shows the steps for this device.
 * Renders nothing once the app runs installed, or on a computer without a prompt.
 */
const InstallAppButton = ({ variant = "compact" }: InstallAppButtonProps) => {
  const { canInstall, needsGuide, platform, install } = useInstallPrompt();
  const [showGuide, setShowGuide] = useState(false);

  if (!canInstall && !needsGuide) return null;

  const onClick = () => (canInstall ? install() : setShowGuide(true));

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
              Gratis, sin tienda de apps. Ábrela desde tu pantalla de inicio, a pantalla completa.
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

      <InstallGuideDialog open={showGuide} onOpenChange={setShowGuide} platform={platform} />
    </>
  );
};

export const InstallGuideDialog = ({
  open,
  onOpenChange,
  platform,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Parameters<typeof InstallGuide>[0]["platform"];
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Instalar Hogar Belén</DialogTitle>
        <DialogDescription>
          Tres pasos en {PLATFORM_LABEL[platform]}. No ocupa casi espacio y no necesita tienda de apps.
        </DialogDescription>
      </DialogHeader>
      <InstallGuide platform={platform} />
      <a href="/instalar" className="text-xs font-bold text-primary hover:underline text-center pt-1">
        Ver la guía completa y compartirla con el equipo
      </a>
    </DialogContent>
  </Dialog>
);

export default InstallAppButton;
