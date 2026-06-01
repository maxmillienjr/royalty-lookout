import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

/**
 * Read a CSV into header-keyed row objects.
 *
 * Some distributors (IngramSpark) export UTF-16LE without a byte-order mark,
 * which decodes as garbage if you assume UTF-8. We sniff for the tell-tale
 * NUL bytes and decode accordingly.
 */
export function readCsv(filePath: string): Record<string, string>[] {
  const buf = readFileSync(filePath);
  return parse(decode(buf), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  });
}

function decode(buf: Buffer): string {
  // UTF-16LE text in the ASCII range is every-other-byte NUL ("T\0i\0t\0...").
  const sample = buf.subarray(0, 64);
  let nulls = 0;
  for (const b of sample) if (b === 0) nulls++;
  return nulls > sample.length / 4 ? buf.toString("utf16le") : buf.toString("utf8");
}
