import { describe, it, expect } from "vitest";
import { appendDictation, cleanTranscript, dictationErrorMessage } from "./dictation";

describe("dictado por voz", () => {
  it("pone mayúscula y punto final", () => {
    expect(cleanTranscript("residente tranquila durante el turno")).toBe("Residente tranquila durante el turno.");
  });

  it("entiende comandos de puntuación dichos en voz", () => {
    expect(cleanTranscript("desayunó bien coma tomó sus medicamentos punto refiere dolor leve"))
      .toBe("Desayunó bien, tomó sus medicamentos. Refiere dolor leve.");
    expect(cleanTranscript("sin novedades nueva línea durmió toda la noche"))
      .toBe("Sin novedades.\nDurmió toda la noche.");
    expect(cleanTranscript("observaciones dos puntos piel íntegra")).toBe("Observaciones: piel íntegra.");
  });

  it("no confunde 'punto de' con un signo", () => {
    expect(cleanTranscript("curación en el punto de inserción")).toBe("Curación en el punto de inserción.");
  });

  it("escribe los valores clínicos como en la historia", () => {
    expect(cleanTranscript("tensión arterial 130 sobre 85 saturación 94 por ciento temperatura 37 grados"))
      .toBe("T.A. 130/85 SpO2 94% temperatura 37 °C.");
    expect(cleanTranscript("se administran 500 miligramos de acetaminofén")).toBe("Se administran 500 mg de acetaminofén.");
  });

  it("devuelve vacío si no se dijo nada", () => {
    expect(cleanTranscript("   ")).toBe("");
    expect(cleanTranscript("punto")).toBe("");
  });

  it("agrega lo dictado como una oración nueva", () => {
    expect(appendDictation("", "Hola.")).toBe("Hola.");
    expect(appendDictation("Durmió bien.", "Comió todo.")).toBe("Durmió bien. Comió todo.");
    expect(appendDictation("Durmió bien", "Comió todo.")).toBe("Durmió bien. Comió todo.");
  });

  it("explica en español por qué no funcionó el micrófono", () => {
    expect(dictationErrorMessage("not-allowed")).toContain("Permite el uso del micrófono");
    expect(dictationErrorMessage("otro")).toContain("Intenta de nuevo");
  });
});
