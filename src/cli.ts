#!/usr/bin/env node
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { detect } from "./adapters/index.js";
import { rollup } from "./aggregate.js";
import type { SaleRecord } from "./types.js";

const COLUMNS: (keyof SaleRecord)[] = [
  "source",
  "saleDate",
  "title",
  "author",
  "productId",
  "idType",
  "format",
  "channel",
  "unitsNet",
  "currency",
  "netRevenue",
];

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: royalty-lookout <reports-dir> [--out consolidated.csv]");
    process.exit(1);
  }
  const outIdx = process.argv.indexOf("--out");
  const outFile = outIdx > -1 ? process.argv[outIdx + 1] : null;

  const all: SaleRecord[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);

    let result;
    try {
      result = await detect(path);
    } catch (err) {
      console.warn(`!  ${name}: could not read (${(err as Error).message})`);
      continue;
    }

    if (!result.adapter) {
      console.log(`–  ${name}: ${result.reason}`);
      continue;
    }
    const records = await result.adapter.parse(path);
    console.log(`✓  ${name}: ${result.reason} → ${records.length} rows`);
    all.push(...records);
  }

  printSummary(all);

  if (outFile) {
    writeFileSync(outFile, toCsv(all));
    console.log(`\nwrote ${all.length} rows → ${outFile}`);
  }
}

function printSummary(records: SaleRecord[]) {
  const r = rollup(records);
  const fmt = (o: Record<string, number>) =>
    Object.entries(o)
      .map(([k, v]) => `${k}=${v}`)
      .join("  ") || "—";

  console.log(`\n— consolidated: ${records.length} rows, ${r.totalUnits} units —`);
  console.log(`  units by source: ${fmt(r.unitsBySource)}`);
  console.log(`  units by format: ${fmt(r.unitsByFormat)}`);
  console.log(
    `  revenue:         ${
      Object.entries(r.revenueByCurrency)
        .map(([c, v]) => `${v.toFixed(2)} ${c}`)
        .join(", ") || "none"
    }`,
  );
  if (r.unitsWithoutRevenue)
    console.log(
      `  note: ${r.unitsWithoutRevenue} units have no revenue attached (units-only sources)`,
    );
}

function toCsv(records: SaleRecord[]): string {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [COLUMNS.join(",")];
  for (const rec of records) lines.push(COLUMNS.map((c) => esc(rec[c])).join(","));
  return lines.join("\n") + "\n";
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
