/**
 * Ages and birthdays computed from a resident's birth date.
 * Dates from the database come as "YYYY-MM-DD"; they are read as local calendar
 * dates (not UTC midnight) so a birthday never shifts a day in Colombia (UTC-5).
 */

export const parseDateOnly = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  // Rejects impossible dates such as 1940-02-31
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
};

/** Whole years lived as of `now`; undefined when the birth date is missing, invalid or in the future. */
export const ageFromBirthDate = (birthDate: string | null | undefined, now = new Date()): number | undefined => {
  const birth = parseDateOnly(birthDate);
  if (!birth) return undefined;
  let age = now.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (startOfDay(now) < birthdayThisYear) age--;
  return age < 0 ? undefined : age;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Days until the next birthday (0 = today) and the age the resident turns then. */
export const nextBirthday = (birthDate: string | null | undefined, now = new Date()) => {
  const birth = parseDateOnly(birthDate);
  if (!birth) return null;
  const today = startOfDay(now);
  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
  const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  return { days, turning: next.getFullYear() - birth.getFullYear() };
};

export const formatAge = (birthDate: string | null | undefined, now = new Date()) => {
  const age = ageFromBirthDate(birthDate, now);
  return age === undefined ? "Edad sin registrar" : `${age} años`;
};
