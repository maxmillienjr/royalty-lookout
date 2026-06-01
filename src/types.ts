export type Source = "kdp" | "ingramspark" | "streetlib";

export type BookFormat =
  | "ebook"
  | "paperback"
  | "hardcover"
  | "audiobook"
  | "unknown";

export type IdType = "isbn" | "asin" | "unknown";

/**
 * One sale, normalized across every distributor. The entire point of the tool
 * is that each source's idiosyncratic export "melts" into this single shape.
 *
 * Some fields are nullable on purpose: not every distributor reports every
 * fact. IngramSpark, for example, gives units but no date and no revenue, so
 * `saleDate`, `currency`, and `netRevenue` are null for its rows.
 */
export interface SaleRecord {
  source: Source;
  saleDate: string | null; // ISO yyyy-mm-dd, or null if the source omits it
  title: string;
  author: string | null;
  productId: string | null; // ISBN-13 preferred, else ASIN
  idType: IdType;
  format: BookFormat;
  channel: string | null; // marketplace / store / country
  unitsNet: number;
  currency: string | null; // ISO code, or null when the source omits revenue
  netRevenue: number | null; // expressed in `currency`; null for units-only sources
}

/** An adapter knows how to turn ONE distributor's export into SaleRecords. */
export interface Adapter {
  source: Source;
  parse(filePath: string): Promise<SaleRecord[]>;
}
