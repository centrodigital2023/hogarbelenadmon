import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window);

// Chrome fires beforeinstallprompt once per page load, often before React mounts
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    listeners.forEach((l) => l());
  });
}

/**
 * Exposes whether the app can be installed and a function to install it.
 * On iOS there is no install prompt, so `iosInstructions` tells the UI to explain
 * "Compartir → Agregar a pantalla de inicio" instead.
 */
export const useInstallPrompt = () => {
  const [, rerender] = useState(0);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandalone());

  useEffect(() => {
    const update = () => {
      rerender((n) => n + 1);
      setInstalled(isStandalone());
    };
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    rerender((n) => n + 1);
    return outcome === "accepted";
  };

  return {
    installed,
    canInstall: !installed && deferredPrompt !== null,
    iosInstructions: !installed && isIOS(),
    install,
  };
};
