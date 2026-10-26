import { describe, expect, it } from "vitest";
import { appendNotes, applyProposals } from "./apply-proposals";
import { buildProposals, parseExtraction } from "./resident-documents";

type Call = { table: string; action: string; payload?: unknown; filter?: unknown };

/** Cliente falso que registra cada escritura y responde según `rows`/`fail`. */
function fakeClient(rows: Record<string, unknown[]> = {}, fail: Record<string, string> = {}) {
  const calls: Call[] = [];
  const builder = (table: string) => {
    let action = "select";
    let payload: unknown;
    const q: Record<string, unknown> = {};
    const result = () => {
      calls.push({ table, action, payload, filter: q.filter });
      if (fail[table] && action !== "select") return { data: null, error: { message: fail[table] } };
      if (action === "update") return { data: rows[`${table}:updated`] ?? [{ id: "x" }], error: null };
      return { data: action === "select" ? rows[table] ?? [] : null, error: null };
    };
    Object.assign(q, {
      select: () => q, order: () => q, limit: () => q,
      eq: (k: string, v: unknown) => { q.filter = { [k]: v }; return q; },
      insert: (p: unknown) => { action = "insert"; payload = p; return q; },
      update: (p: unknown) => { action = "update"; payload = p; return q; },
      upsert: (p: unknown) => { action = "upsert"; payload = p; return q; },
      then: (resolve: (v: unknown) => void) => resolve(result()),
    });
    return q;
  };
  const client = {
    from: builder,
    storage: { from: () => ({ copy: async (from: string, to: string) => { calls.push({ table: "storage", action: "copy", payload: { from, to } }); return { error: null }; } }) },
  };
  return { client: client as never, calls };
}

const extraction = parseExtraction({
  document_kind: "formula_medica",
  resident: { allergies: { value: "Penicilina", confidence: 0.9 }, eps: { value: "Nueva EPS", confidence: 0.9 } },
  life_history: { occupation: { value: "Modista", confidence: 0.9 } },
  medications: [{ medication_name: "Metformina", dose: "850 mg", confidence: 0.9 }],
  hygiene_needs: ["Pañal nocturno"],
  safety: { fall_risk: true },
});
const build = () => buildProposals(extraction, {
  resident: { full_name: "Ana Pérez", notes: "Usa bastón" }, lifeHistory: null, checklist: null, emergencyFolder: null,
  medications: [], appointments: [], assessments: [], incidents: [], fileName: "formula.jpg",
}).proposals;

describe("applyProposals", () => {
  it("guarda cada formulario y enlaza el archivo a HB-F1", async () => {
    const { client, calls } = fakeClient({ admission_checklists: [{ id: "c1", doc_cedula: true }] });
    const results = await applyProposals(client, {
      residentId: "r1", userId: "u1", proposals: build(), currentNotes: "Usa bastón",
      filePath: "residents/r1/formula.jpg", fileName: "formula.jpg", today: new Date(2026, 9, 26),
    });
    expect(results.every((r) => r.ok)).toBe(true);

    const resident = calls.find((c) => c.table === "residents")!;
    expect(resident.payload).toEqual({
      allergies: "Penicilina", eps: "Nueva EPS",
      notes: "Usa bastón\nHigiene: Pañal nocturno\nSeguridad: Riesgo de caída identificado",
    });
    expect(calls.find((c) => c.table === "life_histories" && c.action === "insert")?.payload).toMatchObject({ resident_id: "r1", occupation: "Modista" });
    expect(calls.find((c) => c.table === "admission_checklists" && c.action === "update")?.payload).toEqual({ doc_formulas_medicas: true, folder_status: "pendiente" });
    expect(calls.find((c) => c.action === "copy")?.payload).toMatchObject({ from: "residents/r1/formula.jpg" });
    expect(calls.find((c) => c.table === "emergency_folders")?.payload).toMatchObject({ has_medications_list: true, medications_date: "2026-10-26" });
    expect(calls.find((c) => c.table === "medications")?.payload).toMatchObject({ medication_name: "Metformina", resident_id: "r1", is_active: true });
    expect(calls.find((c) => c.table === "audit_log")).toBeTruthy();
  });

  it("si un formulario falla, los demás se guardan y se informa cuál", async () => {
    const { client } = fakeClient({}, { life_histories: "new row violates row-level security policy" });
    const proposals = build();
    const results = await applyProposals(client, { residentId: "r1", userId: "u1", proposals, currentNotes: null });
    const failed = results.filter((r) => !r.ok);
    expect(failed).toHaveLength(1);
    expect(proposals.find((p) => p.id === failed[0].id)?.section).toBe("hb_f22");
    expect(failed[0].error).toBe("Su rol no tiene permiso para guardar en este formulario");
    expect(results.filter((r) => r.ok).length).toBeGreaterThan(3);
  });

  it("detecta cuando el rol no puede modificar (RLS no devuelve filas)", async () => {
    const { client } = fakeClient({ "residents:updated": [] });
    const proposals = build();
    const results = await applyProposals(client, { residentId: "r1", userId: "u1", proposals, currentNotes: null });
    const failed = results.filter((r) => !r.ok);
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((r) => r.error === "Su rol no tiene permiso para guardar en este formulario")).toBe(true);
    expect(failed.every((r) => proposals.find((p) => p.id === r.id)?.op.type === "resident")).toBe(true);
  });

  it("solo guarda lo seleccionado", async () => {
    const { client, calls } = fakeClient();
    const proposals = build().map((p) => ({ ...p, selected: p.section === "hb_f22" }));
    await applyProposals(client, { residentId: "r1", userId: "u1", proposals, currentNotes: null });
    expect(calls.filter((c) => c.action !== "select").map((c) => c.table)).toEqual(["life_histories", "audit_log"]);
  });

  it("no duplica líneas de observaciones", () => {
    expect(appendNotes("Higiene: pañal", ["Higiene: pañal", "Seguridad: caída"])).toBe("Higiene: pañal\nSeguridad: caída");
    expect(appendNotes(null, [])).toBeNull();
  });
});
