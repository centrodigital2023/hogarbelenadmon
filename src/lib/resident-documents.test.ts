import { describe, expect, it } from "vitest";
import {
  buildProposals, classifyDocument, groupProposals, localExtract, mergeAllergies, mergeExtractions, namesMatch,
  normalizeBloodType, normalizeDate, parseExtraction, scaleKey, type ProposalContext,
} from "./resident-documents";

const ctx = (over: Partial<ProposalContext> = {}): ProposalContext => ({
  resident: { full_name: "María Elena Rodríguez Pérez", document_id: null, eps: null, allergies: null, notes: null },
  lifeHistory: null, checklist: null, emergencyFolder: null, medications: [], appointments: [], assessments: [], incidents: [],
  fileName: "historia.pdf", today: new Date(2026, 9, 26),
  ...over,
});

describe("normalizadores", () => {
  it("lee fechas en formatos colombianos", () => {
    expect(normalizeDate("10/05/1940")).toBe("1940-05-10");
    expect(normalizeDate("1940-05-10")).toBe("1940-05-10");
    expect(normalizeDate("10 de mayo de 1940")).toBe("1940-05-10");
    expect(normalizeDate("31/02/1940")).toBeNull();
    expect(normalizeDate("ayer")).toBeNull();
  });

  it("normaliza tipo de sangre", () => {
    expect(normalizeBloodType("O positivo")).toBe("O+");
    expect(normalizeBloodType("ab-")).toBe("AB-");
    expect(normalizeBloodType("0 RH+")).toBe("O+");
    expect(normalizeBloodType("Z+")).toBeNull();
  });

  it("reconoce escalas por su nombre", () => {
    expect(scaleKey("Índice de Barthel")).toBe("barthel");
    expect(scaleKey("Mini Mental")).toBe("mmse");
    expect(scaleKey("GDS-15")).toBe("yesavage");
    expect(scaleKey("Escala inventada")).toBeNull();
  });

  it("compara nombres sin tildes ni orden", () => {
    expect(namesMatch("RODRIGUEZ PEREZ MARIA ELENA", "María Elena Rodríguez Pérez")).toBe(true);
    expect(namesMatch("Pedro Gómez", "María Elena Rodríguez Pérez")).toBe(false);
  });

  it("une alergias sin duplicar y reemplaza 'niega'", () => {
    expect(mergeAllergies("Penicilina", "penicilina, mariscos")).toBe("Penicilina, mariscos");
    expect(mergeAllergies("Niega alergias", "Sulfas")).toBe("Sulfas");
    expect(mergeAllergies("Penicilina", "Niega alergias")).toBeNull();
    expect(mergeAllergies(null, "Niega alergias conocidas")).toBe("Niega alergias conocidas");
  });
});

describe("lector local de respaldo", () => {
  const text = `REPÚBLICA DE COLOMBIA - HISTORIA CLÍNICA
  Paciente: María Elena Rodríguez
  Cédula de ciudadanía No. 41.234.567
  Fecha de nacimiento: 10/05/1940   Sexo: F
  Grupo sanguíneo: O positivo
  EPS: Nueva EPS - régimen contributivo
  Alergias: penicilina y mariscos.
  Antecedentes: HTA`;

  it("extrae datos estructurados sin IA", () => {
    const ex = localExtract(text);
    expect(ex.documentKind).toBe("historia_clinica");
    expect(ex.resident.document_id?.value).toBe("41234567");
    expect(ex.resident.birth_date?.value).toBe("1940-05-10");
    expect(ex.resident.gender?.value).toBe("F");
    expect(ex.resident.blood_type?.value).toBe("O+");
    expect(ex.resident.eps?.value).toBe("Nueva EPS");
    expect(ex.resident.allergies?.value).toBe("penicilina y mariscos");
  });

  it("clasifica documentos por su contenido", () => {
    expect(classifyDocument("EPICRISIS fecha de egreso 12/10/2026")).toBe("epicrisis");
    expect(classifyDocument("Fórmula médica: losartán 50 mg cada 12 horas")).toBe("formula_medica");
    expect(classifyDocument("Certificado de afiliación régimen subsidiado")).toBe("carne_eps");
  });

  it("la IA manda y lo local completa vacíos", () => {
    const ai = parseExtraction({ document_kind: "historia_clinica", resident: { eps: { value: "Sanitas", confidence: 0.9 } } });
    const merged = mergeExtractions(ai, localExtract(text));
    expect(merged.resident.eps?.value).toBe("Sanitas");
    expect(merged.resident.blood_type?.value).toBe("O+");
    expect(merged.source).toBe("ia+local");
    expect(mergeExtractions(null, localExtract(text)).source).toBe("local");
  });
});

describe("parseExtraction", () => {
  it("descarta valores inválidos de la IA", () => {
    const ex = parseExtraction({
      document_kind: "inventado",
      resident: { birth_date: { value: "2099-01-01" }, blood_type: "B negativo", document_id: { value: "abc" }, eps: { value: "N/A" } },
      scales: [{ test_key: "Barthel", score: 140 }, { test_key: "Barthel", score: "65", confidence: 85 }],
      appointments: [{ appointment_date: "sin fecha" }, { appointment_date: "15/11/2026", appointment_time: "8:30", specialty: "Cardiología" }],
      medications: [{ name: "Losartán", dose: "50 mg", frequency: "cada 12 horas" }, { dose: "sin nombre" }],
    });
    expect(ex.documentKind).toBe("otro");
    expect(ex.resident.birth_date).toBeUndefined();
    expect(ex.resident.document_id).toBeUndefined();
    expect(ex.resident.eps).toBeUndefined();
    expect(ex.resident.blood_type?.value).toBe("B-");
    expect(ex.scales).toEqual([{ test_key: "barthel", score: 65, assessment_date: undefined, confidence: 0.85, evidence: undefined }]);
    expect(ex.appointments).toHaveLength(1);
    expect(ex.appointments[0].appointment_time).toBe("08:30");
    expect(ex.medications[0]).toMatchObject({ medication_name: "Losartán", schedule: "cada 12 horas" });
    expect(ex.medications).toHaveLength(1);
  });
});

describe("buildProposals", () => {
  const ai = parseExtraction({
    document_kind: "epicrisis",
    document_date: "2026-10-20",
    name_on_document: "RODRIGUEZ PEREZ MARIA ELENA",
    resident: {
      document_id: { value: "41234567", confidence: 0.95 },
      eps: { value: "Nueva EPS", confidence: 0.9 },
      blood_type: { value: "O+", confidence: 0.4 },
      allergies: { value: "Penicilina", confidence: 0.9 },
      special_diet: { value: "Hiposódica", confidence: 0.8 },
      emergency_contact_1_name: { value: "Ana Rodríguez", confidence: 0.9 },
      emergency_contact_2_name: { value: "Luis Rodríguez", confidence: 0.9 },
    },
    life_history: { occupation: { value: "Modista", confidence: 0.8 } },
    diagnoses: ["Hipertensión arterial", "Diabetes tipo 2"],
    medications: [{ medication_name: "Losartán", concentration: "50 mg", schedule: "cada 12 horas", confidence: 0.9 }, { medication_name: "Metformina", dose: "850 mg", confidence: 0.9 }],
    appointments: [{ appointment_date: "2026-11-15", specialty: "Medicina interna", confidence: 0.9 }, { appointment_date: "2026-01-01", specialty: "Viejo" }],
    scales: [{ test_key: "barthel", score: 60, confidence: 0.9 }],
    hospitalization: { diagnosis: "Neumonía", hospital_discharge_date: "2026-10-20", confidence: 0.9 },
    hygiene_needs: ["Uso de pañal nocturno"],
    safety: { fall_risk: true, falls: [{ date: "2026-10-10", description: "Caída en baño" }] },
  });

  it("propone datos para todos los formularios y respeta lo existente", () => {
    const { proposals, identityWarning } = buildProposals(ai, ctx({
      resident: { full_name: "María Elena Rodríguez Pérez", eps: "Sanitas", allergies: "Niega alergias", notes: null },
      medications: [{ id: "m1", medication_name: "Losartan", concentration: "50 mg", schedule: "cada 12 horas" }],
    }));
    expect(identityWarning).toBeNull();
    const sections = groupProposals(proposals).map((g) => g.key);
    expect(sections).toEqual(["ficha", "hb_f1", "hb_f22", "valoracion", "alimentacion", "sistema_salud", "higiene", "seguridad"]);

    const eps = proposals.find((p) => p.label === "EPS")!;
    expect(eps).toMatchObject({ status: "conflicto", selected: false, current: "Sanitas" });
    expect(proposals.find((p) => p.label === "Tipo de sangre")).toMatchObject({ selected: false }); // baja confianza
    expect(proposals.find((p) => p.label === "Alergias")).toMatchObject({ proposed: "Penicilina", selected: true, status: "conflicto" });
    expect(proposals.find((p) => p.label === "Dieta especial")?.section).toBe("alimentacion");

    // Losartán ya existe igual → no se repite; Metformina es nueva
    expect(proposals.filter((p) => p.op.type === "medication_insert").map((p) => p.label)).toEqual(["HB-F14 · Medicamento: Metformina"]);
    expect(proposals.some((p) => p.op.type === "medication_update")).toBe(false);
    // Solo citas futuras
    expect(proposals.filter((p) => p.op.type === "appointment_insert")).toHaveLength(1);
    expect(proposals.find((p) => p.op.type === "checklist" && p.op.field === "doc_historia_clinica")).toBeTruthy();
    expect(proposals.find((p) => p.op.type === "checklist" && p.op.field === "doc_contactos_emergencia")).toBeTruthy();
    const scale = proposals.find((p) => p.op.type === "assessment_insert")!;
    expect(scale.op).toMatchObject({ data: { test_key: "barthel", score: 60, max_score: 100, assessment_date: "2026-10-20" } });
    expect(proposals.find((p) => p.op.type === "incident_insert")?.op).toMatchObject({ data: { incident_datetime: "2026-10-10T12:00:00" } });
    expect(proposals.filter((p) => p.op.type === "emergency_folder").map((p) => p.op.type === "emergency_folder" && p.op.field))
      .toEqual(["has_clinical_summary", "has_medications_list", "has_family_contacts"]);
  });

  it("detecta cambios de dosis de un medicamento existente", () => {
    const { proposals } = buildProposals(ai, ctx({ medications: [{ id: "m1", medication_name: "Losartán", concentration: "100 mg" }] }));
    const upd = proposals.find((p) => p.op.type === "medication_update")!;
    expect(upd.op).toEqual({ type: "medication_update", id: "m1", data: { concentration: "50 mg", schedule: "cada 12 horas" } });
    expect(upd.selected).toBe(false);
  });

  it("no marca nada si el documento es de otra persona", () => {
    const { proposals, identityWarning } = buildProposals(ai, ctx({ resident: { full_name: "Pedro Gómez Suárez", document_id: "1234567" } }));
    expect(identityWarning).toMatch(/cédula 41234567/);
    expect(proposals.every((p) => !p.selected)).toBe(true);
    expect(proposals.some((p) => p.label === "Documento de identidad")).toBe(false);
  });

  it("no repite lo que ya está registrado", () => {
    const { proposals } = buildProposals(ai, ctx({
      checklist: { doc_historia_clinica: true, doc_contactos_emergencia: true },
      assessments: [{ test_key: "barthel", assessment_date: "2026-10-20" }],
      incidents: [{ incident_datetime: "2026-10-10T08:00:00Z" }],
      appointments: [{ appointment_date: "2026-11-15", specialty: "Medicina Interna" }],
      lifeHistory: { occupation: "modista" },
    }));
    expect(proposals.some((p) => p.section === "hb_f1")).toBe(false);
    expect(proposals.some((p) => p.op.type === "assessment_insert")).toBe(false);
    expect(proposals.some((p) => p.op.type === "incident_insert")).toBe(false);
    expect(proposals.some((p) => p.op.type === "appointment_insert")).toBe(false);
    expect(proposals.some((p) => p.section === "hb_f22")).toBe(false);
  });
});
