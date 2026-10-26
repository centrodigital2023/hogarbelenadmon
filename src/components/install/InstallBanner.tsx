import { useState } from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallGuideDialog } from "@/components/InstallAppButton";
import logo from "@/assets/logo.png";

const DISMISS_KEY = "hb-install-banner-dismissed";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const wasDismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

/**
 * Friendly invitation to install, shown on phones inside the app until the person
 * installs it or closes it (it comes back after 14 days).
 */
const InstallBanner = () => {
  const { canInstall, needsGuide, platform, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(wasDismissedRecently);
  const [showGuide, setShowGuide] = useState(false);

  if (hidden || (!canInstall && !needsGuide)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: the banner simply comes back next visit
    }
    setHidden(true);
  };

  return (
    <div className="lg:hidden mx-4 mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3 animate-fade-in">
      <img src={logo} alt="" className="w-11 h-11 rounded-xl bg-card object-contain p-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-foreground leading-tight">Lleva Hogar Belén en tu celular</p>
        <p className="text-[11px] text-muted-foreground leading-snug">Ábrela con un toque, a pantalla completa.</p>
      </div>
      <button
        type="button"
        onClick={() => (canInstall ? install() : setShowGuide(true))}
        className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-black text-primary-foreground touch-manipulation min-h-[40px] shrink-0"
      >
        <Download size={14} />
        Instalar
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ahora no"
        className="p-1.5 -mr-1 rounded-lg text-muted-foreground hover:bg-muted shrink-0"
      >
        <X size={16} />
      </button>
      <InstallGuideDialog open={showGuide} onOpenChange={setShowGuide} platform={platform} />
    </div>
  );
};

export default InstallBanner;
