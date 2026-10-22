import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const transpile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(transpile(source)).toString("base64")}`;
const csvUrl = dataUrl(await readFile(new URL("../lib/csv.ts", import.meta.url), "utf8"));
const source = (await readFile(new URL("../lib/trial.ts", import.meta.url), "utf8")).replace('from "./csv"', `from "${csvUrl}"`);
const { newTrial, newAttempt, inventoryCount, taskCase, setupIssues, repairTarget, outputFindings, completionIssues, timeDifference, trialReport, restoreTrial, MAX_TRIAL_BYTES } = await import(dataUrl(source));
const { downloadDataUrl } = await import(dataUrl(await readFile(new URL("../lib/download.ts", import.meta.url), "utf8")));
const inventory = count => "id,title,author,quantity,reserve\n" + Array.from({ length: count }, (_, index) => `b${index + 1},Title ${index + 1},Author,1,0`).join("\n");

// Synthetic test fixture only: never published as participant observations.
function ready() {
  const draft = newTrial();
  Object.assign(draft, { sessionCode: "TEST-01", consent: true, role: "bookseller", inventoryKind: "real", applicability: "hypothetical",
    order: "manual-first", orderSource: "external-or-chosen", liveEvidenceUsed: true, allMatchingTimed: true,
    ratingSource: "participant-bookseller", reviewerConfirmed: true, hardest: "Recorded test note", negative: "Recorded test limitation", confounds: "Same case reused", completionRequested: true });
  Object.assign(draft.caseA, { inventoryCsv: inventory(8), briefA: "Film programme with an actual movie interest", briefB: "Music programme with an actual artist interest", slotsA: 3, slotsB: 3, stockout: "b1 removed from A; B protected; replacement available." });
  const tasks = ["setup", "manual-plan", "manual-repair", "crate-plan", "crate-repair"];
  const times = [10_000, 60_000, 30_000, 20_000, 10_000];
  draft.attempts = tasks.map((task, index) => ({ ...newAttempt(index + 1, task, "client-timed", "2026-10-22T12:00:00.000Z"), state: "stopped", elapsedMs: times[index], stoppedAt: "2026-10-22T12:01:00.000Z", outcome: "completed",
    ...(task === "setup" ? {} : { proposed: 6, reviewed: 6, accepted: 5, constraintErrors: 0, outputA: task.endsWith("repair") ? "b2\nb3\nb7" : "b1\nb2\nb3", outputB: "b4\nb5\nb6", stockoutId: task.endsWith("repair") ? "b1" : "" }) }));
  return draft;
}

test("empty export stays a draft with unobserved values and one-session denominator", () => {
  const draft = newTrial(); draft.completionRequested = true;
  const report = trialReport(draft);
  assert.equal(report.status, "draft"); assert.equal(report.counts.attempts, 0);
  assert.equal(report.counts.sessionDenominator, 1); assert.equal(report.counts.participantsVerified, 0);
  assert.equal(report.times.crateFirstUseAllAttemptsMs, null); assert.equal(report.times.comparison.percent, null);
  assert.ok(report.completionIssues.length > 0);
});

test("a filled checklist produces only an unverified report, with raw denominators and setup in first-use time", () => {
  const draft = ready(), report = trialReport(draft);
  assert.deepEqual(completionIssues(draft), []);
  assert.equal(report.status, "complete-unverified-participant-report");
  assert.equal(report.evidence.externalVerification, "none"); assert.match(report.evidence.applicability, /exploratory/);
  assert.equal(report.times.manualCoreAllAttemptsMs, 90_000); assert.equal(report.times.crateFirstUseAllAttemptsMs, 40_000);
  assert.equal(report.ratings[0].reviewedDenominator, 6); assert.equal(report.ratings[0].accepted, 5);
  assert.equal(report.ratings[0].source, "participant-bookseller"); assert.match(report.claimBoundary, /No verified customer trial/);
  assert.deepEqual(report.raw, draft);
});

test("zero baseline, missing timing and slower performance never create misleading positive savings", () => {
  assert.deepEqual(timeDifference(0, 100), { savedMs: -100, percent: null });
  assert.deepEqual(timeDifference(null, 50), { savedMs: null, percent: null });
  assert.deepEqual(timeDifference(NaN, 50), { savedMs: null, percent: null });
  assert.deepEqual(timeDifference(100, 150), { savedMs: -50, percent: -50 });
});

test("failed time and repeated attempts remain in totals and suppress speed comparisons", () => {
  const draft = ready();
  draft.attempts.push({ ...newAttempt(6, "manual-plan", "self-reported", null), elapsedMs: 5000, outcome: "failed", notes: "No usable plan before stop." });
  const report = trialReport(draft);
  assert.equal(report.status, "complete-unverified-participant-report"); assert.equal(report.counts.failed, 1);
  assert.equal(report.times.manualCoreAllAttemptsMs, 95_000); assert.equal(report.times.comparison.percent, null);
  assert.equal(report.raw.attempts.length, 6);
});

test("invalid initial IDs cannot count as complete usable plans or eligible stock-outs", () => {
  const draft = ready(); draft.attempts[1].outputA = "a0\nb2\nb3";
  assert.ok(outputFindings(draft, draft.attempts[1]).some(value => value.includes("Unknown inventory ID")));
  assert.equal(repairTarget(draft, "manual-repair"), "b2");
  const report = trialReport(draft); assert.equal(report.status, "draft"); assert.equal(report.times.comparison.percent, null);
});

test("stock/reserve, duplicate-per-stall and reported constraint errors suppress usable speedup", () => {
  const draft = ready(); draft.attempts[1].outputB = "b1\nb4\nb5";
  assert.ok(outputFindings(draft, draft.attempts[1]).some(value => value.includes("Stock/reserve")));
  assert.equal(trialReport(draft).times.comparison.percent, null);
  const counted = ready(); counted.attempts[1].constraintErrors = 1;
  assert.equal(trialReport(counted).times.comparison.percent, null);
  const duplicate = ready(); duplicate.attempts[1].outputA = "b1\nb1\nb3";
  assert.ok(outputFindings(duplicate, duplicate.attempts[1]).some(value => value.includes("repeated")));
});

test("repair requires the predeclared actual A-only title and unchanged protected B", () => {
  const draft = ready(); assert.equal(repairTarget(draft, "manual-repair"), "b1");
  draft.attempts[2].stockoutId = "b8";
  assert.equal(trialReport(draft).times.comparison.percent, null);
  assert.ok(outputFindings(draft, draft.attempts[2]).some(value => value.includes("allocated A")));
  draft.attempts[2].stockoutId = "b1"; draft.attempts[2].outputB = "b4\nb5\nb8";
  assert.ok(outputFindings(draft, draft.attempts[2]).some(value => value.includes("Protected B changed")));
});

test("a zero-work repair is not completed and a real N/A can be reported without invented success", () => {
  const draft = ready(); draft.attempts[2].outputA = "b1\nb2\nb3";
  assert.ok(outputFindings(draft, draft.attempts[2]).some(value => value.includes("removed title remains")));
  assert.equal(trialReport(draft).status, "draft");
  draft.attempts[2].outcome = "abandoned"; draft.attempts[2].notes = "No feasible replacement; N/A.";
  assert.equal(trialReport(draft).status, "complete-unverified-participant-report");
  assert.equal(trialReport(draft).times.comparison.percent, null);
});

test("practice, unconfirmed live mode, unreviewed mappings and no real reviewer remain drafts", () => {
  for (const patch of [{ inventoryKind: "practice" }, { liveEvidenceUsed: false }, { allMatchingTimed: false }, { reviewerConfirmed: false }, { ratingSource: "not-rated" }]) {
    const draft = Object.assign(ready(), patch), report = trialReport(draft);
    assert.equal(report.status, "draft"); assert.equal(report.times.comparison.percent, null);
  }
});

test("comparable cases use the Crate-assigned setup case and incompatible workloads suppress comparison", () => {
  const draft = ready(); draft.design = "comparable-cases"; draft.manualCase = "a"; draft.caseB = structuredClone(draft.caseA); draft.caseB.briefA = "Different cultural input";
  draft.allocationNotes = "Case 1 manual; case 2 Crate; assignment made before work.";
  assert.equal(taskCase(draft, "setup"), draft.caseB); assert.equal(taskCase(draft, "manual-plan"), draft.caseA);
  assert.equal(taskCase(draft, "crate-plan"), draft.caseB);
  draft.caseB.slotsA = 4;
  assert.ok(setupIssues(draft).some(value => value.includes("same total slot")));
  assert.equal(trialReport(draft).times.comparison.percent, null);
});

test("acceptance counts cannot exceed the actual reviewed/proposed denominator", () => {
  const draft = ready(); draft.attempts[1].accepted = 7;
  assert.equal(trialReport(draft).status, "draft"); assert.equal(trialReport(draft).ratings[0].acceptanceShare, null);
  draft.attempts[1].accepted = 0; draft.attempts[1].reviewed = 0;
  assert.equal(trialReport(draft).ratings[0].acceptanceShare, null);
});

test("running and unobserved attempts remain explicitly incomplete", () => {
  const draft = ready(); draft.attempts[0].state = "running";
  assert.equal(trialReport(draft).counts.incomplete, 1); assert.equal(trialReport(draft).times.comparison.percent, null);
  draft.attempts[0].state = "stopped"; draft.attempts[0].timing = "unobserved";
  assert.equal(trialReport(draft).times.setupAndAllMatchingMs, null);
});

test("local restoration never resumes a running timer or preserves a completion attestation", () => {
  const draft = ready(); draft.attempts[0].state = "running";
  const restored = restoreTrial(JSON.stringify(draft));
  assert.equal(restored.completionRequested, false); assert.equal(restored.attempts[0].state, "interrupted");
  assert.equal(restored.attempts[0].outcome, "abandoned"); assert.match(restored.attempts[0].notes, /incomplete/);
  assert.equal(trialReport(restored).status, "draft");
});

test("malformed, oversized, duplicated or nonfinite stored records fail closed", () => {
  assert.throws(() => restoreTrial("not json")); assert.throws(() => restoreTrial("x".repeat(MAX_TRIAL_BYTES + 1)), /too large/);
  for (const mutate of [draft => { draft.caseA.briefA = "x".repeat(601); }, draft => { draft.attempts[0].elapsedMs = -1; }, draft => { draft.attempts.push(draft.attempts[0]); }, draft => { draft.caseA.slotsA = 99; }]) {
    const draft = ready(); mutate(draft); assert.throws(() => restoreTrial(JSON.stringify(draft)), /invalid/);
  }
});

test("the real inventory parser enforces the 8–18 workload and bounded CSV", () => {
  assert.equal(inventoryCount(inventory(8)).error, null); assert.equal(inventoryCount(inventory(18)).count, 18);
  assert.ok(inventoryCount(inventory(7)).error); assert.ok(inventoryCount(inventory(19)).error);
  assert.ok(inventoryCount("x".repeat(16_001)).error);
});

test("downloaded JSON preserves Unicode, status, failures, sources and raw observations without BOM", () => {
  const draft = ready(); draft.negative = "東京 — Amélie: not appropriate for this crowd.";
  const report = trialReport(draft), url = downloadDataUrl(JSON.stringify(report, null, 2), "json");
  const bytes = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
  assert.notDeepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const decoded = JSON.parse(bytes.toString("utf8")); assert.deepEqual(decoded, report);
  assert.equal(decoded.raw.negative, draft.negative); assert.equal(decoded.evidence.externalVerification, "none");
});
