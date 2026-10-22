import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const moduleSource = await readFile(new URL("../lib/download.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(moduleSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { downloadDataUrl, MAX_DOWNLOAD_BYTES } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const decode = (url) => Buffer.from(url.slice(url.indexOf(",") + 1), "base64");

test("CSV data URL has one UTF-8 BOM and preserves Unicode and quoting", () => {
  const csv = '\"title\",\"author\"\r\n\"Amélie, 東京 — \"\"L’été\"\"\",\"Zoë O’Connor\"\r\n';
  const url = downloadDataUrl(csv, "csv");
  assert.ok(url.startsWith("data:text/csv;charset=utf-8;base64,"));
  const bytes = decode(url);
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal(bytes.subarray(3).toString("utf8"), csv);
  assert.equal(bytes.length, Buffer.byteLength(csv, "utf8") + 3);
  assert.deepEqual(decode(downloadDataUrl(`\uFEFF\uFEFF${csv}`, "csv")), bytes);
});

test("JSON data URL preserves original bytes without adding a BOM", () => {
  const text = JSON.stringify({ mode: "qloo", title: "Amélie 東京", profiles: { a: { orderedIds: ["isbn-1"] } } }, null, 2);
  const url = downloadDataUrl(text, "json");
  assert.ok(url.startsWith("data:application/json;charset=utf-8;base64,"));
  const bytes = decode(url);
  assert.deepEqual(bytes, Buffer.from(text, "utf8"));
  assert.deepEqual(JSON.parse(bytes.toString("utf8")), JSON.parse(text));
});

test("18 maximum-length inventory records survive chunked UTF-8 encoding", () => {
  const title = "界".repeat(240), author = "é".repeat(160), id = "s".repeat(80);
  const csv = '\"id\",\"title\",\"author\",\"quantity\"\r\n' + Array.from({ length: 18 }, (_, i) => `\"${id.slice(2)}${i.toString().padStart(2, "0")}\",\"${title}\",\"${author}\",\"99\"`).join("\r\n") + "\r\n";
  const bytes = decode(downloadDataUrl(csv, "csv"));
  assert.equal(bytes.subarray(3).toString("utf8"), csv);
  assert.equal(bytes.length, Buffer.byteLength(csv) + 3);
});

test("missing and oversized content has no download URL; bounds count UTF-8 bytes", () => {
  assert.equal(downloadDataUrl(null, "csv"), undefined);
  assert.equal(downloadDataUrl(null, "json"), undefined);
  assert.equal(downloadDataUrl("x".repeat(MAX_DOWNLOAD_BYTES + 1), "json"), undefined);
  assert.equal(downloadDataUrl("界".repeat(MAX_DOWNLOAD_BYTES / 2), "json"), undefined);
  assert.equal(decode(downloadDataUrl("x".repeat(MAX_DOWNLOAD_BYTES), "json")).length, MAX_DOWNLOAD_BYTES);
  assert.equal(downloadDataUrl("x".repeat(MAX_DOWNLOAD_BYTES), "csv"), undefined);
});

test("unpaired surrogates encode safely without URI errors", () => {
  const text = "prefix\uD800suffix";
  const bytes = decode(downloadDataUrl(text, "json"));
  assert.deepEqual(bytes, Buffer.from(new TextEncoder().encode(text)));
  assert.equal(bytes.toString("utf8"), "prefix�suffix");
});
