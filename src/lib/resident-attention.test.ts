import { describe, expect, it } from "vitest";
import { buildAttention, countBySeverity, profileCompleteness, type AttentionData, type AttentionResident } from "./resident-attention";

const NOW = new Date(2026, 9, 26, 9, 0);

const complete: AttentionResident = {
  id: "r1", full_name: "Ana Pérez", status: "permanente", birth_date: "1940-10-26", admission_date: "2026-01-10",
  trial_end_date: "2026-01-25", document_id: "41234567", eps: "Sanitas", blood_type: "O+", allergies: "Niega",
  emergency_contact_1_name: "Luis", emergency_contact_1_phone: "3001234567", responsible_family_name: "Luis",
  responsible_family_phone: "3001234567", treating_doctor_name: "Dr. Gómez",
};

const fullData = (residents: AttentionResident[]): AttentionData => ({
  residents,
  checklists: [{ resident_id: "r1", folder_status: "completa" }],
  lifeHistories: [{ resident_id: "r1" }],
  assessments: ["barthel", "tinetti", "mna", "braden", "pfeiffer", "yesavage"].map((k) => ({ resident_id: "r1", test_key: k, score: 10, assessment_date: "2026-09-01", created_at: "2026-09-01" })),
  activeMedications: [{ resident_id: "r1" }],
  hygieneKits: [{ resident_id: "r1", kit_date: "2026-10-10" }],
  documents: [{ entity_id: "r1" }],
});

describe("pendientes por residente", () => {
  it("un residente al día solo recibe el aviso de cumpleaños", () => {
    const items = buildAttention(fullData([complete]), NOW);
    expect(items.map((i) => i.title)).toEqual(["¡Hoy cumple 86 años!"]);
    expect(profileCompleteness(complete)).toBe(100);
  });

  it("detecta todo lo que falta en un ingreso nuevo", () => {
    const nuevo: AttentionResident = {
      ...complete, id: "r2", full_name: "Pedro Ruiz", status: "prueba", birth_date: null, admission_date: "2026-10-01",
      trial_end_date: "2026-10-16", allergies: null, emergency_contact_1_phone: "", eps: null,
    };
    const items = buildAttention(fullData([nuevo]), NOW);
    const titles = items.map((i) => i.title);
    expect(titles).toEqual(expect.arrayContaining([
      "Ficha incompleta", "Periodo de prueba vencido", "Checklist de admisión (HB-F1) sin iniciar", "Sin historia de vida (HB-F22)",
      "Sin valoración geriátrica", "Sin medicamentos registrados (HB-F14)", "Kit de higiene pendiente", "Sin documentos digitalizados",
    ]));
    const ficha = items.find((i) => i.title === "Ficha incompleta")!;
    expect(ficha.severity).toBe("alta");
    expect(ficha.detail).toContain("alergias, teléfono de emergencia, fecha de nacimiento, EPS");
    expect(ficha.target).toEqual({ modulo: "residentes", residente: "r2" });
    expect(items[0].severity).toBe("alta");
    expect(countBySeverity(items).alta).toBe(3);
    expect(profileCompleteness(nuevo)).toBe(50);
  });

  it("avisa valoraciones vencidas y periodo de prueba por terminar", () => {
    const r: AttentionResident = { ...complete, status: "prueba", trial_end_date: "2026-10-28", birth_date: "1950-03-01" };
    const data = fullData([r]);
    data.assessments[0] = { ...data.assessments[0], assessment_date: "2026-01-01", created_at: "2026-01-01" };
    const items = buildAttention(data, NOW);
    expect(items.map((i) => [i.title, i.detail])).toEqual([
      ["Periodo de prueba por terminar", "Termina en 2 día(s)."],
      ["Valoraciones pendientes o vencidas", "Barthel (última 2026-01-01)"],
    ]);
  });

  it("ignora residentes egresados o fallecidos", () => {
    expect(buildAttention(fullData([{ ...complete, status: "egresado", allergies: null }]), NOW)).toEqual([]);
  });
});
