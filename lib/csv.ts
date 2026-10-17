import type { Book, Stall } from "./planner";

const COLORS = ["#de7754", "#788368", "#d3b766", "#817394", "#6c8990", "#bc727d"];
const FIELDS = new Set(["id", "title", "author", "quantity", "reserve", "agedays", "price", "color"]);

/** Read CSV without splitting quoted commas, escaped quotes, or embedded newlines. */
function rowsOf(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  const finishCell = () => { row.push(cell); cell = ""; closed = false; };
  const finishRow = () => { finishCell(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
      continue;
    }
    if (char === ",") { finishCell(); continue; }
    if (char === "\r" || char === "\n") {
      finishRow();
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      continue;
    }
    if (closed) throw new Error(`Unexpected text after a closing quote near CSV row ${rows.length + 1}.`);
    if (char === '"') {
      if (cell.length) throw new Error(`A quote must start a field near CSV row ${rows.length + 1}.`);
      quoted = true;
    } else cell += char;
  }
  if (quoted) throw new Error("A quoted CSV field was not closed.");
  if (cell.length || row.length || closed) finishRow();
  return rows;
}

function whole(value: string, field: string, row: number, maximum: number, optional = false): number {
  if (!value && optional) return 0;
  if (!/^\d+$/.test(value)) throw new Error(`Row ${row}: ${field} must be a whole number.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > maximum) {
    throw new Error(`Row ${row}: ${field} must be between 0 and ${maximum}.`);
  }
  return number;
}

/** Import up to 18 local stock records. No Qloo identity or affinity is inferred. */
export function parseInventoryCsv(text: string): Book[] {
  if (text.length > 131_072) throw new Error("The inventory CSV must be smaller than 128 KB.");
  const rows = rowsOf(text.replace(/^\uFEFF/, ""));
  while (rows.length && rows[0].every((cell) => !cell.trim())) rows.shift();
  if (!rows.length) throw new Error("The CSV is empty. Include title, author, and quantity headers.");
  const headers = rows.shift()!.map((cell) => cell.trim().toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error("CSV column headers must be unique.");
  for (const header of headers) {
    if (!FIELDS.has(header)) throw new Error(`Unknown CSV column: ${header || "(blank)"}.`);
  }
  for (const required of ["title", "author", "quantity"]) {
    if (!headers.includes(required)) throw new Error(`Missing required CSV column: ${required}.`);
  }

  const books: Book[] = [];
  const ids = new Set<string>();
  for (const [index, cells] of rows.entries()) {
    if (cells.every((cell) => !cell.trim())) continue;
    const rowNumber = index + 2;
    if (cells.length !== headers.length) throw new Error(`Row ${rowNumber}: expected ${headers.length} columns, found ${cells.length}.`);
    if (books.length === 18) throw new Error("Crate accepts at most 18 inventory titles per plan.");
    const record = Object.fromEntries(headers.map((header, column) => [header, cells[column].trim()]));
    const id = headers.includes("id") ? record.id : `import-${books.length + 1}`;
    if (!id) throw new Error(`Row ${rowNumber}: id cannot be blank when the id column is supplied.`);
    if (id.length > 80) throw new Error(`Row ${rowNumber}: id must be 80 characters or fewer.`);
    if (/[\u0000-\u001f\u007f]/.test(id)) throw new Error(`Row ${rowNumber}: id cannot contain control characters.`);
    if (ids.has(id)) throw new Error(`Row ${rowNumber}: duplicate id ${id}. Use a unique local SKU for each row.`);
    ids.add(id);
    if (!record.title || record.title.length > 240) throw new Error(`Row ${rowNumber}: title is required and must be 240 characters or fewer.`);
    if (!record.author || record.author.length > 160) throw new Error(`Row ${rowNumber}: author is required and must be 160 characters or fewer.`);
    const quantity = whole(record.quantity, "quantity", rowNumber, 99);
    const reserve = whole(record.reserve ?? "", "reserve", rowNumber, 99, true);
    if (reserve > quantity) throw new Error(`Row ${rowNumber}: reserve cannot exceed quantity.`);
    const ageDays = whole(record.agedays ?? "", "ageDays", rowNumber, 36_500, true);
    const priceText = record.price ?? "";
    if (priceText && !/^\d+(?:\.\d{1,2})?$/.test(priceText)) throw new Error(`Row ${rowNumber}: price must be a nonnegative amount with at most two decimal places.`);
    const price = Number(priceText || "0");
    if (!Number.isFinite(price) || price > 10_000) throw new Error(`Row ${rowNumber}: price must be between 0 and 10000.`);
    const color = record.color || COLORS[books.length % COLORS.length];
    if (!/^#[\da-f]{6}$/i.test(color)) throw new Error(`Row ${rowNumber}: color must be a six-digit hex color such as #de7754.`);
    books.push({ id, title: record.title, author: record.author, quantity, reserve, ageDays, price, color });
  }
  if (!books.length) throw new Error("The CSV contains headers but no inventory titles.");
  return books;
}

/** Quote every cell and neutralize spreadsheet formula prefixes, including after whitespace. */
function csvCell(value: string | number): string {
  let safe = String(value);
  if (/^[\s\uFEFF]*[=+\-@]/.test(safe) || /^[\t\r\n]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvRows(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function inventoryCsv(books: Book[]): string {
  return csvRows([
    ["id", "title", "author", "quantity", "reserve", "ageDays", "price", "color"],
    ...books.map((book) => [book.id, book.title, book.author, book.quantity, book.reserve, book.ageDays, book.price.toFixed(2), book.color]),
  ]);
}

/** Export local stock quantities with the evidence source on every manifest row. */
export function packingCsv(
  books: Book[],
  events: Stall[],
  assignments: Record<string, string[]>,
  sourceLabel: string,
): string {
  if (!sourceLabel.trim()) throw new Error("A manifest needs an evidence source label.");
  const byId = new Map(books.map((book) => [book.id, book]));
  const stallIds = new Set(events.map((event) => event.id));
  const totals = new Map<string, number>();
  const output: (string | number)[][] = [["source", "stall", "sku", "title", "author", "copies", "unit_price", "line_total"]];
  for (const stallId of Object.keys(assignments)) {
    if (!stallIds.has(stallId)) throw new Error(`Unknown stall in packing plan: ${stallId}.`);
  }
  for (const event of events) {
    const quantities = new Map<string, number>();
    for (const id of assignments[event.id] ?? []) {
      if (!byId.has(id)) throw new Error(`Unknown stock id in packing plan: ${id}.`);
      quantities.set(id, (quantities.get(id) ?? 0) + 1);
      totals.set(id, (totals.get(id) ?? 0) + 1);
    }
    for (const [id, copies] of quantities) {
      const book = byId.get(id)!;
      output.push([sourceLabel, event.name, book.id, book.title, book.author, copies, book.price.toFixed(2), (book.price * copies).toFixed(2)]);
    }
  }
  for (const [id, copies] of totals) {
    const book = byId.get(id)!;
    if (copies > book.quantity - book.reserve) throw new Error(`Packing plan over-allocates ${book.title}; review stock and shop reserves.`);
  }
  if (output.length === 1) output.push([sourceLabel, "No books assigned", "", "", "", 0, "", ""]);
  return csvRows(output);
}
