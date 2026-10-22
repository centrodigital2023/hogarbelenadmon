import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { Database } from "./types";

export type TableName = keyof Database["public"]["Tables"];

/**
 * Query builder for a table chosen at runtime (shared history lists, exports).
 * The name is checked against the generated schema; rows come back untyped so
 * shared components can filter on columns only some tables have (resident_id).
 */
export const fromTable = (table: TableName) => (supabase as unknown as SupabaseClient).from(table);
