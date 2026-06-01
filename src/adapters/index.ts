import { extname } from "node:path";
import { readCsv } from "../util/csv.js";
import { readWorkbook } from "../util/xlsx.js";
import { kdpAdapter } from "./kdp.js";
import { ingramSparkAdapter } from "./ingramspark.js";
import { streetLibAdapter } from "./streetlib.js";
import type { Adapter } from "../types.js";

export interface DetectResult {
  adapter: Adapter | null;
  reason: string;
}

/**
 * Sniff a report file and decide which distributor produced it.
 *
 * Returns a null adapter (with a human-readable reason) for files we recognize
 * but deliberately skip — most importantly IngramSpark's "subject rank" report,
 * which looks sales-ish but carries a ranking instead of any sales.
 */
export async function detect(filePath: string): Promise<DetectResult> {
  if (extname(filePath).toLowerCase() === ".csv") {
    const rows = readCsv(filePath);
    const headers = rows.length ? Object.keys(rows[0]) : [];
    if (headers.some((h) => /subject rank/i.test(h)))
      return { adapter: null, reason: "IngramSpark rank report (no sales) — skipped" };
    if (headers.includes("ISBN") && headers.includes("Units Sold"))
      return { adapter: ingramSparkAdapter, reason: "IngramSpark sales report" };
    return { adapter: null, reason: "unrecognized CSV — skipped" };
  }

  // Anything else is treated as a workbook (covers .xlsx and StreetLib's
  // .xls-named-but-really-xlsx files). We route on the sheet names inside.
  const sheetNames = (await readWorkbook(filePath)).map((s) => s.name);
  if (sheetNames.includes("Combined Sales"))
    return { adapter: kdpAdapter, reason: "KDP royalties export" };
  if (sheetNames.includes("Items"))
    return { adapter: streetLibAdapter, reason: "StreetLib sales export" };
  return { adapter: null, reason: "unrecognized spreadsheet — skipped" };
}
