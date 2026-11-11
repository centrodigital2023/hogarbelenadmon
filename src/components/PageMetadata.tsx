import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { hasStoredSession } from "@/lib/app-shell";
import { getPageSeo } from "@/lib/page-seo";

export default function PageMetadata() {
  const { pathname, search } = useLocation();
  // Read from storage instead of the live session so public pages don't need the database code
  const signedIn = hasStoredSession();
  const params = new URLSearchParams(search);
  const seo = getPageSeo(pathname, params.has("modulo") || params.has("form"), signedIn);
  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="robots" content={seo.robots} />
      <link rel="canonical" href={seo.canonical} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={seo.canonical} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
    </Helmet>
  );
}