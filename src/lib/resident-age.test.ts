import { describe, expect, it } from "vitest";
import { ageFromBirthDate, formatAge, nextBirthday, parseDateOnly } from "./resident-age";

describe("resident age", () => {
  it("parses database dates as local calendar dates", () => {
    const d = parseDateOnly("1940-05-10");
    expect(d?.getDate()).toBe(10);
    expect(d?.getMonth()).toBe(4);
    expect(parseDateOnly("1940-02-31")).toBeNull();
    expect(parseDateOnly("10/05/1940")).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
  });

  it("adds a year exactly on the birthday, not the day before", () => {
    expect(ageFromBirthDate("1940-05-10", new Date(2026, 4, 9))).toBe(85);
    expect(ageFromBirthDate("1940-05-10", new Date(2026, 4, 10))).toBe(86);
    expect(ageFromBirthDate("1940-05-10", new Date(2026, 4, 10, 23, 30))).toBe(86);
  });

  it("ignores missing or future birth dates", () => {
    expect(ageFromBirthDate(null)).toBeUndefined();
    expect(ageFromBirthDate("2099-01-01", new Date(2026, 0, 1))).toBeUndefined();
    expect(formatAge(null)).toBe("Edad sin registrar");
    expect(formatAge("1950-01-01", new Date(2026, 9, 26))).toBe("76 años");
  });

  it("counts days to the next birthday across the new year", () => {
    expect(nextBirthday("1940-10-26", new Date(2026, 9, 26))).toEqual({ days: 0, turning: 86 });
    expect(nextBirthday("1940-01-02", new Date(2026, 11, 31))).toEqual({ days: 2, turning: 87 });
  });
});
