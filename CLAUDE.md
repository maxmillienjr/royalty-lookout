# royalty-lookout

Aggregates self-publishing royalty/sales exports from **KDP**, **IngramSpark**, and
**StreetLib** into one normalized ledger. TypeScript + Node (ESM, `"type": "module"`),
Node >= 18. See `README.md` for the user-facing story; this file is for working in the
code.

## Commands

```bash
npm run dev -- <reports-dir>                 # run the CLI from source (tsx)
npm run dev -- <reports-dir> --out out.csv   #   + write the merged ledger
npm run dev -- <reports-dir> --html out.html #   + write the self-contained HTML report
npm test                                     # vitest (unit tests in test/)
npm run typecheck                            # tsc --noEmit — keep this green
npm run build                                # tsc -> dist/ (what gets published)
npm run demo                                 # regenerate docs/sample-report.* from fixtures
```

Run `npm test` and `npm run typecheck` before committing. `npm run build` runs
automatically on `prepublishOnly`.

## Architecture

One **adapter per distributor** is the whole design. Each adapter turns one vendor's
messy export into `SaleRecord[]` (the shared shape in `src/types.ts`); nothing else
knows a vendor's quirks.

```
src/
  types.ts            SaleRecord — the shape every source melts into; Adapter interface
  adapters/
    index.ts          detect(file) sniffs a file and dispatches to the right adapter
    kdp.ts            reads the "Combined Sales" sheet of the KDP workbook
    ingramspark.ts    units-only CSV (no date, no revenue)
    streetlib.ts      reads the "Items" sheet of the .xls-named-but-really-xlsx file
  util/
    csv.ts            encoding-aware CSV read (IngramSpark is UTF-16, no BOM)
    xlsx.ts           workbook reader (exceljs)
    ids.ts            cleanId / classifyId (ISBN vs ASIN) / normalizeFormat
    normalize.ts      toIsoDate, toNumber
  aggregate.ts        rollup(): per-currency / per-source / per-format
  report.ts           renders consolidated data as a self-contained HTML page
  cli.ts              folder in -> summary + optional consolidated.csv + report.html
```

**Adding a distributor** (Draft2Digital, Apple direct, …): write one new adapter that
emits `SaleRecord[]`, then teach `detect()` to recognize its file. Touch nothing else.
`detect()` routes CSVs on header names and workbooks on sheet names, and returns a
`null` adapter with a reason for files we recognize but skip (e.g. IngramSpark's
"subject rank" report, which carries no sales).

## Design invariants — do not "fix" these; they are deliberate

- **Native currency only.** Revenue is reported per currency and never summed across
  currencies. A fake exchange rate is worse than no number. Cross-currency conversion
  is a v0.2 problem.
- **`null` revenue, never a fake `0`.** Units-only sources (IngramSpark) carry `null`
  for `saleDate`, `currency`, and `netRevenue`. The summary reports those units
  separately. Do not coerce missing revenue to zero — it lies about the data.
- **ISBN-13 preferred, ASIN as fallback.** `idType` records which one `productId` holds.
- Nullable fields on `SaleRecord` are intentional: not every distributor records every
  fact. Keep new code null-aware rather than widening the schema with placeholder values.

## Gotchas (real, load-bearing)

- IngramSpark CSV is **UTF-16 with no BOM** and wraps ISBNs in an Excel `="..."`
  formula — `cleanId()` strips that wrapper; `util/csv.ts` handles the encoding.
- KDP ships a **9-sheet workbook**; only "Combined Sales" matters.
- StreetLib's file is named `.xls` but is really xlsx — the workbook reader handles it,
  and `detect()` routes everything non-CSV through the workbook path on purpose.

## Conventions

- ESM throughout: relative imports use the `.js` extension in source (e.g.
  `import { detect } from "./adapters/index.js"`), even though the files are `.ts`.
- Real royalty exports are personal financial data. `.gitignore` excludes `/reports/`
  and `consolidated.csv` — never commit real reports; tests run on fixtures only.
