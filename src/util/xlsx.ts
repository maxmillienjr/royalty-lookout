import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";

export interface SheetTable {
  name: string;
  rows: Record<string, unknown>[];
}

/**
 * Load every sheet of a workbook as header-keyed row objects.
 *
 * Note: StreetLib ships its export with an `.xls` extension even though the
 * bytes are a modern OOXML (xlsx) zip. We load from a buffer rather than by
 * path so the misleading extension never enters into it.
 */
export async function readWorkbook(filePath: string): Promise<SheetTable[]> {
  const wb = new ExcelJS.Workbook();
  // Hand ExcelJS a plain ArrayBuffer. (Passing a Node Buffer trips a types
  // mismatch since @types/node made Buffer generic; ArrayBuffer sidesteps it.)
  const data = readFileSync(filePath);
  const ab = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  ) as ArrayBuffer;
  await wb.xlsx.load(ab);

  return wb.worksheets.map((ws) => {
    const headers: string[] = [];
    const rows: Record<string, unknown>[] = [];

    ws.eachRow((row, rowNumber) => {
      const values = row.values as unknown[]; // 1-indexed; values[0] is always empty
      if (rowNumber === 1) {
        for (let c = 1; c < values.length; c++) headers[c] = cellText(values[c]);
        return;
      }
      const obj: Record<string, unknown> = {};
      for (let c = 1; c < headers.length; c++) {
        if (headers[c]) obj[headers[c]] = normalizeCell(values[c]);
      }
      rows.push(obj);
    });

    return { name: ws.name, rows };
  });
}

/** Flatten ExcelJS's rich cell-value objects (formulas, hyperlinks, rich text). */
function normalizeCell(v: unknown): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return o.result; // formula cell -> computed value
    if ("text" in o) return o.text; // hyperlink cell
    if ("richText" in o)
      return (o.richText as { text: string }[]).map((r) => r.text).join("");
  }
  return v;
}

function cellText(v: unknown): string {
  const n = normalizeCell(v);
  return n == null ? "" : String(n).trim();
}
