# rep-agg

Aggregate self-publishing royalty/sales reports from **KDP**, **IngramSpark**,
and **StreetLib** into one normalized ledger.

Wide indie authors publish through several distributors and then reconcile
sales by hand in a spreadsheet, because every distributor exports a different
shape. `rep-agg` melts those exports into a single table you can total, filter,
or feed into anything else.

## The actual hard part

These sources don't just use different column names — **they disagree on which
facts they record at all:**

| Fact      | KDP                  | IngramSpark      | StreetLib              |
| --------- | -------------------- | ---------------- | ---------------------- |
| Date      | ✅ Royalty Date      | ❌ none          | ✅ Order date          |
| Units     | ✅ Net Units Sold    | ✅ Units Sold    | ✅ Quantity            |
| Revenue   | ✅ Royalty + currency| ❌ **none**      | ✅ Revenues (+ native) |
| Refunds   | ✅ netted out        | ❌               | (baked in)            |
| Product   | ASIN *or* ISBN       | ISBN as `="..."` | ISBN + external id    |
| Format    | buried in a type string | Format column | Item type           |
| Grain     | per-transaction      | one summary row  | per-item line items    |

On top of that the files fight you: the IngramSpark CSV is UTF-16 with no BOM
and wraps ISBNs in an Excel `="..."` formula; KDP ships a 9-sheet workbook;
StreetLib hands you an `.xls` file that is secretly xlsx.

`rep-agg` absorbs all of that and emits one clean schema:

```
source · sale_date · title · author · product_id · id_type · format · channel · units_net · currency · net_revenue
```

Design rules in v0.1:

- **ISBN-13 preferred**, ASIN as fallback (`id_type` records which).
- **Native currency only** — revenue is reported per currency and never summed
  across currencies. (Conversion is a later problem.)
- **Units-only sources are first class.** IngramSpark has no revenue, so those
  rows carry `null` revenue rather than a fake `0`, and the summary reports
  those units separately.

## Usage

```bash
npm install
npm run dev -- /path/to/your/reports            # print a summary
npm run dev -- /path/to/your/reports --out out.csv   # also write the merged ledger
```

Point it at a folder containing your downloaded reports; it sniffs each file,
routes it to the right adapter, and skips anything it doesn't recognize (for
example IngramSpark's *rank* report, which carries no sales).

> Your real reports are personal financial data — keep them outside the repo.
> `.gitignore` already excludes `/reports/` and `consolidated.csv`.

## Architecture

```
src/
  types.ts            the SaleRecord shape every source melts into
  adapters/
    kdp.ts            one adapter per distributor — each returns SaleRecord[]
    ingramspark.ts
    streetlib.ts
    index.ts          sniffs a file and dispatches to the right adapter
  util/               csv (encoding-aware), xlsx, id/format/date normalizers
  aggregate.ts        per-currency / per-source / per-format rollups
  cli.ts              folder in → summary + consolidated.csv out
```

Each distributor lives behind an **adapter**: a small module whose only job is
to turn that one vendor's messy export into the shared `SaleRecord` shape.
Adding a new distributor (Draft2Digital, Apple direct, …) means writing one new
adapter and teaching `detect()` to recognize it — nothing else changes.

## Roadmap

- v0.2: optional currency conversion to a reporting currency
- v0.2: dedupe across sources by `product_id` + date
- v0.2: month-over-month rollup output
- later: a small static dashboard

## License

MIT
