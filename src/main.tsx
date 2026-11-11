import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerPWA } from "./lib/pwa";

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
