import { readWorkbook } from "../util/xlsx.js";
import { cleanId, classifyId, normalizeFormat } from "../util/ids.js";
import { toIsoDate, toNumber } from "../util/normalize.js";
import type { Adapter, SaleRecord } from "../types.js";

// StreetLib distributes to Apple/Google/Kobo/etc. Its single "Items" sheet has
// the richest schema (38 columns) including a vendor-converted revenue figure,
// but for v0.1 we keep each sale in its NATIVE currency and leave conversion
// for later.
const SHEET = "Items";

export const streetLibAdapter: Adapter = {
  source: "streetlib",
  async parse(filePath) {
    const sheets = await readWorkbook(filePath);
    const sheet = sheets.find((s) => s.name === SHEET);
    if (!sheet) return [];

    return sheet.rows
      .filter((r) => r["Title"])
      .map((r): SaleRecord => {
        const id = cleanId(r["Isbn"]);
        return {
          source: "streetlib",
          saleDate: toIsoDate(r["Order date"]),
          title: String(r["Title"]),
          author: r["Authors"] ? String(r["Authors"]) : null,
          productId: id,
          idType: classifyId(id),
          format: normalizeFormat(r["Item type"]),
          channel: r["Store"] ? String(r["Store"]) : null,
          unitsNet: toNumber(r["Quantity"]),
          currency: r["Currency"] ? String(r["Currency"]) : null,
          netRevenue: r["Revenues"] != null ? toNumber(r["Revenues"]) : null,
        };
      });
  },
};
