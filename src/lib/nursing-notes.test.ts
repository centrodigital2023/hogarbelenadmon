import { describe, it, expect } from "vitest";
import {
  appendPhrase, completedSections, composeQuickNote, emptyNoteEntry, entryAlerts, localDateISO,
  parseVital, relativeDay, shiftForHour, toDailyLog, toLiveEntry, initials, noteToHtml,
} from "./nursing-notes";

describe("notas de enfermería", () => {
  it.each([
    [6, "noche"], [7, "mañana"], [11, "mañana"], [12, "tarde"], [17, "tarde"], [18, "noche"], [23, "noche"], [0, "noche"],
  ])("a las %i h el turno es %s", (hour, shift) => {
    expect(shiftForHour(hour)).toBe(shift);
  });

  it("usa la fecha local, no la UTC", () => {
    expect(localDateISO(new Date(2026, 9, 22, 21, 30))).toBe("2026-10-22");
  });

  it("acepta coma decimal e ignora vacíos o ceros", () => {
    expect(parseVital("36,5")).toBe(36.5);
    expect(parseVital("")).toBeNull();
    expect(parseVital("0")).toBeNull();
    expect(parseVital("abc")).toBeNull();
  });

  it("agrega frases en líneas nuevas sin repetirlas", () => {
    const once = appendPhrase("", "Durmió bien.");
    expect(once).toBe("Durmió bien.");
    const twice = appendPhrase(once, "Comió completo.");
    expect(twice).toBe("Durmió bien.\nComió completo.");
    expect(appendPhrase(twice, "Durmió bien.")).toBe(twice);
  });

  it("detecta valores fuera de rango con los rangos compartidos", () => {
    const e = { ...emptyNoteEntry(), spo2: "88", temperature: "38,2", blood_pressure: "120/80" };
    expect(entryAlerts(e)).toEqual(["SpO2: 88%", "Temp: 38.2°C"]);
  });

  it("calcula las secciones completadas", () => {
    const e = { ...emptyNoteEntry(), heart_rate: "72", mood: "😊 Alegre" };
    expect(completedSections(e, "")).toEqual({ vitals: true, wellbeing: true, observations: false, note: false });
  });

  it("arma una nota rápida con los datos diligenciados y las alertas", () => {
    const e = {
      ...emptyNoteEntry(), blood_pressure: "170/95", heart_rate: "80", nutrition_pct: 75, hydration_glasses: 1,
      mood: "😌 Tranquilo", elimination: "Normal", observations: "Recibe visita familiar.",
    };
    const note = composeQuickNote(e, { residentName: "Ana Pérez", shift: "tarde", date: "2026-10-22", responsibleName: "Luz", responsibleRole: "Auxiliar de Enfermería" });
    expect(note).toContain("Ana Pérez");
    expect(note).toContain("T.A. 170/95 mmHg, FC 80 lpm");
    expect(note).toContain("Valores fuera de rango:** T.A.: 170/95");
    expect(note).toContain("ánimo tranquilo, consume el 75% de sus alimentos, 1 vaso de líquido, eliminación normal");
    expect(note).toContain("Recibe visita familiar.");
    expect(note).toContain("Registrado por: Luz — Auxiliar de Enfermería");
  });

  it("no inventa secciones vacías en la nota rápida", () => {
    const note = composeQuickNote(emptyNoteEntry(), { residentName: "Ana", shift: "noche", date: "2026-10-22" });
    expect(note).not.toContain("Signos vitales");
    expect(note).not.toContain("Bienestar");
    expect(note).not.toContain("Registrado por");
  });

  it("convierte la entrada para la IA y para la bitácora con números", () => {
    const e = { ...emptyNoteEntry(), temperature: "36,8", observations: "  " };
    expect(toLiveEntry(e)).toMatchObject({ temperature: 36.8, spo2: null, observations: null, nutrition_pct: 0 });
    const log = toDailyLog(e, { residentId: "r1", userId: "u1", shift: "mañana", date: "2026-10-22", responsibleName: "", responsibleRole: "", note: "x", signature: null });
    expect(log).toMatchObject({ resident_id: "r1", created_by: "u1", temperature: 36.8, responsible_name: null, ai_nursing_note: "x" });
  });

  it("muestra días relativos e iniciales", () => {
    expect(relativeDay("2026-10-22T10:00:00Z", "2026-10-22")).toBe("hoy");
    expect(relativeDay("2026-10-21", "2026-10-22")).toBe("ayer");
    expect(relativeDay("2026-10-18", "2026-10-22")).toBe("hace 4 días");
    expect(initials("María  del Carmen Ruiz")).toBe("MD");
  });
});

describe("vista previa de la nota", () => {
  it("convierte negrita, cursiva y citas y escapa HTML", () => {
    expect(noteToHtml("**Signos** y *confort*")).toBe("<p><strong>Signos</strong> y <em>confort</em></p>");
    expect(noteToHtml("> Registrado por: Luz")).toBe('<p class="note-quote">Registrado por: Luz</p>');
    expect(noteToHtml("<script>x</script>")).toBe("<p>&lt;script&gt;x&lt;/script&gt;</p>");
  });
});
