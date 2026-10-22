import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Render the real print component and CSS without automating a browser.
// Usage: node scripts/print-fixture.mjs sample|long|stale A4|Letter output.html
const [fixture, paper, output] = process.argv.slice(2);
if (!["sample", "long", "stale"].includes(fixture) || !["A4", "Letter"].includes(paper) || !output) {
  throw new Error("Expected sample|long|stale A4|Letter output.html");
}
const require = createRequire(import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), "crate-print-fixture-"));
try {
  let { outputText } = ts.transpileModule(await readFile(new URL("../app/print-manifests.tsx", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  outputText = outputText.replaceAll('"react/jsx-runtime"', JSON.stringify(pathToFileURL(require.resolve("react/jsx-runtime")).href));
  const modulePath = join(temporary, "print-manifests.mjs");
  await writeFile(modulePath, outputText);
  const { PrintManifests } = await import(pathToFileURL(modulePath).href);
  const { SAMPLE_BOOKS, SAMPLE_EVENTS } = await import("../lib/sample.ts");
  const events = structuredClone(SAMPLE_EVENTS);
  events.forEach((event) => { event.slots = fixture === "long" ? 6 : 4; });
  const books = fixture === "long" ? SAMPLE_BOOKS.map((book, index) => ({
    ...book,
    id: `${index + 1}-` + "s".repeat(77),
    title: `Élan ${index + 1}: ` + "T".repeat(230),
    author: "Zoë O’Connor, \"quoted\"\n" + "A".repeat(130),
  })) : SAMPLE_BOOKS;
  const assignments = Object.fromEntries(events.map((event, index) => [event.id, books.slice(index * event.slots, (index + 1) * event.slots).map((book) => book.id)]));
  const sourceLabel = "Sample stock; synthetic layout fixture, no Qloo call; original snapshot 2026-10-22T00:00:00.000Z";
  const html = renderToStaticMarkup(createElement(PrintManifests, { books, events, assignments, sourceLabel, ready: fixture !== "stale" }));
  const css = (await readFile(new URL("../app/globals.css", import.meta.url), "utf8")).replace(/^@import\s+"tailwindcss";\s*/m, "");
  await writeFile(output, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Crate print fixture / ${fixture} / ${paper}</title><style>${css}\n@page{size:${paper}}</style></head><body>${html}</body></html>`);
  console.log(JSON.stringify({ fixture, paper, output, assignments: fixture === "stale" ? 0 : Object.values(assignments).flat().length }));
} finally {
  if (!resolve(temporary).startsWith(resolve(tmpdir()) + sep + "crate-print-fixture-")) throw new Error("Unexpected fixture cleanup path");
  await rm(temporary, { recursive: true, force: true });
}
