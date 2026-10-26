import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVE_STATUSES, buildAttention, type AttentionData } from "@/lib/resident-attention";

export const ATTENTION_QUERY_KEY = ["resident-attention"];

async function loadAttentionData(): Promise<AttentionData> {
  const since = new Date();
  since.setDate(since.getDate() - 45);
  const [residents, checklists, lifeHistories, assessments, meds, kits, docs] = await Promise.all([
    supabase.from("residents").select("id, full_name, status, birth_date, admission_date, trial_end_date, document_id, eps, blood_type, allergies, emergency_contact_1_name, emergency_contact_1_phone, responsible_family_name, responsible_family_phone, treating_doctor_name")
      .in("status", ACTIVE_STATUSES as ("prueba" | "permanente")[]),
    supabase.from("admission_checklists").select("resident_id, folder_status"),
    supabase.from("life_histories").select("resident_id"),
    supabase.from("geriatric_assessments").select("resident_id, test_key, score, assessment_date, created_at"),
    supabase.from("medications").select("resident_id").eq("is_active", true),
    supabase.from("hygiene_kits").select("resident_id, kit_date").gte("kit_date", since.toISOString().slice(0, 10)),
    supabase.from("document_attachments").select("entity_id").eq("entity_type", "resident"),
  ]);
  if (residents.error) throw residents.error;
  // Las demás tablas pueden no ser visibles para algunos roles: se asume vacío
  return {
    residents: residents.data ?? [],
    checklists: checklists.data ?? [],
    lifeHistories: lifeHistories.data ?? [],
    assessments: assessments.data ?? [],
    activeMedications: meds.data ?? [],
    hygieneKits: kits.data ?? [],
    documents: docs.data ?? [],
  };
}

/** Pendientes de todos los residentes activos; se comparte entre la campana y la pantalla de residentes. */
export function useResidentAttention() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ATTENTION_QUERY_KEY,
    queryFn: loadAttentionData,
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ATTENTION_QUERY_KEY }), [queryClient]);
  const items = useMemo(() => (query.data ? buildAttention(query.data) : []), [query.data]);
  return {
    items,
    data: query.data,
    loading: query.isLoading,
    refresh,
  };
}
