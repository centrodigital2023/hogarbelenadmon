/**
 * Detects how this device installs a web app, so the install guide shows only the
 * steps that apply: Android browsers, iPhone/iPad (Safari or another browser),
 * in-app browsers (WhatsApp, Facebook, Instagram…) that cannot install, or a computer.
 */

export type InstallPlatform =
  | "android"
  | "samsung"
  | "ios-safari"
  | "ios-other"
  | "in-app"
  | "desktop";

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|MicroMessenger|TikTok|Snapchat|; wv\)/i;

export function detectInstallPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (IN_APP.test(userAgent)) return "in-app";
  // iPadOS 13+ reports itself as a Mac; touch support gives it away
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  if (isIOS) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(userAgent) ? "ios-other" : "ios-safari";
  if (/SamsungBrowser/i.test(userAgent)) return "samsung";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

export const isMobilePlatform = (p: InstallPlatform) => p !== "desktop";

export const currentInstallPlatform = (): InstallPlatform =>
  typeof navigator === "undefined" ? "desktop" : detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0);

export interface InstallStep {
  /** Icon name understood by InstallGuide */
  icon: "share" | "plus" | "menu" | "download" | "check" | "external" | "compass";
  text: string;
}

export const PLATFORM_LABEL: Record<InstallPlatform, string> = {
  android: "Android",
  samsung: "Samsung Internet",
  "ios-safari": "iPhone o iPad",
  "ios-other": "iPhone o iPad",
  "in-app": "Navegador de WhatsApp o redes sociales",
  desktop: "Computador",
};

/** Manual steps for when the browser shows no automatic install prompt. */
export function installSteps(platform: InstallPlatform): InstallStep[] {
  switch (platform) {
    case "ios-safari":
      return [
        { icon: "share", text: "Toca el botón **Compartir** (el cuadro con la flecha hacia arriba) en la barra de Safari." },
        { icon: "plus", text: "Baja y elige **Agregar a pantalla de inicio**." },
        { icon: "check", text: "Toca **Agregar**. El ícono de Hogar Belén aparecerá con tus otras apps." },
      ];
    case "ios-other":
      return [
        { icon: "share", text: "Toca el botón **Compartir** junto a la barra de dirección (arriba a la derecha en Chrome)." },
        { icon: "plus", text: "Elige **Agregar a pantalla de inicio**. Si no aparece, abre este enlace en **Safari** y repite." },
        { icon: "check", text: "Toca **Agregar**. El ícono de Hogar Belén aparecerá con tus otras apps." },
      ];
    case "samsung":
      return [
        { icon: "menu", text: "Toca el menú **≡** en la barra inferior." },
        { icon: "plus", text: "Elige **Agregar página a** → **Pantalla de inicio**." },
        { icon: "check", text: "Confirma con **Agregar**." },
      ];
    case "android":
      return [
        { icon: "menu", text: "Toca el menú **⋮** (tres puntos) arriba a la derecha de Chrome." },
        { icon: "download", text: "Elige **Instalar aplicación** (o **Agregar a pantalla principal**)." },
        { icon: "check", text: "Confirma con **Instalar**. La app quedará en tu pantalla de inicio." },
      ];
    case "in-app":
      return [
        { icon: "external", text: "Este navegador interno no permite instalar apps. Toca el menú **⋮** o **…** de esta pantalla." },
        { icon: "compass", text: "Elige **Abrir en Chrome** (Android) o **Abrir en Safari** (iPhone)." },
        { icon: "download", text: "Allí vuelve a tocar **Instalar app** en esta misma página." },
      ];
    case "desktop":
      return [
        { icon: "download", text: "En Chrome o Edge, toca el ícono de **instalar** al final de la barra de dirección." },
        { icon: "check", text: "Confirma con **Instalar**. Hogar Belén se abrirá en su propia ventana." },
        { icon: "compass", text: "¿Lo quieres en el celular? Escanea el código QR con la cámara del teléfono." },
      ];
  }
}
