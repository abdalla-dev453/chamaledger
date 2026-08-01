
const kes = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const kesPrecise = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
});

/** Formats a number as whole-shilling KES, e.g. "Ksh 184,250". */
export function formatKES(amount, { precise = false } = {}) {
  const value = Number(amount ?? 0);
  return (precise ? kesPrecise : kes).format(value);
}

/** "12 Jul 2026" */
export function formatDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

/** "Today, 9:12 AM" / "Yesterday, 4:30 PM" / "12 Jul, 4:30 PM" */
export function formatRelativeDateTime(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const time = date.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, yesterday)) return `Yesterday, ${time}`;

  return `${date.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}, ${time}`;
}

/** Days and hours remaining until a target date (never negative). */
export function daysHoursUntil(target) {
  if (!target) return { days: 0, hours: 0, isPast: true };
  const targetDate = target instanceof Date ? target : new Date(target);
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, isPast: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    isPast: false,
  };
}

/** Converts snake_case / enum-style status values into "Title Case" for display. */
export function formatStatusLabel(status) {
  if (!status) return "—";
  return String(status)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}