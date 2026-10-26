/**
 * Small pieces of logic shared by every HB-F / HB-G form: local dates (Colombia
 * is UTC-5, so `toISOString()` jumps to tomorrow after 7 PM), shifts, periods,
 * and turning empty inputs into the NULLs the database expects.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Today as YYYY-MM-DD in the device's time zone. */
export const todayLocal = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Current month as YYYY-MM in the device's time zone. */
export const monthLocal = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** Current time as HH:MM. */
export const timeLocal = (d: Date = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Value for an <input type="datetime-local">. */
export const dateTimeLocal = (d: Date = new Date()) => `${todayLocal(d)}T${timeLocal(d)}`;

const parseDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Monday of the week that contains `day` (YYYY-MM-DD). */
export const mondayOf = (day: string) => {
  const d = parseDay(day);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return todayLocal(d);
};

/** Adds days to a YYYY-MM-DD date. */
export const addDays = (day: string, days: number) => {
  const d = parseDay(day);
  d.setDate(d.getDate() + days);
  return todayLocal(d);
};

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export const daysBetween = (from: string, to: string) =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);

/** First day of the month and first day of the next one, to filter a month with gte/lt. */
export const monthBounds = (year: number, month: number) => {
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return { from: `${year}-${pad(month)}-01`, to: `${next.y}-${pad(next.m)}-01` };
};

/** Week of the month (1–5) a date falls in, as the HB-F6 form counts it. */
export const weekOfMonth = (day: string) => Math.min(5, Math.ceil(parseDay(day).getDate() / 7));

/** How many weeks (4 or 5) a YYYY-MM month spans for HB-F6. */
export const weeksInMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return Math.min(5, Math.ceil(lastDay / 7));
};

export const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export type CareShift = "mañana" | "tarde" | "noche";

/** Care shift for an hour of the day: mañana 7–12, tarde 12–18, noche 18–7. */
export const shiftForHour = (hour: number): CareShift =>
  hour >= 7 && hour < 12 ? "mañana" : hour >= 12 && hour < 18 ? "tarde" : "noche";

/** Semester (1 or 2) for a date. */
export const semesterOf = (d: Date = new Date()) => (d.getMonth() < 6 ? 1 : 2);

/** Quarter (1–4) for a date. */
export const quarterOf = (d: Date = new Date()) => Math.floor(d.getMonth() / 3) + 1;

/** Empty or blank text becomes null, so date/time/uuid columns don't reject it. */
export const blankToNull = <T>(value: T): T | null =>
  typeof value === "string" && value.trim() === "" ? null : value;

/** Number typed in a text box, or null when it is empty or not a number. */
export const numberOrNull = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Labels of the required fields that are still empty, in order. */
export const missingFields = (checks: Array<[label: string, ok: unknown]>) =>
  checks.filter(([, ok]) => !ok).map(([label]) => label);

/** Colombian peso amount, without decimals. */
export const formatCOP = (value: number) =>
  `$${Math.round(value || 0).toLocaleString("es-CO")}`;

/** Friendly relative day in Spanish: hoy, ayer, mañana, hace N días, en N días. */
export const relativeDay = (day: string, today: string = todayLocal()) => {
  const diff = daysBetween(today, day);
  if (diff === 0) return "hoy";
  if (diff === -1) return "ayer";
  if (diff === 1) return "mañana";
  return diff < 0 ? `hace ${-diff} días` : `en ${diff} días`;
};
