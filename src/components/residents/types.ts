import type { Row } from "@/integrations/supabase/tables";

export type ResidentRecord = Row<"residents">;

export const STATUS_LABELS: Record<string, string> = {
  prueba: "🟡 Prueba",
  permanente: "🟢 Permanente",
  egresado: "🔵 Egresado",
  fallecido: "⚫ Fallecido",
};
