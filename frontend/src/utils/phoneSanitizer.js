// src/utils/phoneSanitizer.js
// Mirrors the backend's app.core.utils.normalize_kenyan_phone so users get
// the same validation feedback client-side before a request ever goes out.

/**
 * Normalizes any Kenyan phone format to +2547XXXXXXXX / +2541XXXXXXXX.
 * Returns the original input untouched if it can't be confidently normalized,
 * so callers can decide how to surface the validation error.
 */
export function normalizeKenyanPhone(phoneStr) {
  if (!phoneStr) return "";

  const digits = String(phoneStr).replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 10) {
    return "+254" + digits.slice(1);
  }
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) {
    return "+254" + digits;
  }
  if (digits.startsWith("254") && digits.length === 12) {
    return "+" + digits;
  }
  if (String(phoneStr).startsWith("+254") && digits.length === 12) {
    return String(phoneStr);
  }
  return String(phoneStr);
}

/** True if the value normalizes to a well-formed Kenyan MSISDN. */
export function isValidKenyanPhone(phoneStr) {
  return /^\+254(7|1)\d{8}$/.test(normalizeKenyanPhone(phoneStr));
}