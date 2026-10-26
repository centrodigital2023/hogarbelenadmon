import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ResidentStatus = Database["public"]["Enums"]["resident_status"];

export interface ActiveResident {
  id: string;
  full_name: string;
  status: string | null;
  allergies: string | null;
  eps: string | null;
}

/**
 * Residents a form can be filled for, sorted by name. By default only those living
 * in the home (prueba / permanente); `includeAll` also lists egresados for HB-F3 and HB-F22.
 */
export const useActiveResidents = (options: { includeAll?: boolean; statuses?: ResidentStatus[] } = {}) => {
  const { includeAll = false } = options;
  const statusKey = (options.statuses ?? ["prueba", "permanente"]).join(",");
  const [residents, setResidents] = useState<ActiveResident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let query = supabase.from("residents").select("id, full_name, status, allergies, eps").order("full_name");
    if (!includeAll) query = query.in("status", statusKey.split(",") as ResidentStatus[]);
    query.then(({ data }) => {
      if (!active) return;
      setResidents((data ?? []) as ActiveResident[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [includeAll, statusKey]);

  return { residents, loading };
};
