import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { CheckCircle2, Copy, Download, Share2, Smartphone, Store, Zap } from "lucide-react";
import { toast } from "sonner";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { PLATFORM_LABEL, type InstallPlatform } from "@/lib/install-platform";
import InstallGuide from "@/components/install/InstallGuide";
import logo from "@/assets/logo.png";

const TABS: { platform: InstallPlatform; label: string }[] = [
  { platform: "android", label: "Android" },
  { platform: "ios-safari", label: "iPhone" },
  { platform: "desktop", label: "Computador" },
];

const SHORT_LABEL: Partial<Record<InstallPlatform, string>> = {
  samsung: "Samsung",
  "ios-other": "iPhone",
  "in-app": "WhatsApp",
};

const tabFor = (p: InstallPlatform): InstallPlatform =>
  p === "samsung" || p === "ios-other" || p === "in-app" ? p : TABS.some((t) => t.platform === p) ? p : "android";

const BENEFITS = [
  { icon: Smartphone, title: "Con un toque", text: "Queda en tu pantalla de inicio como cualquier app." },
  { icon: Zap, title: "Más rápida", text: "Se guarda en el teléfono y abre al instante." },
  { icon: Store, title: "Sin tienda de apps", text: "Gratis, casi no ocupa espacio y se actualiza sola." },
];

/**
 * Public page (no login) to share with the team: installs the app with the browser's
 * prompt when available, otherwise shows the steps for the detected device, plus a QR
 * code and share buttons to send the link by WhatsApp.
 */
const Install = () => {
  const { installed, canInstall, platform, install } = useInstallPrompt();
  const [tab, setTab] = useState<InstallPlatform>(() => tabFor(platform));
  const [qr, setQr] = useState<string | null>(null);
  const url = `${window.location.origin}/instalar`;
  const shareText = "Instala la app de Hogar Belén en tu celular:";

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#3B0A12", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Hogar Belén", text: shareText, url });
        return;
      } catch {
        // Cancelled by the user: fall through to copying the link
      }
    }
    copy();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado", { description: "Pégalo en WhatsApp o en un correo." });
    } catch {
      toast(url);
    }
  };

  const onInstall = async () => {
    const accepted = await install();
    if (accepted) toast.success("¡Listo! Busca Hogar Belén en tu pantalla de inicio.");
  };

  const detectedTab = tabFor(platform);
  const tabs = TABS.some((t) => t.platform === detectedTab)
    ? TABS
    : [{ platform: detectedTab, label: SHORT_LABEL[detectedTab] ?? PLATFORM_LABEL[detectedTab] }, ...TABS];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-8 safe-top safe-bottom">
        <header className="text-center">
          <img src={logo} alt="Hogar Belén" className="w-20 h-20 mx-auto rounded-2xl bg-card shadow-sm object-contain p-2" />
          <h1 className="mt-4 text-2xl font-black text-foreground">Hogar Belén en tu celular</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Instala la app del equipo en menos de un minuto. Funciona en Android, iPhone y computador.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          {installed ? (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="text-emerald-600 shrink-0" />
              <span className="text-foreground font-bold">Ya tienes la app instalada en este dispositivo.</span>
            </div>
          ) : canInstall ? (
            <div className="text-center">
              <button
                type="button"
                onClick={onInstall}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-black text-primary-foreground hover:opacity-90 touch-manipulation"
              >
                <Download size={20} />
                Instalar ahora
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Tu teléfono te pedirá confirmar. Toca «Instalar».</p>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Tipo de dispositivo" className="flex gap-1 rounded-xl bg-muted p-1 mb-4">
                {tabs.map((t) => (
                  <button
                    key={t.platform}
                    role="tab"
                    aria-selected={tab === t.platform}
                    onClick={() => setTab(t.platform)}
                    className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
                      tab === t.platform ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {t.label}
                    {t.platform === detectedTab && <span className="sr-only"> (este dispositivo)</span>}
                  </button>
                ))}
              </div>
              <InstallGuide platform={tab} />
            </>
          )}
        </section>

        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-xl bg-muted/60 p-3 flex sm:block items-start gap-3">
              <Icon size={18} className="text-primary shrink-0" />
              <span>
                <span className="block text-sm font-black text-foreground sm:mt-2">{title}</span>
                <span className="block text-xs text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row items-center gap-5">
          {qr && (
            <img
              src={qr}
              alt="Código QR para abrir esta página en el celular"
              className="w-40 h-40 rounded-xl border border-border bg-white p-1"
            />
          )}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-sm font-black text-foreground">Compártela con el equipo</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Escanea el código con la cámara del celular o envía el enlace por WhatsApp.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:opacity-90"
              >
                <Share2 size={14} />
                WhatsApp
              </a>
              <button
                type="button"
                onClick={share}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                <Copy size={14} />
                {typeof navigator !== "undefined" && "share" in navigator ? "Compartir" : "Copiar enlace"}
              </button>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-bold text-primary hover:underline">
            {installed ? "Abrir Hogar Belén" : "Continuar en el navegador →"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Install;
