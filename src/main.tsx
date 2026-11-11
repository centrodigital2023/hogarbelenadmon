import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPWA } from "./lib/pwa";
import { hasStoredSession } from "./lib/app-shell";

// Start the screen this visit needs right away instead of after the app starts.
// Signed-in staff go straight to the dashboard.
if (window.location.pathname !== "/instalar") {
  void import("./app/SignedArea");
  if (hasStoredSession() && window.location.pathname === "/") void import("./pages/Index");
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

// Do not compete with the first screen: offline precaching can download many modules.
const schedulePWA = () => {
  window.setTimeout(() => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => { void registerPWA(); }, { timeout: 5000 });
    } else {
      void registerPWA();
    }
  }, 15000);
};
if (document.readyState === "complete") schedulePWA();
else window.addEventListener("load", schedulePWA, { once: true });
