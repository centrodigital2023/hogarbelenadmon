# Architecture rules

- Store durable object paths for private documents and branding; resolve legacy storage URLs and issue fresh signed links through `src/lib/private-documents.ts` at access time, because public URLs fail and persisted signed links expire.