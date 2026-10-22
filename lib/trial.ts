import { parseInventoryCsv } from "./csv";

export const TRIAL_STORAGE_KEY = "crate-bookseller-trial-v1";
export const MAX_TRIAL_BYTES = 100_000;
export const MAX_ATTEMPTS = 24;
export type Task = "setup" | "manual-plan" | "crate-plan" | "manual-repair" | "crate-repair";
export const TASKS: Task[] = ["setup", "manual-plan", "crate-plan", "manual-repair", "crate-repair"];
export type TrialCase = { inventoryCsv: string; briefA: string; briefB: string; slotsA: number; slotsB: number; stockout: string };
export type Attempt = {
  id: number; task: Task; state: "running" | "stopped" | "interrupted";
  timing: "client-timed" | "self-reported" | "unobserved";
  elapsedMs: number | null; startedAt: string | null; stoppedAt: string | null;
  outcome: "not-recorded" | "completed" | "failed" | "abandoned";
  proposed: number | null; reviewed: number | null; accepted: number | null;
  constraintErrors: number | null; outputA: string; outputB: string; stockoutId: string; notes: string;
};
export type TrialDraft = {
  version: 1; sessionCode: string; consent: boolean; role: "" | "bookseller" | "bookshop-staff" | "other";
  inventoryKind: "" | "real" | "practice"; applicability: "" | "upcoming-event" | "past-event" | "hypothetical";
  design: "same-case" | "comparable-cases"; order: "" | "manual-first" | "crate-first";
  orderSource: "unassigned" | "browser-random" | "external-or-chosen";
  manualCase: "a" | "b"; allocationNotes: string; caseA: TrialCase; caseB: TrialCase;
  attempts: Attempt[]; liveEvidenceUsed: boolean; allMatchingTimed: boolean;
  ratingSource: "not-rated" | "participant-bookseller" | "second-bookseller";
  reviewerConfirmed: boolean; hardest: string; negative: string; confounds: string;
  completionRequested: boolean;
};

const blankCase = (): TrialCase => ({ inventoryCsv: "", briefA: "", briefB: "", slotsA: 4, slotsB: 4, stockout: "" });
export function newTrial(): TrialDraft {
  return { version: 1, sessionCode: "", consent: false, role: "", inventoryKind: "", applicability: "",
    design: "same-case", order: "", orderSource: "unassigned", manualCase: "a", allocationNotes: "",
    caseA: blankCase(), caseB: blankCase(), attempts: [], liveEvidenceUsed: false, allMatchingTimed: false,
    ratingSource: "not-rated", reviewerConfirmed: false, hardest: "", negative: "", confounds: "", completionRequested: false };
}

export function inventoryCount(value: string): { count: number | null; error: string | null } {
  if (!value.trim()) return { count: null, error: "Paste the inventory CSV for this case." };
  if (value.length > 16_000) return { count: null, error: "Keep each inventory CSV within 16,000 characters." };
  try {
    const books = parseInventoryCsv(value);
    if (books.length < 8) return { count: books.length, error: "Use 8–18 distinct titles for the trial." };
    return { count: books.length, error: null };
  } catch (error) { return { count: null, error: error instanceof Error ? error.message : "Check the CSV." }; }
}

export function taskCase(draft: TrialDraft, task: Task): TrialCase {
  if (draft.design === "same-case") return draft.caseA;
  const manual = task.startsWith("manual-");
  return (manual ? draft.manualCase === "a" : draft.manualCase !== "a") ? draft.caseA : draft.caseB;
}

export function sessionIssues(draft: TrialDraft): string[] {
  const issues: string[] = [];
  if (!draft.consent) issues.push("Confirm voluntary adult participation before timing.");
  if (!/^[a-z0-9-]{3,32}$/i.test(draft.sessionCode)) issues.push("Use an anonymous 3–32 character session code: letters, numbers or hyphens.");
  if (!draft.role) issues.push("Record your role.");
  if (!draft.inventoryKind || !draft.applicability) issues.push("Identify real/practice stock and event applicability.");
  if (!draft.order || draft.orderSource === "unassigned") issues.push("Assign and record the method order.");
  return issues;
}

export function setupIssues(draft: TrialDraft): string[] {
  const issues = sessionIssues(draft);
  const cases = draft.design === "same-case" ? [draft.caseA] : [draft.caseA, draft.caseB];
  for (const [index, item] of cases.entries()) {
    const result = inventoryCount(item.inventoryCsv);
    if (result.error) issues.push(`Case ${index + 1}: ${result.error}`);
    if (!item.briefA.trim() || !item.briefB.trim()) issues.push(`Case ${index + 1}: describe both cultural programmes and their artist/movie interests.`);
    if (![item.slotsA, item.slotsB].every(value => Number.isInteger(value) && value >= 3 && value <= 6)) issues.push(`Case ${index + 1}: each stall needs 3–6 title slots.`);
  }
  if (draft.design === "comparable-cases" && (!draft.allocationNotes.trim() || draft.caseA.slotsA + draft.caseA.slotsB !== draft.caseB.slotsA + draft.caseB.slotsB)) {
    issues.push("Comparable cases need allocation notes and the same total slot workload.");
  }
  return issues;
}

export function newAttempt(id: number, task: Task, timing: Attempt["timing"], now: string | null): Attempt {
  return { id, task, state: timing === "client-timed" ? "running" : "stopped", timing,
    elapsedMs: timing === "client-timed" ? 0 : null, startedAt: now, stoppedAt: null,
    outcome: "not-recorded", proposed: null, reviewed: null, accepted: null, constraintErrors: null, outputA: "", outputB: "", stockoutId: "", notes: "" };
}

const outputIds = (text: string) => text.split(/\r?\n/).map(id => id.trim()).filter(Boolean);
export function repairTarget(draft: TrialDraft, task: Task): string | null {
  const planTask = task === "manual-repair" ? "manual-plan" : "crate-plan";
  const before = draft.attempts.filter(value => value.task === planTask && value.outcome === "completed").at(-1);
  if (!before) return null;
  const b = outputIds(before.outputB);
  let eligible: Set<string>;
  try { eligible = new Set(parseInventoryCsv(taskCase(draft, task).inventoryCsv).filter(book => book.quantity > book.reserve).map(book => book.id)); }
  catch { return null; }
  return outputIds(before.outputA).filter(id => eligible.has(id) && !b.includes(id)).sort()[0] ?? null;
}
/** Checks only user-supplied IDs/stock, not whether the real task was observed. */
export function outputFindings(draft: TrialDraft, attempt: Attempt): string[] {
  if (attempt.task === "setup" || attempt.outcome !== "completed") return [];
  const item = taskCase(draft, attempt.task), findings: string[] = [];
  let inventory;
  try { inventory = parseInventoryCsv(item.inventoryCsv); } catch { return ["Inventory cannot be checked."]; }
  const a = outputIds(attempt.outputA), b = outputIds(attempt.outputB), all = [...a, ...b];
  if (a.length !== item.slotsA || b.length !== item.slotsB) findings.push("Output IDs do not fill the configured slots.");
  if (new Set(a).size !== a.length || new Set(b).size !== b.length) findings.push("A title is repeated within a stall.");
  const repair = attempt.task.endsWith("repair");
  for (const id of new Set(all)) {
    const book = inventory.find(book => book.id === id);
    if (!book) findings.push(`Unknown inventory ID: ${id}.`);
    else if (all.filter(value => value === id).length > (repair && id === attempt.stockoutId ? 0 : book.quantity - book.reserve)) findings.push(`Stock/reserve exceeded for ${id}.`);
  }
  if (repair) {
    const planTask = attempt.task === "manual-repair" ? "manual-plan" : "crate-plan";
    const before = draft.attempts.filter(value => value.task === planTask && value.outcome === "completed").at(-1);
    if (!before) findings.push("A completed initial plan is needed to check repair.");
    else {
      const beforeA = outputIds(before.outputA), beforeB = outputIds(before.outputB);
      if (!attempt.stockoutId || !beforeA.includes(attempt.stockoutId) || beforeB.includes(attempt.stockoutId)) findings.push("The stock-out must remove an allocated A title, with no copy of that title in protected B.");
      if (!repairTarget(draft, attempt.task) || attempt.stockoutId !== repairTarget(draft, attempt.task)) findings.push("Use the predeclared first A-only ID in ascending ID order; if none exists, record N/A/failure.");
      if (a.includes(attempt.stockoutId)) findings.push("The removed title remains in repaired A.");
      if (beforeB.length !== b.length || beforeB.some(id => !b.includes(id))) findings.push("Protected B changed during repair.");
    }
  }
  return findings;
}

/** A zero or absent baseline never yields a percentage. Negative savings are retained. */
export function timeDifference(manualMs: number | null, crateMs: number | null) {
  if (manualMs === null || crateMs === null || !Number.isFinite(manualMs) || !Number.isFinite(crateMs) || manualMs < 0 || crateMs < 0) return { savedMs: null, percent: null };
  return { savedMs: manualMs - crateMs, percent: manualMs > 0 ? (manualMs - crateMs) / manualMs * 100 : null };
}

export function attemptIssues(draft: TrialDraft, attempt: Attempt): string[] {
  const issues: string[] = [], label = `${attempt.task} attempt ${attempt.id}`;
  if (attempt.state !== "stopped") issues.push(`${label}: timer is running or interrupted.`);
  if (attempt.elapsedMs === null || !Number.isFinite(attempt.elapsedMs) || attempt.elapsedMs < 0 || attempt.elapsedMs > 86_400_000 || attempt.timing === "unobserved") issues.push(`${label}: record elapsed time, including failed time.`);
  if (attempt.outcome === "not-recorded") issues.push(`${label}: record completed, failed or abandoned.`);
  if (attempt.outcome === "failed" || attempt.outcome === "abandoned") {
    if (!attempt.notes.trim()) issues.push(`${label}: explain the failure or interruption.`);
  }
  if (attempt.task !== "setup" && attempt.outcome === "completed") {
    const item = taskCase(draft, attempt.task), slots = item.slotsA + item.slotsB;
    if (attempt.proposed !== slots) issues.push(`${label}: record all ${slots} proposed title/stall placements.`);
    if (attempt.reviewed !== attempt.proposed || attempt.reviewed === null) issues.push(`${label}: review each proposed placement or record the run as incomplete.`);
    if (!attempt.outputA.trim() || !attempt.outputB.trim()) issues.push(`${label}: record the title IDs in each stall.`);
    if (attempt.constraintErrors === null) issues.push(`${label}: record the number of constraint errors, including zero.`);
    if (attempt.accepted === null) issues.push(`${label}: record the bookseller-accepted count, including zero.`);
  }
  if (attempt.task !== "setup" && attempt.outcome === "completed") issues.push(...outputFindings(draft, attempt).map(issue => `${label}: ${issue}`));
  const values = [attempt.proposed, attempt.reviewed, attempt.accepted];
  if (values.some(value => value !== null && (!Number.isInteger(value) || value < 0 || value > 12))) issues.push(`${label}: placement counts must be whole numbers from 0 to 12.`);
  if (attempt.reviewed !== null && (attempt.proposed === null || attempt.reviewed > attempt.proposed)) issues.push(`${label}: reviewed cannot exceed proposed.`);
  if (attempt.accepted !== null && (attempt.reviewed === null || attempt.accepted > attempt.reviewed)) issues.push(`${label}: accepted cannot exceed reviewed.`);
  if (attempt.constraintErrors !== null && (!Number.isInteger(attempt.constraintErrors) || attempt.constraintErrors < 0 || attempt.constraintErrors > 99)) issues.push(`${label}: constraint errors must be between 0 and 99.`);
  return issues;
}

export function completionIssues(draft: TrialDraft): string[] {
  const issues = setupIssues(draft);
  if (draft.inventoryKind !== "real") issues.push("Practice stays a practice draft, separate from a real-stock participant report.");
  if (!["bookseller", "bookshop-staff"].includes(draft.role)) issues.push("A real bookseller or bookshop staff member must perform the session.");
  if (!draft.liveEvidenceUsed) issues.push("Confirm actual live Qloo use; simulation is not live evidence.");
  if (!draft.allMatchingTimed) issues.push("Confirm all title/anchor review and matching was included in setup time.");
  if (!draft.reviewerConfirmed || draft.ratingSource === "not-rated") issues.push("An actual bookseller must review the outputs; identify self-review versus a second bookseller.");
  if (!draft.hardest.trim() || !draft.negative.trim() || !draft.confounds.trim()) issues.push("Record the hardest part, negative feedback and learning/interruptions (or explicitly none).");
  for (const [index, item] of (draft.design === "same-case" ? [draft.caseA] : [draft.caseA, draft.caseB]).entries()) {
    if (!item.stockout.trim()) issues.push(`Case ${index + 1}: record repair applicability/feasibility, including N/A or failure.`);
  }
  for (const task of TASKS) if (!draft.attempts.some(attempt => attempt.task === task)) issues.push(`Record a ${task} attempt; failures count and must not be omitted.`);
  for (const attempt of draft.attempts) issues.push(...attemptIssues(draft, attempt));
  return issues;
}

export function trialReport(draft: TrialDraft) {
  const firstMethodTask = draft.attempts.find(attempt => attempt.task.startsWith("manual-") || attempt.task.startsWith("crate-"));
  const actualFirstMethod = firstMethodTask ? firstMethodTask.task.startsWith("manual-") ? "manual-first" : "crate-first" : null;
  const setupIndex = draft.attempts.findIndex(attempt => attempt.task === "setup");
  const firstManualIndex = draft.attempts.findIndex(attempt => attempt.task.startsWith("manual-"));
  const observed = (tasks: Task[]) => {
    const attempts = draft.attempts.filter(attempt => tasks.includes(attempt.task));
    return attempts.length && attempts.every(attempt => attempt.elapsedMs !== null && attempt.timing !== "unobserved")
      ? attempts.reduce((sum, attempt) => sum + attempt.elapsedMs!, 0) : null;
  };
  const setupMs = observed(["setup"]), manualMs = observed(["manual-plan", "manual-repair"]), crateMs = observed(["crate-plan", "crate-repair"]);
  const issues = completionIssues(draft);
  const allSuccessful = issues.length === 0 && TASKS.every(task => draft.attempts.some(attempt => attempt.task === task && attempt.outcome === "completed"))
    && draft.attempts.every(attempt => attempt.state === "stopped" && attempt.outcome === "completed" && attemptIssues(draft, attempt).length === 0
      && (attempt.task === "setup" || attempt.constraintErrors === 0 && outputFindings(draft, attempt).length === 0));
  const firstUseMs = setupMs !== null && crateMs !== null ? setupMs + crateMs : null;
  return {
    schema: "crate.bookseller-trial.v1", status: draft.completionRequested && !issues.length ? "complete-unverified-participant-report" : "draft",
    evidence: { externalVerification: "none", timing: "Client-timed and/or self-reported; browser clocks and manual entries are not independently verified.",
      ratings: draft.ratingSource, applicability: draft.inventoryKind === "practice" ? "practice only" : draft.applicability === "hypothetical" ? "exploratory usability with real stock and hypothetical events" : "participant-reported real-stock task; not sales validation",
      learningConfound: draft.design === "same-case" ? "Same case repeated; learning/order contamination is expected." : "Comparable cases are participant-selected; allocation and comparability are unverified." },
    protocol: { repairSelection: "For each method/case: first initially allocated A-only ID in ascending ID order. Set its available stock to zero; protect all B placements. No eligible ID or no feasible replacement is N/A/failure, not a zero-work success.", hardStopMinutes: 45,
      actualTaskSequence: draft.attempts.map(attempt => attempt.task), actualFirstMethod,
      assignedOrderMismatch: actualFirstMethod !== null && actualFirstMethod !== draft.order,
      possibleSetupExposureBeforeManual: setupIndex >= 0 && firstManualIndex >= 0 && setupIndex < firstManualIndex,
      recordedTimeOver45Minutes: draft.attempts.reduce((sum, attempt) => sum + (attempt.elapsedMs ?? 0), 0) > 45 * 60 * 1000 },
    counts: { sessionDenominator: 1, participantsVerified: 0, attempts: draft.attempts.length,
      failed: draft.attempts.filter(attempt => attempt.outcome === "failed").length,
      abandoned: draft.attempts.filter(attempt => attempt.outcome === "abandoned").length,
      incomplete: draft.attempts.filter(attempt => attempt.state !== "stopped" || attempt.outcome === "not-recorded").length },
    times: { setupAndAllMatchingMs: setupMs, manualCoreAllAttemptsMs: manualMs, crateCoreAllAttemptsMs: crateMs, crateFirstUseAllAttemptsMs: firstUseMs,
      comparison: allSuccessful ? timeDifference(manualMs, firstUseMs) : { savedMs: null, percent: null },
      comparisonNote: "Manual planning+repair versus Crate setup+planning+repair, including every recorded attempt. A null result means absent/incomplete/failed data or no positive baseline. Single-session observations are not causal evidence." },
    ratings: draft.attempts.filter(attempt => attempt.task !== "setup").map(attempt => ({ attemptId: attempt.id, task: attempt.task,
      accepted: attempt.accepted, reviewedDenominator: attempt.reviewed, proposedDenominator: attempt.proposed, expectedSlots: taskCase(draft, attempt.task).slotsA + taskCase(draft, attempt.task).slotsB,
      acceptanceShare: attempt.accepted !== null && attempt.reviewed !== null && attempt.reviewed > 0 && attempt.accepted <= attempt.reviewed ? attempt.accepted / attempt.reviewed : null,
      constraintErrors: attempt.constraintErrors, checksOfReportedOutput: outputFindings(draft, attempt), source: draft.ratingSource === "not-rated" ? "unobserved" : draft.ratingSource })),
    completionIssues: issues, raw: draft,
    claimBoundary: "No verified customer trial, independent relevance, sales effect, market fit or guaranteed time saving is established by exporting this workbook."
  };
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function text(value: unknown, max: number): value is string { return typeof value === "string" && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value); }
function one(value: unknown, values: readonly unknown[]) { return values.includes(value); }
function count(value: unknown, max: number): boolean { return value === null || typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isInteger(value) && value <= max; }
function validCase(value: unknown): value is TrialCase {
  return record(value) && text(value.inventoryCsv, 16_000) && text(value.briefA, 600) && text(value.briefB, 600) && text(value.stockout, 600)
    && one(value.slotsA, [3, 4, 5, 6]) && one(value.slotsB, [3, 4, 5, 6]);
}
function validAttempt(value: unknown): value is Attempt {
  return record(value) && Number.isSafeInteger(value.id) && Number(value.id) > 0 && one(value.task, TASKS)
    && one(value.state, ["running", "stopped", "interrupted"]) && one(value.timing, ["client-timed", "self-reported", "unobserved"])
    && count(value.elapsedMs, 86_400_000) && [value.startedAt, value.stoppedAt].every(item => item === null || text(item, 40))
    && one(value.outcome, ["not-recorded", "completed", "failed", "abandoned"])
    && [value.proposed, value.reviewed, value.accepted].every(item => count(item, 12)) && count(value.constraintErrors, 99)
    && text(value.outputA, 1200) && text(value.outputB, 1200) && text(value.stockoutId, 80) && text(value.notes, 600);
}

/** Bounded local restore. A saved running timer is interrupted, never silently resumed. */
export function restoreTrial(raw: string): TrialDraft {
  if (new TextEncoder().encode(raw).length > MAX_TRIAL_BYTES) throw new Error("The saved draft is too large.");
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || !text(value.sessionCode, 32) || typeof value.consent !== "boolean"
    || !one(value.role, ["", "bookseller", "bookshop-staff", "other"]) || !one(value.inventoryKind, ["", "real", "practice"])
    || !one(value.applicability, ["", "upcoming-event", "past-event", "hypothetical"]) || !one(value.design, ["same-case", "comparable-cases"])
    || !one(value.order, ["", "manual-first", "crate-first"]) || !one(value.orderSource, ["unassigned", "browser-random", "external-or-chosen"])
    || !one(value.manualCase, ["a", "b"]) || !text(value.allocationNotes, 600) || !validCase(value.caseA) || !validCase(value.caseB)
    || !Array.isArray(value.attempts) || value.attempts.length > MAX_ATTEMPTS || !value.attempts.every(validAttempt)
    || new Set(value.attempts.map(attempt => attempt.id)).size !== value.attempts.length
    || ![value.liveEvidenceUsed, value.allMatchingTimed, value.reviewerConfirmed, value.completionRequested].every(item => typeof item === "boolean")
    || !one(value.ratingSource, ["not-rated", "participant-bookseller", "second-bookseller"])
    || ![value.hardest, value.negative, value.confounds].every(item => text(item, 1200))) throw new Error("The saved draft is invalid or from a different workbook version.");
  const draft = value as TrialDraft;
  return { ...draft, completionRequested: false, attempts: draft.attempts.map(attempt => attempt.state === "running"
    ? { ...attempt, state: "interrupted", outcome: "abandoned", notes: `${attempt.notes.slice(0, 470)}\nSaved during a running timer; time is incomplete. Record the interruption.`.trim() } : attempt) };
}
