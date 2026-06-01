import { rollup } from "./aggregate.js";
import type { SaleRecord } from "./types.js";

/**
 * Render the consolidated sales into a single self-contained HTML file:
 * inline styles + a little vanilla JS for column sorting, no external assets,
 * so it opens straight from disk (file://) with no server.
 */
export function renderHtml(records: SaleRecord[]): string {
  const r = rollup(records);
  const generated = new Date().toISOString().slice(0, 16).replace("T", " ");

  const revenue =
    Object.entries(r.revenueByCurrency)
      .map(([c, v]) => `${v.toFixed(2)} ${c}`)
      .join(" · ") || "—";

  const cards = [
    card("Units sold", String(r.totalUnits)),
    card("Revenue", revenue),
    card("By source", breakdown(r.unitsBySource)),
    card("By format", breakdown(r.unitsByFormat)),
  ].join("\n");

  const note = r.unitsWithoutRevenue
    ? `<p class="note">${r.unitsWithoutRevenue} unit(s) have no revenue attached (units-only sources such as IngramSpark).</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Royalty Lookout — sales report</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         margin: 0; padding: 2rem; max-width: 1100px; margin-inline: auto; }
  h1 { margin: 0 0 .25rem; font-size: 1.5rem; }
  .sub { color: #6b7280; margin: 0 0 1.5rem; font-size: .85rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
           gap: 1rem; margin-bottom: 1.5rem; }
  .cardbox { border: 1px solid #e5e7eb; border-radius: 10px; padding: 1rem; }
  .cardbox h2 { margin: 0 0 .35rem; font-size: .72rem; text-transform: uppercase;
                letter-spacing: .05em; color: #6b7280; }
  .cardbox .v { font-size: 1.15rem; font-weight: 600; }
  .note { color: #92400e; background: #fffbeb; border: 1px solid #fde68a;
          padding: .6rem .8rem; border-radius: 8px; font-size: .85rem; }
  table { border-collapse: collapse; width: 100%; font-size: .85rem; }
  th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid #eee; }
  th { cursor: pointer; user-select: none; white-space: nowrap; position: sticky; top: 0;
       background: Canvas; }
  th:hover { color: #2563eb; }
  th[data-sort="num"], td.num { text-align: right; font-variant-numeric: tabular-nums; }
  th.asc::after { content: " ▲"; } th.desc::after { content: " ▼"; }
  td.muted { color: #9ca3af; }
  tbody tr:hover { background: rgba(127,127,127,.06); }
</style>
</head>
<body>
  <h1>Royalty Lookout</h1>
  <p class="sub">Consolidated from ${records.length} rows · generated ${generated}</p>
  <div class="cards">${cards}</div>
  ${note}
  <table>
    <thead><tr>
      <th data-sort="str">Source</th>
      <th data-sort="str">Date</th>
      <th data-sort="str">Title</th>
      <th data-sort="str">Author</th>
      <th data-sort="str">Product ID</th>
      <th data-sort="str">Type</th>
      <th data-sort="str">Format</th>
      <th data-sort="str">Channel</th>
      <th data-sort="num">Units</th>
      <th data-sort="str">Cur</th>
      <th data-sort="num">Revenue</th>
    </tr></thead>
    <tbody>
${records.map(rowHtml).join("\n")}
    </tbody>
  </table>
<script>
  document.querySelectorAll("th[data-sort]").forEach((th, i) => {
    th.addEventListener("click", () => {
      const table = th.closest("table");
      const tbody = table.querySelector("tbody");
      const numeric = th.dataset.sort === "num";
      const asc = !th.classList.contains("asc");
      const rows = [...tbody.rows].sort((a, b) => {
        const x = a.cells[i].dataset.v ?? a.cells[i].textContent;
        const y = b.cells[i].dataset.v ?? b.cells[i].textContent;
        if (numeric) return (asc ? 1 : -1) * ((parseFloat(x) || 0) - (parseFloat(y) || 0));
        return (asc ? 1 : -1) * String(x).localeCompare(String(y));
      });
      table.querySelectorAll("th").forEach((h) => h.classList.remove("asc", "desc"));
      th.classList.add(asc ? "asc" : "desc");
      rows.forEach((row) => tbody.appendChild(row));
    });
  });
</script>
</body>
</html>
`;
}

function rowHtml(rec: SaleRecord): string {
  const cell = (v: unknown) => (v == null ? `<td class="muted">—</td>` : `<td>${esc(v)}</td>`);
  const num = (v: number | null) =>
    v == null
      ? `<td class="num muted" data-v="">—</td>`
      : `<td class="num" data-v="${v}">${Number.isInteger(v) ? v : v.toFixed(2)}</td>`;
  return (
    "      <tr>" +
    cell(rec.source) +
    cell(rec.saleDate) +
    cell(rec.title) +
    cell(rec.author) +
    cell(rec.productId) +
    cell(rec.idType) +
    cell(rec.format) +
    cell(rec.channel) +
    num(rec.unitsNet) +
    cell(rec.currency) +
    num(rec.netRevenue) +
    "</tr>"
  );
}

function card(label: string, value: string): string {
  return `<div class="cardbox"><h2>${esc(label)}</h2><div class="v">${value}</div></div>`;
}

function breakdown(o: Record<string, number>): string {
  const entries = Object.entries(o);
  if (!entries.length) return "—";
  return entries.map(([k, v]) => `${esc(k)} ${v}`).join(" · ");
}

function esc(v: unknown): string {
  return String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
