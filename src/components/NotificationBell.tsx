import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useResidentAttention } from "@/hooks/useResidentAttention";
import { useAttentionNavigation } from "@/hooks/useAttentionNavigation";
import { CATEGORY_ICONS, SEVERITY_STYLES } from "@/components/attention-styles";
import { countBySeverity, type AttentionItem, type AttentionSeverity } from "@/lib/resident-attention";

const NOTIFIED_KEY = "hb-notified-attention";
const ENABLED_KEY = "hb-device-notifications";

const readNotified = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]")); } catch { return new Set(); }
};

/** Aviso del sistema (celular/computador) con los pendientes urgentes nuevos. */
async function notifyDevice(items: AttentionItem[]) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const notified = readNotified();
  const fresh = items.filter((i) => (i.severity === "alta" || i.category === "cumpleanos") && !notified.has(i.id));
  if (fresh.length === 0) return;
  const title = fresh.length === 1 ? `${fresh[0].title} · ${fresh[0].residentName}` : `Hogar Belén: ${fresh.length} pendientes requieren atención`;
  const body = fresh.slice(0, 3).map((i) => `• ${i.residentName}: ${i.title}`).join("\n");
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/icons/icon-192.png", tag: "hb-attention" });
    else new Notification(title, { body, tag: "hb-attention" });
    fresh.forEach((i) => notified.add(i.id));
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified].slice(-500)));
  } catch {
    // Algunos navegadores bloquean avisos fuera de la app; la campana sigue funcionando
  }
}

const NotificationBell = () => {
  const { items, loading } = useResidentAttention();
  const goTo = useAttentionNavigation();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"todas" | AttentionSeverity>("todas");
  const [deviceEnabled, setDeviceEnabled] = useState(() => {
    try { return localStorage.getItem(ENABLED_KEY) === "1" && typeof Notification !== "undefined" && Notification.permission === "granted"; } catch { return false; }
  });
  const counts = useMemo(() => countBySeverity(items), [items]);
  const urgent = counts.alta + counts.media;
  const visible = filter === "todas" ? items : items.filter((i) => i.severity === filter);

  useEffect(() => { if (deviceEnabled) notifyDevice(items); }, [items, deviceEnabled]);

  const enableDevice = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    const ok = permission === "granted";
    setDeviceEnabled(ok);
    try { localStorage.setItem(ENABLED_KEY, ok ? "1" : "0"); } catch { /* sin almacenamiento */ }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-xl hover:bg-muted active:bg-muted/80 touch-manipulation"
          aria-label={`Notificaciones: ${items.length} pendientes`}
        >
          {urgent > 0 ? <BellRing size={20} className="text-foreground" /> : <Bell size={20} className="text-muted-foreground" />}
          {items.length > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white ${counts.alta > 0 ? "bg-destructive" : urgent > 0 ? "bg-amber-500" : "bg-primary"}`}>
              {items.length > 99 ? "99+" : items.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-black text-foreground">Pendientes y alertas</p>
          <p className="text-[11px] text-muted-foreground">Lo que falta o requiere atención en los residentes activos</p>
          <div className="flex gap-1.5 mt-3">
            {(["todas", "alta", "media", "baja"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {f === "todas" ? `Todas ${items.length}` : `${SEVERITY_STYLES[f].label} ${counts[f]}`}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
          {loading && <p className="p-6 text-center text-xs text-muted-foreground">Revisando residentes…</p>}
          {!loading && visible.length === 0 && (
            <p className="p-6 text-center text-xs text-muted-foreground">🎉 Todo al día. No hay pendientes.</p>
          )}
          {visible.slice(0, 80).map((item) => {
            const Icon = CATEGORY_ICONS[item.category];
            const style = SEVERITY_STYLES[item.severity];
            return (
              <button key={item.id} onClick={() => { setOpen(false); goTo(item.target); }}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/60 transition-colors">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.chip}`}><Icon size={15} /></span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} aria-hidden />
                    <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                  </span>
                  <span className="block text-[11px] font-semibold text-muted-foreground">{item.residentName}</span>
                  <span className="block text-[11px] text-muted-foreground leading-snug line-clamp-2">{item.detail}</span>
                </span>
                <ChevronRight size={14} className="text-muted-foreground mt-2 shrink-0" />
              </button>
            );
          })}
        </div>
        {typeof Notification !== "undefined" && !deviceEnabled && (
          <div className="p-3 border-t border-border bg-muted/40">
            <button onClick={enableDevice} className="w-full text-xs font-bold text-primary py-2 rounded-xl hover:bg-primary/10">
              🔔 Activar avisos en este dispositivo
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
