import { describe, it, expect } from "vitest";
import {
  coldRangeFor, isColdSafe, fridgeShiftFor, PQRSF_TYPES, pqrsfDeadline, addBusinessDays,
  deadlineState, performanceConcept, nextVoucherNumber, minutesBetween, formatDuration,
  incidentGuidance, fiveRightsDone, scheduleTimes, nearestDose, daysToExpiry,
} from "./form-rules";
import {
  todayLocal, mondayOf, monthBounds, weekOfMonth, weeksInMonth, shiftForHour,
  blankToNull, numberOrNull, missingFields, relativeDay, daysBetween, monthLocal,
} from "./form-helpers";

describe("form-helpers", () => {
  it("uses the local date, not UTC", () => {
    // 8 PM in Colombia is already the next day in UTC
    const evening = new Date(2026, 9, 25, 20, 30);
    expect(todayLocal(evening)).toBe("2026-10-25");
    expect(monthLocal(evening)).toBe("2026-10");
  });

  it("snaps a date to the Monday of its week", () => {
    expect(mondayOf("2026-10-29")).toBe("2026-10-26"); // Thursday
    expect(mondayOf("2026-10-26")).toBe("2026-10-26"); // Monday
    expect(mondayOf("2026-11-01")).toBe("2026-10-26"); // Sunday
  });

  it("bounds a month including December", () => {
    expect(monthBounds(2026, 10)).toEqual({ from: "2026-10-01", to: "2026-11-01" });
    expect(monthBounds(2026, 12)).toEqual({ from: "2026-12-01", to: "2027-01-01" });
  });

  it("counts weeks of the month as HB-F6 does", () => {
    expect(weekOfMonth("2026-10-01")).toBe(1);
    expect(weekOfMonth("2026-10-29")).toBe(5);
    expect(weeksInMonth("2026-02")).toBe(4);
    expect(weeksInMonth("2026-10")).toBe(5);
  });

  it("picks the care shift from the hour", () => {
    expect(shiftForHour(8)).toBe("mañana");
    expect(shiftForHour(14)).toBe("tarde");
    expect(shiftForHour(22)).toBe("noche");
    expect(shiftForHour(3)).toBe("noche");
  });

  it("turns empty inputs into null", () => {
    expect(blankToNull("")).toBeNull();
    expect(blankToNull("  ")).toBeNull();
    expect(blankToNull("09:00")).toBe("09:00");
    expect(numberOrNull("")).toBeNull();
    expect(numberOrNull("36,5")).toBe(36.5);
    expect(numberOrNull("abc")).toBeNull();
    expect(numberOrNull(0)).toBe(0);
  });

  it("lists missing required fields", () => {
    expect(missingFields([["residente", ""], ["tipo", "Caída"], ["fecha", null]])).toEqual(["residente", "fecha"]);
  });

  it("describes relative days", () => {
    expect(relativeDay("2026-10-26", "2026-10-26")).toBe("hoy");
    expect(relativeDay("2026-10-27", "2026-10-26")).toBe("mañana");
    expect(relativeDay("2026-10-20", "2026-10-26")).toBe("hace 6 días");
    expect(daysBetween("2026-10-26", "2026-11-02")).toBe(7);
  });
});

describe("form-rules", () => {
  it("uses a safe range per cold appliance", () => {
    expect(coldRangeFor("Congelador").max).toBe(-18);
    expect(isColdSafe("Congelador", -20)).toBe(true);
    expect(isColdSafe("Congelador", 2)).toBe(false);
    expect(isColdSafe("Nevera medicamentos", 5)).toBe(true);
    expect(isColdSafe("Nevera medicamentos", 1)).toBe(false);
    expect(isColdSafe("Nevera principal", 4)).toBe(true);
    expect(isColdSafe("Nevera principal", 6)).toBe(false);
  });

  it("stores the fridge shift the way the database accepts it", () => {
    expect(fridgeShiftFor(9)).toBe("manana");
    expect(fridgeShiftFor(15)).toBe("tarde");
  });

  it("uses the exact PQRSF values allowed by the database", () => {
    expect(PQRSF_TYPES.map(t => t.value)).toEqual(["peticion", "queja", "reclamo", "sugerencia", "felicitacion"]);
  });

  it("computes the 15 business-day PQRSF deadline", () => {
    expect(addBusinessDays("2026-10-23", 1)).toBe("2026-10-26"); // Friday → Monday
    expect(pqrsfDeadline("queja", "2026-10-26")).toBe("2026-11-16");
    expect(pqrsfDeadline("felicitacion", "2026-10-26")).toBeNull();
    expect(deadlineState("2026-10-20", "2026-10-26")).toBe("vencido");
    expect(deadlineState("2026-10-28", "2026-10-26")).toBe("por_vencer");
    expect(deadlineState(null, "2026-10-26")).toBe("sin_plazo");
  });

  it("stores the performance concept as the database expects", () => {
    expect(performanceConcept(30)).toBe("sobresaliente");
    expect(performanceConcept(25)).toBe("sobresaliente");
    expect(performanceConcept(18)).toBe("satisfactorio");
    expect(performanceConcept(17)).toBe("necesita_mejorar");
  });

  it("numbers vouchers in sequence per year", () => {
    expect(nextVoucherNumber(2026, null)).toBe("P-2026-0001");
    expect(nextVoucherNumber(2026, "P-2026-0041")).toBe("P-2026-0042");
    expect(nextVoucherNumber(2027, "P-2026-0041")).toBe("P-2027-0001");
  });

  it("computes training duration", () => {
    expect(minutesBetween("08:00", "10:30")).toBe(150);
    expect(minutesBetween("10:00", "09:00")).toBeNull();
    expect(formatDuration(150)).toBe("2 h 30 min");
    expect(formatDuration(45)).toBe("45 min");
  });

  it("guides the incident protocol", () => {
    const tips = incidentGuidance({
      incident_type: "Caída desde su propia altura", consequences: "Posible fractura o pérdida de conciencia",
      first_aid: false, family_notified: false, transferred_to_er: false,
    });
    expect(tips[0].level).toBe("danger");
    expect(tips.some(t => /familia/.test(t.text))).toBe(true);
    const handled = incidentGuidance({
      incident_type: "Otro", consequences: "Ninguna", first_aid: false, family_notified: false, transferred_to_er: false,
    });
    expect(handled).toEqual([]);
  });

  it("checks the five rights", () => {
    expect(fiveRightsDone({ check_patient: true, check_medication: true, check_dose: true, check_route: true })).toBe(false);
    expect(fiveRightsDone({ check_patient: true, check_medication: true, check_dose: true, check_route: true, check_time: true })).toBe(true);
  });

  it("reads clock times from a free-text schedule", () => {
    expect(scheduleTimes("8:00 - 20:00")).toEqual(["08:00", "20:00"]);
    expect(scheduleTimes("8am y 8 pm")).toEqual(["08:00", "20:00"]);
    expect(scheduleTimes("cada 8 horas")).toEqual([]);
    expect(nearestDose(["08:00", "14:00", "20:00"], "13:10")).toBe("14:00");
    expect(nearestDose([], "13:10")).toBeNull();
  });

  it("counts days to expiry", () => {
    expect(daysToExpiry("2026-10-20", "2026-10-26")).toBe(-6);
    expect(daysToExpiry(null, "2026-10-26")).toBeNull();
  });
});
