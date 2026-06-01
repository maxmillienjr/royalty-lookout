import { mkdirSync, writeFileSync } from "node:fs";
import { renderHtml } from "../src/report.js";
import type { SaleRecord } from "../src/types.js";

// Synthetic data for the README screenshot — NOT real sales. Made-up author,
// titles, and ISBNs, chosen to exercise multiple sources, currencies, formats,
// and the units-only (revenue-less) IngramSpark case.
const base: SaleRecord = {
  source: "kdp",
  saleDate: "2026-01-01",
  title: "The Long Commute",
  author: "Jordan Vale",
  productId: "9781234567890",
  idType: "isbn",
  format: "paperback",
  channel: "Amazon.com",
  unitsNet: 1,
  currency: "USD",
  netRevenue: 0,
};
const rec = (o: Partial<SaleRecord>): SaleRecord => ({ ...base, ...o });

const data: SaleRecord[] = [
  rec({ saleDate: "2026-01-04", format: "ebook", productId: "B0DEMO1234", idType: "asin", currency: "USD", netRevenue: 3.46, unitsNet: 5 }),
  rec({ saleDate: "2026-01-09", format: "paperback", currency: "USD", netRevenue: 5.69, unitsNet: 3 }),
  rec({ saleDate: "2026-01-12", format: "ebook", productId: "B0DEMO1234", idType: "asin", channel: "Amazon.co.uk", currency: "GBP", netRevenue: 2.05, unitsNet: 2 }),
  rec({ saleDate: "2026-01-18", format: "paperback", channel: "Amazon.de", currency: "EUR", netRevenue: 4.8, unitsNet: 1 }),
  rec({ source: "streetlib", saleDate: "2026-01-07", title: "Signal & Noise", productId: "9789876543210", format: "ebook", channel: "Apple Books", currency: "USD", netRevenue: 4.19, unitsNet: 4 }),
  rec({ source: "streetlib", saleDate: "2026-01-15", title: "Signal & Noise", productId: "9789876543210", format: "ebook", channel: "Google Play", currency: "EUR", netRevenue: 3.5, unitsNet: 2 }),
  rec({ source: "streetlib", saleDate: "2026-01-22", title: "Signal & Noise", productId: "9789876543210", format: "ebook", channel: "Kobo", currency: "USD", netRevenue: 4.19, unitsNet: 1 }),
  rec({ source: "ingramspark", saleDate: null, title: "The Long Commute", format: "paperback", channel: "United States", currency: null, netRevenue: null, unitsNet: 6, author: null }),
  rec({ source: "ingramspark", saleDate: null, title: "Signal & Noise", productId: "9789876543210", format: "hardcover", channel: "United Kingdom", currency: null, netRevenue: null, unitsNet: 2, author: null }),
];

mkdirSync("docs", { recursive: true });
writeFileSync("docs/sample-report.html", renderHtml(data));
console.log("wrote docs/sample-report.html");
