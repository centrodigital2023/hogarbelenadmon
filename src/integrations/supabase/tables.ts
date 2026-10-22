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

export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];

/** Minimal resident shape used by selectors across forms. */
export type ResidentOption = Pick<Row<"residents">, "id" | "full_name">;

/** Row joined with the resident's name via `residents(full_name)`. */
export type WithResident<T> = T & { residents: { full_name: string } | null };
