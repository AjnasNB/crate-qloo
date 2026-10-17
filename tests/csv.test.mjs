import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/csv.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { parseInventoryCsv, inventoryCsv, packingCsv } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const book = (overrides = {}) => ({ id: "local-1", title: "A Book", author: "An Author", quantity: 2, reserve: 0, ageDays: 32, price: 17.5, color: "#de7754", ...overrides });
const stalls = [{ id: "a", name: "First Stall", slots: 4, anchors: [] }, { id: "b", name: "Second Stall", slots: 4, anchors: [] }];

test("imports a minimal inventory with local IDs and safe optional defaults", () => {
  const result = parseInventoryCsv("title,author,quantity\nKindred,Octavia E. Butler,2\nPiranesi,Susanna Clarke,1\n");
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(({ id, quantity, reserve, ageDays, price }) => ({ id, quantity, reserve, ageDays, price })), [
    { id: "import-1", quantity: 2, reserve: 0, ageDays: 0, price: 0 },
    { id: "import-2", quantity: 1, reserve: 0, ageDays: 0, price: 0 },
  ]);
});

test("reads BOM, quoted commas, embedded newlines, CRLF, and escaped quotes", () => {
  const result = parseInventoryCsv('\uFEFFtitle,author,quantity,reserve,ageDays,price\r\n"A Book, Volume 1\nSecond line","A. ""Quoted"" Author",3,1,125,12.50\r\n');
  assert.equal(result[0].title, "A Book, Volume 1\nSecond line");
  assert.equal(result[0].author, 'A. "Quoted" Author');
  assert.equal(result[0].reserve, 1);
  assert.equal(result[0].ageDays, 125);
  assert.equal(result[0].price, 12.5);
});

test("round-trips a full inventory without losing local quantities, IDs, or colors", () => {
  const original = [book({ title: 'A Book, with "quotes"', author: "First\nLast" }), book({ id: "local-2", reserve: 1, price: 0, color: "#AABBCC" })];
  assert.deepEqual(parseInventoryCsv(inventoryCsv(original)), original);
});

test("rejects ambiguous schemas, empty required fields, and malformed CSV", () => {
  for (const csv of [
    "",
    "title,author\nA,B\n",
    "title,author,quantity,quantity\nA,B,1,1\n",
    "title,author,qty\nA,B,1\n",
    "title,author,quantity\n,B,1\n",
    "title,author,quantity\nA,,1\n",
    'title,author,quantity\n"A,B,1',
    'title,author,quantity\n"A"extra,B,1',
    'title,author,quantity\nA"bad,B,1',
    "title,author,quantity\nA,B,1,extra",
  ]) assert.throws(() => parseInventoryCsv(csv), Error, csv);
});

test("rejects negative, nonfinite, exponential, fractional, and out-of-range numbers", () => {
  for (const [quantity, reserve, age, price] of [
    ["-1", "0", "0", "1"], ["1.5", "0", "0", "1"], ["1e1", "0", "0", "1"],
    ["100", "0", "0", "1"], ["NaN", "0", "0", "1"], ["2", "3", "0", "1"],
    ["2", "0", "36501", "1"], ["2", "0", "0", "-1"], ["2", "0", "0", "12.345"],
    ["2", "0", "0", "Infinity"], ["2", "0", "0", "10001"], ["", "0", "0", "1"],
  ]) assert.throws(() => parseInventoryCsv(`title,author,quantity,reserve,ageDays,price\nA,B,${quantity},${reserve},${age},${price}`));
});

test("accepts zero stock and full shop reserves without inventing availability", () => {
  const result = parseInventoryCsv("title,author,quantity,reserve\nA,B,0,0\nC,D,2,2");
  assert.equal(result[0].quantity, 0);
  assert.equal(result[1].quantity - result[1].reserve, 0);
});

test("rejects blank or duplicate supplied IDs and unsafe colors", () => {
  assert.throws(() => parseInventoryCsv("id,title,author,quantity\n,A,B,1"), /id cannot be blank/);
  assert.throws(() => parseInventoryCsv("id,title,author,quantity\nx,A,B,1\nx,C,D,1"), /duplicate id/);
  assert.throws(() => parseInventoryCsv("title,author,quantity,color\nA,B,1,url(bad)"), /hex color/);
});

test("accepts 18 titles and rejects the 19th", () => {
  const header = "title,author,quantity\n";
  const rows = Array.from({ length: 19 }, (_, i) => `Title ${i},Author,1`);
  assert.equal(parseInventoryCsv(header + rows.slice(0, 18).join("\n")).length, 18);
  assert.throws(() => parseInventoryCsv(header + rows.join("\n")), /at most 18/);
});

test("inventory exports neutralize direct and whitespace-prefixed spreadsheet formulas", () => {
  for (const value of ["=1+1", "+cmd", "-1+2", "@SUM(A1)", "  =SUM(A1)", "\t=cmd", "\r=cmd"]) {
    const exported = inventoryCsv([book({ title: value })]);
    assert.ok(exported.includes(`"'${value}"`), `unsafe formula prefix: ${JSON.stringify(value)}`);
  }
});

test("packing export counts copies across stalls and labels evidence provenance", () => {
  const csv = packingCsv([book({ quantity: 3, reserve: 1 })], stalls, { a: ["local-1"], b: ["local-1"] }, "Simulation — synthetic ranks");
  assert.equal(csv.split("Simulation — synthetic ranks").length - 1, 2);
  assert.ok(csv.includes('"First Stall","local-1","A Book","An Author","1","17.50","17.50"'));
  assert.ok(csv.includes('"Second Stall"'));
  assert.ok(packingCsv([book()], stalls, { a: ["local-1", "local-1"] }, "Simulation").includes('"2","17.50","35.00"'));
});

test("packing export refuses missing provenance, unknown IDs/stalls, and over-allocation", () => {
  assert.throws(() => packingCsv([book()], stalls, {}, ""), /source label/);
  assert.throws(() => packingCsv([book()], stalls, { a: ["unknown"] }, "Simulation"), /Unknown stock id/);
  assert.throws(() => packingCsv([book()], stalls, { z: ["local-1"] }, "Simulation"), /Unknown stall/);
  assert.throws(() => packingCsv([book({ quantity: 1 })], stalls, { a: ["local-1"], b: ["local-1"] }, "Simulation"), /over-allocates/);
  assert.throws(() => packingCsv([book({ quantity: 2, reserve: 2 })], stalls, { a: ["local-1"] }, "Simulation"), /over-allocates/);
});

test("packing exports escape hostile labels and retain provenance for an empty plan", () => {
  const hostile = packingCsv([book({ title: "=IMPORTXML()" })], [{ ...stalls[0], name: "@formula" }], { a: ["local-1"] }, "  =source");
  assert.ok(hostile.includes('"\'  =source"'));
  assert.ok(hostile.includes('"\'@formula"'));
  assert.ok(hostile.includes('"\'=IMPORTXML()"'));
  const empty = packingCsv([book()], stalls, {}, "Simulation only");
  assert.ok(empty.includes("Simulation only"));
  assert.ok(empty.includes("No books assigned"));
});
