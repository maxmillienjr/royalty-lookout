import { describe, it, expect } from "vitest";
import { cleanId, classifyId, normalizeFormat } from "../src/util/ids.js";
import { toIsoDate, toNumber } from "../src/util/normalize.js";
import { rollup } from "../src/aggregate.js";
import type { SaleRecord } from "../src/types.js";

describe("identifiers", () => {
  it("strips the Excel ='...' formula wrapper off an ISBN", () => {
    expect(cleanId('="9798218754525"')).toBe("9798218754525");
    expect(cleanId("9798218754525")).toBe("9798218754525");
    expect(cleanId("")).toBeNull();
  });

  it("tells ISBNs and ASINs apart", () => {
    expect(classifyId("9798218754525")).toBe("isbn");
    expect(classifyId("B0G1CMRHH8")).toBe("asin");
    expect(classifyId(null)).toBe("unknown");
  });
});

describe("format normalization", () => {
  it("maps each distributor's wording onto the fixed set", () => {
    expect(normalizeFormat("Paperback")).toBe("paperback");
    expect(normalizeFormat("Kindle eBook")).toBe("ebook");
    expect(normalizeFormat("Hardback")).toBe("hardcover");
    expect(normalizeFormat("")).toBe("unknown");
  });
});

describe("value coercion", () => {
  it("normalizes dates and money-ish strings", () => {
    expect(toIsoDate("2025-11-11")).toBe("2025-11-11");
    expect(toIsoDate(new Date("2025-11-11T00:00:00Z"))).toBe("2025-11-11");
    expect(toIsoDate("")).toBeNull();
    expect(toNumber("$3.46")).toBeCloseTo(3.46);
    expect(toNumber("")).toBe(0);
  });
});

describe("rollup", () => {
  it("keeps revenue per-currency and isolates units-only sources", () => {
    const records: SaleRecord[] = [
      mk({ source: "kdp", currency: "USD", netRevenue: 3.46 }),
      mk({ source: "kdp", currency: "GBP", netRevenue: 2.0 }),
      mk({ source: "ingramspark", currency: null, netRevenue: null }),
    ];
    const r = rollup(records);
    expect(r.totalUnits).toBe(3);
    expect(r.revenueByCurrency).toEqual({ USD: 3.46, GBP: 2.0 });
    expect(r.unitsWithoutRevenue).toBe(1);
  });
});

function mk(partial: Partial<SaleRecord>): SaleRecord {
  return {
    source: "kdp",
    saleDate: null,
    title: "Traffic Engineer",
    author: "Max Millien",
    productId: "9798218754525",
    idType: "isbn",
    format: "paperback",
    channel: "Amazon.com",
    unitsNet: 1,
    currency: "USD",
    netRevenue: 1,
    ...partial,
  };
}
