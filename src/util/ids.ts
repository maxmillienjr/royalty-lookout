import type { BookFormat, IdType } from "../types.js";

/**
 * Distributors export ISBNs wrapped in an Excel formula — `="9798218754525"` —
 * to stop spreadsheet apps from coercing them to a number and dropping the
 * leading digit. Strip that wrapper (and any stray quotes) back to the digits.
 */
export function cleanId(raw: unknown): string | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  const formula = s.match(/^="?(.*?)"?$/); // ="..."  ->  ...
  if (formula) s = formula[1];
  s = s.replace(/["=]/g, "").trim();
  return s.length ? s : null;
}

/** Decide whether an identifier is an ISBN or an Amazon ASIN. */
export function classifyId(id: string | null): IdType {
  if (!id) return "unknown";
  if (/^B0[A-Z0-9]{8}$/i.test(id)) return "asin";
  const digits = id.replace(/[-\s]/g, "");
  if (/^\d{13}$/.test(digits) || /^\d{10}$/.test(digits)) return "isbn";
  return "unknown";
}

/** Collapse each distributor's free-text format label onto our fixed set. */
export function normalizeFormat(raw: unknown): BookFormat {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("paperback")) return "paperback";
  if (s.includes("hardcover") || s.includes("hardback")) return "hardcover";
  if (s.includes("audio")) return "audiobook";
  if (
    s.includes("ebook") ||
    s.includes("e-book") ||
    s.includes("kindle") ||
    s.includes("digital")
  )
    return "ebook";
  return "unknown";
}
