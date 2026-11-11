import { describe, expect, it } from "vitest";
import { getPageSeo, PUBLIC_PAGES } from "./page-seo";

describe("public search discovery", () => {
  it("only lists the public entry and installation pages", () => {
    expect(PUBLIC_PAGES).toEqual(["/", "/instalar"]);
    expect(getPageSeo("/", false, false).robots).toBe("index, follow");
  });
  it("keeps clinical module links out of search", () => {
    expect(getPageSeo("/", true, false).robots).toBe("noindex, follow");
  });
  it("keeps the signed-in dashboard out of search", () => {
    expect(getPageSeo("/", false, true).robots).toBe("noindex, follow");
  });
  it("excludes authentication and unknown pages", () => {
    for (const path of ["/login", "/reset-password", "/missing"]) {
      expect(getPageSeo(path, false, false).robots).toBe("noindex, follow");
    }
  });
  it("self-references public pages on the primary domain", () => {
    expect(getPageSeo("/instalar", false, false).canonical).toBe("https://hogarbelen.online/instalar");
  });
});