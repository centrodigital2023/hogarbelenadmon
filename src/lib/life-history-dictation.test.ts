import { describe, expect, it } from "vitest";
import {
  coveredTopics, defaultMode, mergeField, nextQuestion, normalizeMorning, organizeLocally, parseOrganized,
} from "@/lib/life-history-dictation";

const DICTADO =
  "Le gusta que le digan doña Rosa. Fue modista en Pasto toda la vida. Es viuda y tiene tres hijos y cinco nietos. " +
  "Le encanta el ajiaco y el tinto en la mañana. Escucha boleros de Los Panchos. Es muy madrugadora, se levanta a las 5. " +
  "Es católica y reza el rosario todos los días. Le molesta el ruido fuerte. Quisiera volver a visitar el santuario de Las Lajas.";

describe("guía del dictado", () => {
  it("marca los temas de los que ya se habló", () => {
    const covered = coveredTopics(DICTADO);
    for (const f of ["preferred_name", "occupation", "marital_status", "children_info", "favorite_food", "favorite_music",
      "morning_or_night", "spiritual_beliefs", "dislikes", "dreams"] as const) {
      expect(covered.has(f), f).toBe(true);
    }
  });

  it("sugiere la primera pregunta pendiente y omite lo ya escrito en el formulario", () => {
    expect(nextQuestion("")?.field).toBe("preferred_name");
    expect(nextQuestion("", { preferred_name: "Rosa" })?.field).toBe("occupation");
    expect(nextQuestion(DICTADO)?.field).toBe("hobbies");
  });
});

describe("normalizeMorning", () => {
  it("lleva cualquier respuesta a las tres opciones del formulario", () => {
    expect(normalizeMorning("Es muy madrugadora")).toBe("Madrugador");
    expect(normalizeMorning("Noctámbulo")).toBe("Noctámbulo");
    expect(normalizeMorning("le gusta trasnochar viendo novelas")).toBe("Noctámbulo");
    expect(normalizeMorning("depende del día")).toBe("Flexible");
    expect(normalizeMorning("no sé")).toBe("");
  });
});

describe("parseOrganized", () => {
  it("acepta solo campos conocidos y descarta los vacíos o 'no se menciona'", () => {
    const r = parseOrganized({
      fields: {
        preferred_name: { value: "Me gusta que me llamen Doña Rosa", evidence: "le digan doña Rosa" },
        morning_or_night: { value: "madrugadora" },
        dreams: { value: "No se menciona" },
        hobbies: "",
        inventado: { value: "x" },
      },
      unassigned: "Llegó en bus",
    });
    expect(Object.keys(r.fields).sort()).toEqual(["morning_or_night", "preferred_name"]);
    expect(r.fields.morning_or_night?.value).toBe("Madrugador");
    expect(r.fields.preferred_name?.evidence).toBe("le digan doña Rosa");
    expect(r.unassigned).toBe("Llegó en bus");
  });

  it("tolera respuestas mal formadas", () => {
    expect(parseOrganized(null)).toEqual({ fields: {}, unassigned: "" });
    expect(parseOrganized({ favorite_food: "Ajiaco" }).fields.favorite_food?.value).toBe("Ajiaco");
  });
});

describe("organizeLocally (respaldo sin IA)", () => {
  it("reparte cada frase en su campo", () => {
    const { fields } = organizeLocally(DICTADO);
    expect(fields.preferred_name?.value).toContain("doña Rosa");
    expect(fields.occupation?.value).toContain("modista");
    expect(fields.marital_status?.value).toContain("viuda");
    expect(fields.favorite_food?.value).toContain("ajiaco");
    expect(fields.favorite_music?.value).toContain("boleros");
    expect(fields.morning_or_night?.value).toBe("Madrugador");
    expect(fields.spiritual_beliefs?.value).toContain("rosario");
    expect(fields.dislikes?.value).toContain("ruido");
    expect(fields.dreams?.value).toContain("Lajas");
  });

  it("deja aparte lo que no encaja", () => {
    expect(organizeLocally("Llegó el martes en la tarde con su sobrina.").unassigned).toContain("martes");
  });
});

describe("mergeField", () => {
  it("agrega sin repetir y reemplaza cuando se pide", () => {
    expect(mergeField("hobbies", "", "Tejer", "agregar")).toBe("Tejer");
    expect(mergeField("hobbies", "Leer", "Tejer", "agregar")).toBe("Leer. Tejer");
    expect(mergeField("hobbies", "Leer. Tejer.", "tejer", "agregar")).toBe("Leer. Tejer.");
    expect(mergeField("hobbies", "Leer", "Tejer", "reemplazar")).toBe("Tejer");
    expect(mergeField("hobbies", "Leer", "Tejer", "omitir")).toBe("Leer");
    expect(mergeField("morning_or_night", "Flexible", "Madrugador", "agregar")).toBe("Madrugador");
  });

  it("propone un modo seguro por defecto", () => {
    expect(defaultMode("", "Tejer")).toBe("reemplazar");
    expect(defaultMode("Leer", "Tejer")).toBe("agregar");
    expect(defaultMode("Tejer.", "tejer")).toBe("omitir");
  });
});
