import { Cake, FileWarning, ClipboardCheck, Stethoscope, ShowerHead, FolderOpen, UserCheck, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AttentionCategory, AttentionSeverity } from "@/lib/resident-attention";

export const SEVERITY_STYLES: Record<AttentionSeverity, { dot: string; chip: string; label: string }> = {
  alta: { dot: "bg-destructive", chip: "bg-destructive/10 text-destructive", label: "Urgente" },
  media: { dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400", label: "Atención" },
  baja: { dot: "bg-primary", chip: "bg-primary/10 text-primary", label: "Pendiente" },
};

export const CATEGORY_ICONS: Record<AttentionCategory, LucideIcon> = {
  ficha: FileWarning, ingreso: ClipboardCheck, valoracion: Activity, salud: Stethoscope,
  higiene: ShowerHead, documentos: FolderOpen, estado: UserCheck, cumpleanos: Cake,
};
