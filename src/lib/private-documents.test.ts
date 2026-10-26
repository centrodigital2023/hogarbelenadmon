import { beforeEach, describe, expect, it, vi } from "vitest";

const { sign } = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: sign }) } },
}));
import { documentObjectPath, signedDocumentUrl } from "./private-documents";

describe("private document references", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://storage.example.test");
    sign.mockReset();
  });

  it("recovers existing public references, including accented filenames", () => {
    expect(documentObjectPath("https://storage.example.test/storage/v1/object/public/documents/institutional/contrato%20Bel%C3%A9n.pdf"))
      .toBe("institutional/contrato Belén.pdf");
  });

  it("re-signs an expired signed reference from its durable path", async () => {
    sign.mockResolvedValue({ data: { signedUrl: "https://storage.example.test/fresh" }, error: null });
    expect(await signedDocumentUrl("https://storage.example.test/storage/v1/object/sign/documents/branding/logo.png?token=expired"))
      .toBe("https://storage.example.test/fresh");
    expect(sign).toHaveBeenCalledWith("branding/logo.png", 300);
  });

  it("requests fresh access on every open instead of caching expiring URLs", async () => {
    sign.mockResolvedValueOnce({ data: { signedUrl: "first" }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: "second" }, error: null });
    expect(await signedDocumentUrl("institutional/contract.pdf")).toBe("first");
    expect(await signedDocumentUrl("institutional/contract.pdf")).toBe("second");
  });

  it("propagates denied access rather than returning a public URL", async () => {
    sign.mockResolvedValue({ data: null, error: new Error("Access denied") });
    await expect(signedDocumentUrl("admission/resident/contract.pdf")).rejects.toThrow("Access denied");
  });

  it("rejects unrelated origins and traversal", () => {
    expect(() => documentObjectPath("https://other.example/storage/v1/object/public/documents/logo.png")).toThrow();
    expect(() => documentObjectPath("../logo.png")).toThrow();
  });
});