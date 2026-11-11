export const SITE_URL = "https://hogarbelen.online";

export const PUBLIC_PAGES = ["/", "/instalar"] as const;

export function getPageSeo(pathname: string, hasPrivateQuery: boolean, signedIn: boolean) {
  const install = pathname === "/instalar";
  const indexable = (PUBLIC_PAGES as readonly string[]).includes(pathname)
    && !hasPrivateQuery && !(pathname === "/" && signedIn);
  return {
    title: install
      ? "Instalar la aplicación | Hogar Belén Buesaco"
      : "Hogar Belén Buesaco | Gestión geriátrica en Nariño",
    description: install
      ? "Instala la aplicación de Hogar Belén Buesaco en Android, iPhone o computador. Acceso del equipo al sistema de gestión geriátrica."
      : "Hogar Belén Buesaco S.A.S., Nariño, Colombia. Acceso seguro al sistema de gestión geriátrica para el cuidado y bienestar de las personas mayores.",
    canonical: `${SITE_URL}${pathname}`,
    robots: indexable ? "index, follow" : "noindex, follow",
  };
}