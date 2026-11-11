# Architecture rules

- Store durable object paths for private documents and branding; resolve legacy storage URLs and issue fresh signed links through `src/lib/private-documents.ts` at access time, because public URLs fail and persisted signed links expire.
- Keep public page discovery in `src/lib/page-seo.ts`, shared by route metadata and the sitemap generator; exclude authenticated views and clinical query links so search improvements do not advertise private records.
- Register offline caching after the first load settles, because bulk precaching must not compete with the initial screen on mobile connections.