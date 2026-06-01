import type { SaleRecord } from "./types.js";

export interface Rollup {
  totalUnits: number;
  unitsBySource: Record<string, number>;
  unitsByFormat: Record<string, number>;
  /** Revenue is kept PER CURRENCY — we never sum across currencies in v0.1. */
  revenueByCurrency: Record<string, number>;
  /** Units we couldn't attach revenue to (units-only sources like IngramSpark). */
  unitsWithoutRevenue: number;
}

export function rollup(records: SaleRecord[]): Rollup {
  const r: Rollup = {
    totalUnits: 0,
    unitsBySource: {},
    unitsByFormat: {},
    revenueByCurrency: {},
    unitsWithoutRevenue: 0,
  };

  for (const rec of records) {
    r.totalUnits += rec.unitsNet;
    r.unitsBySource[rec.source] = (r.unitsBySource[rec.source] ?? 0) + rec.unitsNet;
    r.unitsByFormat[rec.format] = (r.unitsByFormat[rec.format] ?? 0) + rec.unitsNet;

    if (rec.currency && rec.netRevenue != null) {
      r.revenueByCurrency[rec.currency] =
        (r.revenueByCurrency[rec.currency] ?? 0) + rec.netRevenue;
    } else {
      r.unitsWithoutRevenue += rec.unitsNet;
    }
  }

  return r;
}
