import { readWorkbook } from "../util/xlsx.js";
import { cleanId, classifyId } from "../util/ids.js";
import { toIsoDate, toNumber } from "../util/normalize.js";
import type { Adapter, BookFormat, SaleRecord } from "../types.js";

// KDP's export is a 9-sheet workbook. "Combined Sales" is the one sheet that
// already merges eBook + paperback + hardcover line items, so we read it and
// ignore the per-format and summary sheets.
const SHEET = "Combined Sales";

export const kdpAdapter: Adapter = {
  source: "kdp",
  async parse(filePath) {
    const sheets = await readWorkbook(filePath);
    const sheet = sheets.find((s) => s.name === SHEET);
    if (!sheet) return [];

    // flatMap in one pass: return [] to drop a row, [record] to keep it.
    return sheet.rows.flatMap((r): SaleRecord[] => {
      if (!r["Title"]) return [];
      const id = cleanId(r["ASIN/ISBN"]);
      return [
        {
          source: "kdp",
          saleDate: toIsoDate(r["Royalty Date"]),
          title: String(r["Title"]),
          author: r["Author Name"] ? String(r["Author Name"]) : null,
          productId: id,
          idType: classifyId(id),
          // KDP hides the format inside its transaction/royalty type strings,
          // e.g. "Standard - Paperback". A bare "Standard" means Kindle.
          format: kdpFormat(r["Transaction Type"], r["Royalty Type"]),
          channel: r["Marketplace"] ? String(r["Marketplace"]) : null,
          unitsNet: toNumber(r["Net Units Sold"]),
          currency: r["Currency"] ? String(r["Currency"]) : null,
          netRevenue: toNumber(r["Royalty"]),
        },
      ];
    });
  },
};

function kdpFormat(transactionType: unknown, royaltyType: unknown): BookFormat {
  const hay = `${transactionType ?? ""} ${royaltyType ?? ""}`.toLowerCase();
  if (hay.includes("paperback")) return "paperback";
  if (hay.includes("hardcover")) return "hardcover";
  if (hay.includes("audio")) return "audiobook";
  return "ebook";
}
