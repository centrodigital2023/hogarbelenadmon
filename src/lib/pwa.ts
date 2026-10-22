import { toast } from "sonner";

/**
 * The service worker is skipped inside iframes and Lovable preview hosts: a cached
 * app shell there would keep showing stale builds while editing.
 */
export const canUseServiceWorker = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (window.self !== window.top) return false;
  const host = window.location.hostname;
  return !host.includes("id-preview--") && !host.endsWith("lovableproject.com") && host !== "localhost";
};

export const registerPWA = async () => {
  if (!canUseServiceWorker()) return;
  const { registerSW } = await import("virtual:pwa-register");
  const updateSW = registerSW({
    onNeedRefresh() {
      toast("Hay una nueva versión de Hogar Belén", {
        description: "Actualiza para usar las últimas mejoras.",
        duration: Infinity,
        action: { label: "Actualizar", onClick: () => updateSW(true) },
      });
    },
    onOfflineReady() {
      toast.success("App guardada en este dispositivo", {
        description: "Abrirá más rápido. Para guardar registros necesitas internet.",
      });
    },
  });
};
