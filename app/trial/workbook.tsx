"use client";

import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { downloadDataUrl } from "../../lib/download";
import { MAX_ATTEMPTS, MAX_TRIAL_BYTES, TRIAL_STORAGE_KEY, completionIssues, inventoryCount, newAttempt, newTrial, repairTarget, restoreTrial, sessionIssues, setupIssues, trialReport, type Attempt, type Task, type TrialCase, type TrialDraft } from "../../lib/trial";
import styles from "./trial.module.css";

const labels: Record<Task, string> = { setup: "Crate first-use setup & all matching", "manual-plan": "Manual initial plan", "crate-plan": "Live Crate initial plan", "manual-repair": "Manual protected-crate repair", "crate-repair": "Crate protected-crate repair" };
const seconds = (value: number | null) => value === null ? "Unobserved" : `${(value / 1000).toFixed(1)} s`;
const numeric = (value: string) => value === "" ? null : Number(value);

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className={styles.field}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function CaseFields({ name, value, disabled, onChange }: { name: string; value: TrialCase; disabled: boolean; onChange: (value: TrialCase) => void }) {
  const result = inventoryCount(value.inventoryCsv);
  return <fieldset className={styles.caseFields} disabled={disabled}>
    <legend>{name}</legend>
    <Field label="Inventory CSV · 8–18 titles" hint="Include title, author, quantity and unique local id columns; reserve is optional. Use the same inputs in the packing desk. No customer or supplier details.">
      <textarea name={`${name}-inventory`} className={styles.mono} rows={5} maxLength={16000} value={value.inventoryCsv} onChange={event => onChange({ ...value, inventoryCsv: event.target.value })} placeholder={'id,title,author,quantity,reserve\nsku-1,Your title,Author,2,0'} spellCheck={false} />
    </Field>
    <p className={styles.hint}>{result.error ?? `${result.count} inventory titles parsed. Identity matches are still unverified and must be reviewed on the clock.`}</p>
    <div className={styles.twoColumns}>
      <Field label="Stall A programme and artist/movie interests"><textarea name={`${name}-brief-a`} rows={3} maxLength={600} value={value.briefA} onChange={event => onChange({ ...value, briefA: event.target.value })} /></Field>
      <Field label="Stall B programme and artist/movie interests"><textarea name={`${name}-brief-b`} rows={3} maxLength={600} value={value.briefB} onChange={event => onChange({ ...value, briefB: event.target.value })} /></Field>
      <Field label="Stall A title slots"><select value={value.slotsA} onChange={event => onChange({ ...value, slotsA: Number(event.target.value) })}>{[3, 4, 5, 6].map(count => <option key={count}>{count}</option>)}</select></Field>
      <Field label="Stall B title slots"><select value={value.slotsB} onChange={event => onChange({ ...value, slotsB: Number(event.target.value) })}>{[3, 4, 5, 6].map(count => <option key={count}>{count}</option>)}</select></Field>
    </div>
  </fieldset>;
}

export default function Workbook() {
  const [draft, setDraft] = useState<TrialDraft>(newTrial);
  const [active, setActive] = useState<{ id: number; start: number } | null>(null);
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState("");
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const locked = draft.attempts.some(attempt => attempt.task !== "setup");
  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => setTick(performance.now()), 250);
    return () => window.clearInterval(interval);
  }, [active]);
  const current = useMemo(() => active ? { ...draft, attempts: draft.attempts.map(attempt => attempt.id === active.id
    ? { ...attempt, elapsedMs: Math.max(0, Math.round(tick - active.start)) } : attempt) } : draft, [draft, active, tick]);
  const report = useMemo(() => trialReport(current), [current]);
  const href = useMemo(() => downloadDataUrl(JSON.stringify(report, null, 2), "json"), [report]);
  const issues = setupIssues(draft);
  const basicIssues = sessionIssues(draft);
  const completion = completionIssues(current);
  const patch = <K extends keyof TrialDraft>(key: K, value: TrialDraft[K]) => setDraft(previous => ({ ...previous, [key]: value, completionRequested: false }));
  const updateAttempt = (id: number, values: Partial<Attempt>) => setDraft(previous => ({ ...previous, completionRequested: false, attempts: previous.attempts.map(attempt => attempt.id === id ? { ...attempt, ...values } : attempt) }));
  const start = (task: Task, timing: Attempt["timing"], now: number) => {
    if (active || (task === "setup" ? basicIssues : issues).length || draft.attempts.length >= MAX_ATTEMPTS) return;
    const id = Math.max(0, ...draft.attempts.map(attempt => attempt.id)) + 1;
    const wallTime = timing === "client-timed" ? new Date().toISOString() : null;
    setDraft(previous => ({ ...previous, completionRequested: false, attempts: [...previous.attempts, newAttempt(id, task, timing, wallTime)] }));
    if (timing === "client-timed") { setTick(now); setActive({ id, start: now }); }
    setMessage("Attempt retained. Stop the timer and record its outcome; failed and repeated attempts stay in the export.");
  };
  const stop = (event: MouseEvent<HTMLButtonElement>) => {
    if (!active) return;
    updateAttempt(active.id, { state: "stopped", elapsedMs: Math.max(0, Math.round(event.timeStamp - active.start)), stoppedAt: new Date().toISOString() });
    setActive(null);
    setMessage("Timer stopped. Record the actual outcome, including failure or N/A.");
  };
  const save = () => {
    try {
      const text = JSON.stringify(current);
      if (new TextEncoder().encode(text).length > MAX_TRIAL_BYTES) throw new Error("This draft exceeds the local save bound. Download the JSON instead.");
      localStorage.setItem(TRIAL_STORAGE_KEY, text);
      setMessage("Draft saved on this browser only. A saved running timer restores as interrupted; there is no automatic background save.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Local storage is unavailable. Download the draft instead."); }
  };
  const load = () => {
    if (active) { setMessage("Stop the running timer before loading a draft."); return; }
    try {
      const text = localStorage.getItem(TRIAL_STORAGE_KEY);
      if (!text) { setMessage("No saved draft exists on this browser."); return; }
      if (draft.attempts.length && !resetConfirmed) { setMessage("To replace current attempts, first check the replace/reset confirmation below. Export this draft first."); return; }
      setDraft(restoreTrial(text)); setResetConfirmed(false); setMessage("Saved draft loaded. Running timers were marked interrupted; completion must be reviewed again.");
    } catch { setMessage("The saved draft could not be loaded. It may be invalid or unavailable; nothing was submitted."); }
  };
  const clear = () => {
    if (!resetConfirmed || active) return;
    try { localStorage.removeItem(TRIAL_STORAGE_KEY); } catch { /* The in-memory draft can still be cleared. */ }
    setDraft(newTrial()); setResetConfirmed(false); setMessage("Current workbook and this browser's saved trial draft cleared. Downloaded copies are unaffected.");
  };
  const assign = () => {
    const bit = crypto.getRandomValues(new Uint32Array(1))[0] % 2;
    setDraft(previous => ({ ...previous, order: bit ? "crate-first" : "manual-first", orderSource: "browser-random", completionRequested: false }));
  };
  const methodOrder = draft.order === "crate-first" ? ["crate", "manual"] : ["manual", "crate"];
  const orderedTasks = ["setup", ...methodOrder.flatMap(method => [`${method}-plan`, `${method}-repair`])] as Task[];

  return <details className={styles.workbook}>
    <summary>Open the local trial workbook <span>No sign-in. Nothing is submitted.</span></summary>
    <div className={styles.workbookBody}>
      <p className={styles.privacy}>Use an anonymous code; no names, contact details, customer data or confidential commercial notes. Drafts stay in memory until you explicitly save or download. Saving is optional, local and manual. Closing an unsaved page loses its contents.</p>
      <section className={styles.section} aria-labelledby="trial-session">
        <h2 id="trial-session">1. Agree on the task</h2>
        <p>Agree on the session, then start the setup timer below before preparing the CSV or matching identities. Case inputs remain editable during setup and lock at the first planning/repair attempt. Export before a full reset.</p>
        <fieldset disabled={locked} className={styles.plainFieldset}>
          <label className={styles.check}><input type="checkbox" checked={draft.consent} onChange={event => patch("consent", event.target.checked)} /> I am an adult, participate voluntarily, and can stop without giving a reason.</label>
          <div className={styles.twoColumns}>
            <Field label="Anonymous session code"><input autoComplete="off" name="session-code" maxLength={32} pattern="[A-Za-z0-9-]{3,32}" value={draft.sessionCode} onChange={event => patch("sessionCode", event.target.value)} placeholder="BOOKS-01" /></Field>
            <Field label="Role"><select value={draft.role} onChange={event => patch("role", event.target.value as TrialDraft["role"])}><option value="">Choose role</option><option value="bookseller">Bookseller</option><option value="bookshop-staff">Bookshop staff</option><option value="other">Other / practice</option></select></Field>
            <Field label="Inventory"><select value={draft.inventoryKind} onChange={event => patch("inventoryKind", event.target.value as TrialDraft["inventoryKind"])}><option value="">Choose stock type</option><option value="real">Real bookseller stock subset</option><option value="practice">Practice / sample stock</option></select></Field>
            <Field label="Event applicability"><select value={draft.applicability} onChange={event => patch("applicability", event.target.value as TrialDraft["applicability"])}><option value="">Choose applicability</option><option value="upcoming-event">Actual upcoming programmes</option><option value="past-event">Actual past programmes, replayed</option><option value="hypothetical">Hypothetical / practice programmes</option></select></Field>
          </div>
          <Field label="Study design"><select value={draft.design} onChange={event => patch("design", event.target.value as TrialDraft["design"])}><option value="same-case">Same case repeated — learning confound</option><option value="comparable-cases">Two comparable cases — allocation recorded</option></select></Field>
          <div className={styles.actions}><button className={styles.secondary} type="button" onClick={assign}>Assign method order randomly</button><Field label="Assigned method order"><select value={draft.order} onChange={event => setDraft(previous => ({ ...previous, order: event.target.value as TrialDraft["order"], orderSource: event.target.value ? "external-or-chosen" : "unassigned" }))}><option value="">Not assigned</option><option value="manual-first">Manual first, then Crate</option><option value="crate-first">Crate first, then manual</option></select></Field></div>
          <p className={styles.hint}>Assignment source: {draft.orderSource}. Actual attempt sequence is retained even if the order is not followed. Alternate order across sessions; do not select the better-looking result.</p>
          {draft.design === "comparable-cases" && <Field label="Which case is assigned to manual?"><select value={draft.manualCase} onChange={event => patch("manualCase", event.target.value as "a" | "b")}><option value="a">Case 1 manual · Case 2 Crate</option><option value="b">Case 2 manual · Case 1 Crate</option></select></Field>}
          <Field label="Case allocation / comparability notes" hint="For two cases, record how allocation was chosen and differences in title count, matching familiarity and programme difficulty."><textarea rows={2} maxLength={600} value={draft.allocationNotes} onChange={event => patch("allocationNotes", event.target.value)} /></Field>
        </fieldset>
        <CaseFields name="Case 1" value={draft.caseA} disabled={locked} onChange={value => patch("caseA", value)} />
        {draft.design === "comparable-cases" && <CaseFields name="Case 2" value={draft.caseB} disabled={locked} onChange={value => patch("caseB", value)} />}
        {issues.length > 0 && <details className={styles.validation}><summary>{issues.length} setup item{issues.length === 1 ? "" : "s"} before timing</summary><ul>{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></details>}
      </section>

      <section className={styles.section} aria-labelledby="trial-attempts">
        <h2 id="trial-attempts">2. Time the work, including failures</h2>
        <p>Start setup before preparing the CSV; include import, every title/anchor match and review. Fill the case fields above while setup runs. Initial plan timing begins when selecting placements and stops at a usable recorded plan. Repair timing begins at the declared stock-out and stops at a feasible protected-B plan or failure. Do not pause for matching or errors. Stop the whole session at 45 minutes and keep incomplete work.</p>
        <p className={styles.hint}>Setup is charged to Crate only. If setup happens before a manual-first task, matching exposure can contaminate the baseline: record that confound. Assigned order: {draft.order || "not assigned"}. Timers count elapsed browser time while you work in the other tab; device sleep or interruptions should be reported.</p>
        {orderedTasks.map(task => {
          const attempts = current.attempts.filter(attempt => attempt.task === task);
          const latest = attempts.at(-1);
          return <details className={styles.task} key={task} open={task === "setup"}>
            <summary>{labels[task]} <span>{attempts.length ? `${attempts.length} attempt${attempts.length === 1 ? "" : "s"} · ${seconds(latest?.elapsedMs ?? null)}` : "Unobserved"}</span></summary>
            <div className={styles.taskBody}>
              {task.endsWith("repair") && <p className={styles.hint}>Predeclared first A-only ID from the latest reported initial plan: <strong>{repairTarget(draft, task) ?? "none yet — record N/A if none qualifies"}</strong>. Set all available copies of this title to zero; keep B unchanged.</p>}
              <div className={styles.actions}>
                <button type="button" className={styles.primary} disabled={!!active || !!(task === "setup" ? basicIssues : issues).length || draft.attempts.length >= MAX_ATTEMPTS} onClick={event => start(task, "client-timed", event.timeStamp)}>Start {attempts.length ? "another retained attempt" : "timer"}</button>
                <button type="button" className={styles.secondary} disabled={!active || !attempts.some(attempt => attempt.id === active.id)} onClick={stop}>Stop timer</button>
                <button type="button" className={styles.textButton} disabled={!!active || !!(task === "setup" ? basicIssues : issues).length || draft.attempts.length >= MAX_ATTEMPTS} onClick={event => start(task, "self-reported", event.timeStamp)}>Record a self-reported attempt instead</button>
              </div>
              {attempts.map(attempt => <article className={styles.attempt} key={attempt.id}>
                <h3>Attempt {attempt.id} · {seconds(attempt.elapsedMs)} <small>{attempt.timing} · {attempt.state}</small></h3>
                {attempt.state === "running" ? <p role="status">Timing in progress. Stop before recording its outcome. At 45 minutes, stop and mark remaining work incomplete.</p> : <>
                  {attempt.state === "interrupted" && <button type="button" className={styles.textButton} onClick={() => updateAttempt(attempt.id, { timing: "self-reported", state: "stopped", elapsedMs: null })}>Record a self-reported elapsed time for this interruption</button>}
                  <div className={styles.twoColumns}>
                    <Field label="Actual outcome"><select value={attempt.outcome} onChange={event => updateAttempt(attempt.id, { outcome: event.target.value as Attempt["outcome"] })}><option value="not-recorded">Not recorded / incomplete</option><option value="completed">Task completed (not independently verified)</option><option value="failed">Failed / no feasible result</option><option value="abandoned">Stopped / N/A / abandoned</option></select></Field>
                    {attempt.timing === "self-reported" && <Field label="Self-reported elapsed seconds"><input inputMode="decimal" type="number" min="0" max="86400" step="0.1" value={attempt.elapsedMs === null ? "" : attempt.elapsedMs / 1000} onChange={event => updateAttempt(attempt.id, { elapsedMs: event.target.value === "" ? null : Math.round(Number(event.target.value) * 1000) })} /></Field>}
                  </div>
                  {task !== "setup" && <>
                    <p className={styles.hint}>Count title/stall placements, not unique works. Record zero explicitly. These counts are entered by the reviewer, never inferred from app recommendations.</p>
                    <div className={styles.fourColumns}>
                      {([['proposed', 'Proposed'], ['reviewed', 'Reviewed'], ['accepted', 'Would pack'], ['constraintErrors', 'Constraint errors']] as const).map(([key, label]) => <Field key={key} label={label}><input type="number" inputMode="numeric" min="0" max={key === "constraintErrors" ? 99 : 12} step="1" value={attempt[key] ?? ""} onChange={event => updateAttempt(attempt.id, { [key]: numeric(event.target.value) })} /></Field>)}
                    </div>
                    <div className={styles.twoColumns}>
                      <Field label="Stall A output · one local title ID per line"><textarea className={styles.mono} rows={3} maxLength={1200} value={attempt.outputA} onChange={event => updateAttempt(attempt.id, { outputA: event.target.value })} /></Field>
                      <Field label="Stall B output · one local title ID per line"><textarea className={styles.mono} rows={3} maxLength={1200} value={attempt.outputB} onChange={event => updateAttempt(attempt.id, { outputB: event.target.value })} /></Field>
                    </div>
                    {task.endsWith("repair") && <Field label="Actual removed A title ID"><input autoComplete="off" maxLength={80} value={attempt.stockoutId} onChange={event => updateAttempt(attempt.id, { stockoutId: event.target.value })} /></Field>}
                  </>}
                  <Field label="Failure, N/A, interruption or task-match notes" hint="Explain the actual error or why no repair target/replacement was possible. All attempts stay in the export."><textarea rows={2} maxLength={600} value={attempt.notes} onChange={event => updateAttempt(attempt.id, { notes: event.target.value })} /></Field>
                </>}
              </article>)}
            </div>
          </details>;
        })}
        <p className={styles.hint}>Maximum {MAX_ATTEMPTS} retained attempts. If you hit this bound, stop and export the incomplete record.</p>
      </section>

      <section className={styles.section} aria-labelledby="trial-review">
        <h2 id="trial-review">3. Record the uncomfortable parts</h2>
        <div className={styles.twoColumns}>
          <Field label="Who rated the proposed titles?"><select value={draft.ratingSource} onChange={event => patch("ratingSource", event.target.value as TrialDraft["ratingSource"])}><option value="not-rated">Not rated / unobserved</option><option value="participant-bookseller">Participant bookseller — self-review</option><option value="second-bookseller">A second bookseller — separately reviewed</option></select></Field>
          <Field label="Hardest or slowest part"><textarea rows={3} maxLength={1200} value={draft.hardest} onChange={event => patch("hardest", event.target.value)} /></Field>
          <Field label="What was wrong, unsuitable or not worth using?"><textarea rows={3} maxLength={1200} value={draft.negative} onChange={event => patch("negative", event.target.value)} /></Field>
          <Field label="Learning, interruptions, case mismatch or prior familiarity" hint="Record none if none were noticed; same-case reuse still has a learning confound."><textarea rows={3} maxLength={1200} value={draft.confounds} onChange={event => patch("confounds", event.target.value)} /></Field>
        </div>
        {(["caseA", ...(draft.design === "comparable-cases" ? ["caseB"] : [])] as ("caseA" | "caseB")[]).map((key, index) => <Field key={key} label={`Case ${index + 1}: repair applicability / feasibility`} hint="Describe the actual removed SKU, locked B and replacement, or state why this was N/A/failed."><textarea rows={2} maxLength={600} value={draft[key].stockout} onChange={event => patch(key, { ...draft[key], stockout: event.target.value })} /></Field>)}
        <label className={styles.check}><input type="checkbox" checked={draft.liveEvidenceUsed} onChange={event => patch("liveEvidenceUsed", event.target.checked)} /> I actually used live Qloo evidence, not the simulation.</label>
        <label className={styles.check}><input type="checkbox" checked={draft.allMatchingTimed} onChange={event => patch("allMatchingTimed", event.target.checked)} /> Setup timing includes review and matching of every title and programme anchor, including retries.</label>
        <label className={styles.check}><input type="checkbox" checked={draft.reviewerConfirmed} onChange={event => patch("reviewerConfirmed", event.target.checked)} /> The selected reviewer is an actual consenting adult bookseller who reviewed the outputs. Self-review is not independent second-reviewer evidence.</label>
      </section>

      <section className={styles.section} aria-labelledby="trial-export">
        <h2 id="trial-export">4. Keep or share your record</h2>
        <p><strong>{report.status === "draft" ? "Draft / incomplete workbook" : "Complete unverified participant report"}</strong> · {report.counts.attempts} attempts, {report.counts.failed} failed, {report.counts.abandoned} stopped/N/A, {report.counts.incomplete} incomplete. A complete report may honestly include failed tasks; it is not a validated customer result.</p>
        <dl className={styles.totals}><div><dt>Setup & matching recorded</dt><dd>{seconds(report.times.setupAndAllMatchingMs)}</dd></div><div><dt>Manual core recorded</dt><dd>{seconds(report.times.manualCoreAllAttemptsMs)}</dd></div><div><dt>Crate core recorded</dt><dd>{seconds(report.times.crateCoreAllAttemptsMs)}</dd></div><div><dt>Crate first-use recorded</dt><dd>{seconds(report.times.crateFirstUseAllAttemptsMs)}</dd></div></dl>
        <p className={styles.hint}>Totals include every recorded attempt and may be partial. Raw milliseconds, denominators, provenance and limitations are exported. No improvement percentage is displayed as a result here.</p>
        {report.protocol.assignedOrderMismatch && <p className={styles.notice}>Actual method order differs from assignment. Record why in the confounds field; the mismatch stays in the export.</p>}
        {report.protocol.possibleSetupExposureBeforeManual && <p className={styles.hint}>Crate setup preceded manual work. Possible mapping exposure is flagged in the export; this is not a clean unseen manual baseline.</p>}
        <label className={styles.check}><input type="checkbox" disabled={!!active || completion.length > 0} checked={draft.completionRequested} onChange={event => setDraft(previous => ({ ...previous, completionRequested: event.target.checked }))} /> Mark the reporting checklist complete, while retaining its unverified status.</label>
        <details className={styles.validation}><summary>{completion.length ? `${completion.length} items keep this a draft` : "Reporting checklist ready — still unverified"}</summary>{completion.length > 0 ? <ul>{completion.map((issue, index) => <li key={index}>{issue}</li>)}</ul> : <p>Completing this checklist does not verify that the tasks or review actually happened.</p>}</details>
        <div className={styles.actions}>
          {href ? <a className={styles.primary} href={href} download={`crate-trial-${/^[a-z0-9-]{3,32}$/i.test(draft.sessionCode) ? draft.sessionCode : "anonymous"}-${report.status === "draft" ? "draft" : "unverified"}.json`}>Download {report.status === "draft" ? "draft" : "unverified report"} JSON</a> : <button type="button" className={styles.primary} disabled>Export too large</button>}
          <button type="button" className={styles.secondary} onClick={save}>Save draft on this device</button>
          <button type="button" className={styles.textButton} onClick={load} disabled={!!active}>Load saved draft</button>
        </div>
        <p>If you choose to share, download and inspect the JSON, then attach it in a reply to <a className={styles.textLink} href="mailto:ajnasnb@gmail.com">ajnasnb@gmail.com</a>. Remove identifying details first. Downloading, saving and marking complete send nothing; this page has no upload or submission service.</p>
        <div className={styles.reset}><label className={styles.check}><input type="checkbox" checked={resetConfirmed} onChange={event => setResetConfirmed(event.target.checked)} /> I have exported anything needed and want to replace/reset this workbook. Do not erase failures to improve the result.</label><button type="button" className={styles.textButton} disabled={!resetConfirmed || !!active} onClick={clear}>Clear workbook & this device&apos;s saved draft</button></div>
        <p className={styles.status} role="status" aria-live="polite">{message}</p>
      </section>
    </div>
  </details>;
}
