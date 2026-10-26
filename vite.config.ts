import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Registration is done in src/lib/pwa.ts so it can be skipped inside the Lovable editor preview
      injectRegister: null,
      registerType: "prompt",
      includeAssets: ["favicon.ico", "icons/apple-touch-icon.png", "robots.txt"],
      manifest: {
        id: "/",
        name: "Hogar Belén Gestión",
        short_name: "Hogar Belén",
        description:
          "Sistema integral de gestión geriátrica: admisión, valoraciones, bitácora, alimentación, terapias y más.",
        lang: "es-CO",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "any",
        background_color: "#FFFFFF",
        theme_color: "#9B1B30",
        categories: ["medical", "health", "productivity"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        prefer_related_applications: false,
        // Screenshots enable the richer install sheet on Android and desktop Chrome
        screenshots: [
          { src: "/screenshots/inicio-celular.webp", sizes: "540x1099", type: "image/webp", form_factor: "narrow", label: "Inicio de sesión" },
          { src: "/screenshots/inteligencia-celular.webp", sizes: "540x1099", type: "image/webp", form_factor: "narrow", label: "Centro de Inteligencia Clínica" },
          { src: "/screenshots/inicio-computador.webp", sizes: "1280x720", type: "image/webp", form_factor: "wide", label: "Hogar Belén en el computador" },
        ],
        shortcuts: [
          { name: "Bitácora diaria", short_name: "Bitácora", url: "/?modulo=4&form=HB-F4", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
          { name: "Valoración geriátrica", short_name: "Valoración", url: "/?modulo=2", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,webp,woff2}"],
        // Export libraries (jspdf, exceljs, docx) produce large chunks; keep them available offline
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth\//, /^\/functions\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
