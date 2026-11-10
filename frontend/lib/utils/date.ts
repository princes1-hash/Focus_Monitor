/**
 * Date and Time utilities for Focus Monitor
 * Correctly parses UTC datetimes and formats them for India Standard Time (IST / Asia/Kolkata)
 */

export function parseUtcDate(dateInput: string | Date | null | undefined): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  let str = String(dateInput).trim();
  if (!str) return new Date();

  // If ISO string without timezone indicator (e.g. "2026-11-10T07:31:00.123"),
  // append 'Z' so JavaScript correctly parses it as UTC rather than local time
  if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    str += "Z";
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function formatIndiaTime(dateInput: string | Date | null | undefined): string {
  const d = parseUtcDate(dateInput);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export function formatIndiaDate(
  dateInput: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  const d = parseUtcDate(dateInput);
  return d.toLocaleDateString("en-IN", {
    ...options,
    timeZone: "Asia/Kolkata",
  });
}

export function formatIndiaDateTime(dateInput: string | Date | null | undefined): string {
  const d = parseUtcDate(dateInput);
  return d.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

