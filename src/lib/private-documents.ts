import { supabase } from "@/integrations/supabase/client";

/** Accept durable object paths and old public/signed references without retaining tokens. */
export function documentObjectPath(reference: string): string {
  let path = reference;
  if (/^https?:\/\//i.test(reference)) {
    const url = new URL(reference);
    if (url.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin) {
      throw new Error("Referencia de archivo no válida");
    }
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/documents\/(.+)$/);
    if (!match) throw new Error("Referencia de archivo no válida");
    path = match[1].split("/").map(decodeURIComponent).join("/");
  }
  if (!path || path.startsWith("/") || path.includes(":") || path.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("Referencia de archivo no válida");
  }
  return path;
}

export async function signedDocumentUrl(reference: string, expiresIn = 300): Promise<string> {
  const { data, error } = await supabase.storage.from("documents")
    .createSignedUrl(documentObjectPath(reference), expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("No se pudo abrir el archivo");
  return data.signedUrl;
}

/** Open immediately on the user gesture so asynchronous signing isn't popup-blocked. */
export async function openPrivateDocument(reference: string): Promise<void> {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const url = await signedDocumentUrl(reference);
    if (tab) tab.location.replace(url);
    else window.location.assign(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}