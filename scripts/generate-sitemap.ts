import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PUBLIC_PAGES, SITE_URL } from "../src/lib/page-seo";

// No build-time lastmod: only an authoritative page-content timestamp is valid.
const urls = PUBLIC_PAGES.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`);
writeFileSync(resolve("public/sitemap.xml"), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls,
  '</urlset>',
  '',
].join("\n"));