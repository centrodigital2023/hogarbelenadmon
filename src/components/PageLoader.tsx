import { hasAppShell } from "@/lib/app-shell";

/** Full-screen loader. While the static first screen from index.html still shows, it doubles as the loader. */
const PageLoader = () =>
  hasAppShell() ? null : (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-muted-foreground font-medium">Cargando…</p>
      </div>
    </div>
  );

export default PageLoader;
