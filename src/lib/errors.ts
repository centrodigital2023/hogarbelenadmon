/** Human readable message for anything thrown (Error, Supabase error object, string). */
export const errorMessage = (error: unknown, fallback = "Ocurrió un error inesperado"): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
};
