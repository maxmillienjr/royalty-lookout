import { readCsv } from "../util/csv.js";
import { cleanId, classifyId, normalizeFormat } from "../util/ids.js";
import { toNumber } from "../util/normalize.js";
import type { Adapter, SaleRecord } from "../types.js";

// IngramSpark's exports are the poorest of the three: units only. No date, no
// price, no currency. We treat it as a first-class "units-only" source rather
// than pretending the missing facts are zero.
export const ingramSparkAdapter: Adapter = {
  source: "ingramspark",
  async parse(filePath) {
    // flatMap in one pass: return [] to drop a row, [record] to keep it.
    return readCsv(filePath).flatMap((r): SaleRecord[] => {
      if (!r["Title"]) return [];
      const id = cleanId(r["ISBN"]);
      return [
        {
          source: "ingramspark",
          saleDate: null,
          title: r["Title"],
          author: r["Author"] ?? null,
          productId: id,
          idType: classifyId(id),
          format: normalizeFormat(r["Format"]),
          channel: r["Country"] ?? null,
          unitsNet: toNumber(r["Units Sold"]),
          currency: null,
          netRevenue: null,
        },
      ];
    });
  },
};
