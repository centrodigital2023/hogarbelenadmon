import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import type { Plugin } from "vite";

/**
 * Puts the app's stylesheet inside index.html so the first screen paints as soon as the
 * HTML arrives, instead of waiting for a separate CSS download that competes with the
 * JavaScript on slow phone connections. Only runs in production builds.
 */
const inlineEntryCss = (): Plugin => ({
  name: "hogar-belen:inline-entry-css",
  apply: "build",
  enforce: "post",
  transformIndexHtml: {
    order: "post",
    handler(html, ctx) {
      if (!ctx.bundle) return html;
      return html.replace(/<link rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)"[^>]*>/g, (tag, file: string) => {
        const asset = ctx.bundle?.[file];
        if (!asset || asset.type !== "asset") return tag;
        const css = typeof asset.source === "string" ? asset.source : new TextDecoder().decode(asset.source);
        return `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`;
      });
    },
  },
});

/**
 * Lists, per public page, the code files that page needs first, so the small script in
 * index.html can start downloading them together with the main file instead of one
 * after another (each wait costs a round trip on a phone connection).
 */
const ROUTE_ENTRIES: Record<string, string> = {
  "/": "src/app/SignedArea.tsx",
  "/login": "src/app/SignedArea.tsx",
  "/instalar": "src/pages/Install.tsx",
};
const routePreloads = (): Plugin => ({
  name: "hogar-belen:route-preloads",
  apply: "build",
  enforce: "post",
  transformIndexHtml: {
    order: "post",
    handler(html, ctx) {
      const bundle = ctx.bundle;
      if (!bundle) return html;
      const chunks = Object.values(bundle).filter((c) => c.type === "chunk");
      const entry = chunks.find((c) => c.isEntry);
      const loadedByEntry = new Set<string>();
      const walk = (file: string, into: Set<string>) => {
        if (into.has(file)) return;
        into.add(file);
        const chunk = bundle[file];
        if (chunk?.type === "chunk") chunk.imports.forEach((f) => walk(f, into));
      };
      if (entry) walk(entry.fileName, loadedByEntry);
      const map: Record<string, string[]> = {};
      for (const [route, source] of Object.entries(ROUTE_ENTRIES)) {
        const chunk = chunks.find((c) => c.facadeModuleId?.replace(/\\/g, "/").endsWith(source));
        if (!chunk) continue;
        const files = new Set<string>();
        walk(chunk.fileName, files);
        map[route] = [...files].filter((f) => !loadedByEntry.has(f)).map((f) => `/${f}`);
      }
      return [{ tag: "script", children: `window.__routePreloads=${JSON.stringify(map)}`, injectTo: "head" }];
    },
  },
});

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
    inlineEntryCss(),
    routePreloads(),
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
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        // Libraries that rarely change get their own files, so after an update phones
        // only download the app code that actually changed
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
