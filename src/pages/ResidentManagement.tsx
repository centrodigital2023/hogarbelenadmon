import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useResidentAttention } from "@/hooks/useResidentAttention";
import FormHeader from "@/components/FormHeader";
import ResidentForm from "@/components/residents/ResidentForm";
import ResidentProfile from "@/components/residents/ResidentProfile";
import { STATUS_LABELS, type ResidentRecord } from "@/components/residents/types";
import { formatAge, nextBirthday } from "@/lib/resident-age";
import { countBySeverity, profileCompleteness, type AttentionResident } from "@/lib/resident-attention";
import { UserPlus, Search, Trash2, Cake, AlertCircle } from "lucide-react";

const FILTERS = { activos: "Activos", prueba: "En prueba", permanente: "Permanentes", todos: "Todos" } as const;
type Filter = keyof typeof FILTERS;

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ResidentManagement = ({ onBack }: { onBack: () => void }) => {
  const { toast } = useToast();
  const { can } = usePermissions();
  const { items: attention, refresh: refreshAttention } = useResidentAttention();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("residente");
  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("activos");
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const canEdit = can("residentes", "update");
  const canDelete = can("residentes", "delete");

  const fetchResidents = useCallback(async () => {
    const { data, error } = await supabase.from("residents").select("*").order("full_name");
    if (error) toast({ title: "No se pudieron cargar los residentes", description: error.message, variant: "destructive" });
    if (data) setResidents(data);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchResidents(); }, [fetchResidents]);

  const refreshAll = () => { fetchResidents(); refreshAttention(); };

  const openResident = (id: string | null) => {
    const params = new URLSearchParams({ modulo: "residentes" });
    if (id) params.set("residente", id);
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };

  const byResident = useMemo(() => {
    const map: Record<string, typeof attention> = {};
    attention.forEach((a) => (map[a.residentId] ??= []).push(a));
    return map;
  }, [attention]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("residents").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Residente eliminado" });
      setConfirmDelete(null);
      refreshAll();
    }
  };

  const selected = residents.find((r) => r.id === selectedId);
  if (selected) {
    return (
      <ResidentProfile resident={selected} attention={byResident[selected.id] ?? []} canEdit={canEdit} canDelete={canDelete}
        onBack={() => openResident(null)} onChanged={refreshAll} />
    );
  }

  const q = normalize(search.trim());
  const filtered = residents.filter((r) => {
    if (filter === "activos" && !["prueba", "permanente"].includes(r.status)) return false;
    if ((filter === "prueba" || filter === "permanente") && r.status !== filter) return false;
    return !q || normalize(r.full_name).includes(q) || (r.document_id ?? "").includes(q);
  });
  const totals = countBySeverity(attention);

  return (
    <div className="animate-fade-in">
      <FormHeader title="Gestión de Residentes" subtitle="Fichas, documentos con IA y pendientes" onBack={onBack} />

      {(totals.alta > 0 || totals.media > 0) && (
        <div className="flex items-center gap-2 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertCircle size={16} className="shrink-0" />
          {totals.alta > 0 && `${totals.alta} pendiente(s) urgente(s)`}{totals.alta > 0 && totals.media > 0 && " · "}{totals.media > 0 && `${totals.media} requieren atención`}.
          {" "}Abra cada residente para resolverlos.
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar por nombre o cédula..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm" />
        </div>
        {canEdit && (
          <button onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 min-h-[48px] touch-manipulation">
            <UserPlus size={16} /> Nuevo residente
          </button>
        )}
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
            {FILTERS[f]}
          </button>
        ))}
      </div>

      {creating && (
        <div className="mb-6">
          <ResidentForm onCancel={() => setCreating(false)} onSaved={(id) => { setCreating(false); refreshAll(); openResident(id); }} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const items = byResident[r.id] ?? [];
            const counts = countBySeverity(items);
            const completeness = profileCompleteness(r as unknown as AttentionResident);
            const bday = nextBirthday(r.birth_date);
            return (
              <div key={r.id} className="bg-card border border-border rounded-2xl relative hover:border-primary/50 transition-colors">
                <button onClick={() => openResident(r.id)} className="w-full text-left p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-black shrink-0">{initials(r.full_name)}</div>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-sm font-bold text-foreground truncate">{r.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">{formatAge(r.birth_date)}</span> · {STATUS_LABELS[r.status] || r.status}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{r.document_id ? `CC ${r.document_id}` : "Sin documento"} · EPS {r.eps || "sin registrar"}</p>
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1"><span>Ficha</span><span>{completeness}%</span></div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${completeness === 100 ? "bg-cat-nutritional" : completeness >= 60 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${completeness}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {counts.alta > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{counts.alta} urgente(s)</span>}
                    {counts.media > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">{counts.media} atención</span>}
                    {counts.baja > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{counts.baja} pendiente(s)</span>}
                    {bday && bday.days <= 7 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cat-mood/10 text-cat-mood flex items-center gap-1">
                        <Cake size={11} /> {bday.days === 0 ? "¡Hoy cumpleaños!" : `Cumple en ${bday.days} d`}
                      </span>
                    )}
                  </div>
                </button>
                {canDelete && (
                  <button onClick={() => setConfirmDelete(r.id)} title="Eliminar"
                    className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-destructive rounded-lg">
                    <Trash2 size={14} />
                  </button>
                )}
                {confirmDelete === r.id && (
                  <div className="absolute inset-0 bg-card/95 rounded-2xl flex flex-col items-center justify-center p-4 animate-fade-in z-10">
                    <p className="text-xs font-bold text-foreground mb-1">¿Eliminar a {r.full_name}?</p>
                    <p className="text-[10px] text-muted-foreground mb-4 text-center">Esta acción no se puede deshacer. Se eliminarán todos los registros asociados.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground">Cancelar</button>
                      <button onClick={() => handleDelete(r.id)} className="px-4 py-2 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground">Sí, eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No se encontraron residentes.</p>}
        </div>
      )}
    </div>
  );
};

export default ResidentManagement;
