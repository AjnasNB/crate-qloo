# Validation plan

Developed by Ajnas N B

Status: software verification and live cultural-value validation are separate. An approved API key and customer pilot results were not available when this document was prepared. Do not present proposed research or synthetic ranks as measured results.

## Earlier version 3 checks, October 17, 2026

All 54 automated tests pass: 13 CSV checks, 13 planner checks (including 220 seeded independent brute-force comparisons), 14 Qloo adapter checks, and 14 MCP HTTP-contract checks. Full TypeScript checking and the updated production build pass. Browser checks verified initial packing, locked-crate preservation, stock-out repair, disabled exports for stale plans, explicit conflicting-pin errors, dialog focus and return, inline CSV errors, and the narrow mobile layout. Version 3 was published successfully and its hosted browser flow verified eight placements, the source-labeled action log, the named stock dialog and heading focus. Anonymous access to the configuration endpoint returns HTTP 200 without credentials.

Public prototype: [Crate](https://crate-books-ajnas.foamythyme32.chatgpt.site). Public MIT-licensed source: [AjnasNB/crate-qloo](https://github.com/AjnasNB/crate-qloo). Deployed application revision: `e4d5d3412ed6d5149739708d9d2d711300b0a315`, Site version 3. The latest hardening adds invalid-reserve rejection, control-character SKU rejection, key-file exclusions, and accessible error/focus behavior. Subsequent documentation-only commits do not change that implementation. See [product QA](PRODUCT-QA.md) and [technical QA](TECHNICAL-QA.md) for the sixteen-check evidence ledgers and remaining limits.

Browser policy prevented checking Chrome's download history. CSV content and stock-safe export behavior were verified by automated tests; a completed browser download was not independently confirmed. Live Qloo, external-agent interoperability with a real key, reader usefulness and customer results remain unverified.

The published native MCP search tool was invoked from an external assistant on October 17, 2026 with the query `Kindred Octavia Butler`. It returned the explicit `QLOO_NOT_CONFIGURED` error and did not substitute sample results. This verifies tool discovery, dispatch and the missing-key boundary only; it is not a successful Qloo session.

## Later live-readiness review, October 17, 2026

Two defects were corrected after the version 3 review: a documented Qloo `query.explainability.warning` now marks optional explanations unavailable while preserving returned ranks, and the manual smoke check rejects UUID case or anchor-order changes that leave the actual upstream signal unchanged. The full updated suite passes 56/56 checks (13 CSV, 13 planner, 16 Qloo/input checks, 14 MCP); TypeScript and targeted lint pass. The production build passed and Site version 4 successfully published revision `ded42c0cc1928a6a4bcf86d90165ccabe6b8dec8`, preserving public access and MCP availability. This server/input correction is separate from the earlier version 3 browser evidence.

No Qloo key was present in the authorized mailbox check or configured hosted runtime. The access request receipt remains confirmed. The authorized follow-up to the hackathon manager was sent on October 17 and Gmail's sent record verified. No new live Qloo success or Devpost live-status update is claimed.

## Reproducible inventory and export checks

The subsequent [readiness and recovery review](READINESS-REVIEW.md) fixes a presentation gap after an infeasible solve: newly acquired evidence can be inspected separately from the last packed-plan snapshot. Browser checks verify first-failure recovery, preservation of the original snapshot after a later failure, disabled stale exports, keyboard focus and narrow layout. This does not establish live API access or customer value.

Run `node --test tests/csv.test.mjs` from the project directory. The test loads TypeScript through the locally installed compiler; no API key or external service is required.

Local verification on 17 October 2026: all twelve CSV/export tests passed. A targeted TypeScript check of `lib/sample.ts` and `lib/csv.ts` against the planner types also passed. These results do not establish a successful complete application build or public deployment.

The checks exercise quoted commas/newlines/escaped quotes, complete inventory round trips, required headers, optional defaults, numeric boundaries, empty and duplicate supplied IDs, the eighteen-title limit, formula-safe spreadsheet exports, cross-stall stock totals, shop reserves, unknown IDs, and source labels. Passing these tests establishes those behaviors only. It does not validate entity coverage, recommendations, customer demand, or the complete interface.

CSV input requires `title,author,quantity`; optional fields are `id,reserve,ageDays,price,color`. If `id` is supplied, each row needs a unique nonblank local SKU. Otherwise IDs are generated locally. Quantity and reserve are integers from 0 to 99; reserve cannot exceed quantity. Shelf age is an integer from 0 to 36,500 days. Price is 0 to 10,000 with at most two decimals. Price has no embedded currency assumption. Colors, if supplied, must use six-digit hexadecimal notation. Zero stock is valid. Bibliographic duplicates can represent separate editions when their local SKUs differ.

## Fifteen-minute customer task

Recruitment and contact require the user's separate authorization; none has been conducted for this plan. The user may share this script with independent booksellers who already prepare off-site events.

Opening language: "We are evaluating an early bookstore packing tool, not your performance. You may skip questions or stop. We will record task time, stock conflicts, edits, and your comments with your consent. The sample stock and events are fictional. Any simulation results are clearly labeled."

1. Give the participant a twelve-title inventory with quantities and shop reserves, two simultaneously departing stall briefs, and four title slots per stall.
2. Ask them to prepare both manifests using their existing method. Record time, conflicts, and questions. Do not coach their book choices.
3. Ask them to repeat with Crate using an equivalent inventory/brief variation; alternate task order between participants to reduce learning effects.
4. Mid-task, remove a copy, ask for one editorial pin, then lock one packed crate. Observe whether repair respects all three decisions.
5. Ask which selections they would actually pack, what needs correction, and whether exports can be handed to a colleague without rework.
6. Ask whether simultaneous separate stalls occur in their work. A "no" is a scope mismatch, not a successful validation.

With three participants, report each result and median/range as exploratory observations; do not infer population effects. Retain disagreements. Do not invent quotes or treat politeness as willingness to adopt.

## Workflow feedback and pilot checklist

Report a reproducible obstacle through the public [bookseller workflow feedback form](https://github.com/AjnasNB/crate-qloo/issues/new?template=workflow-feedback.yml). Describe the intended task, blocker, expected and actual result, and a minimal sanitized reproduction. Redact private data; use fictional examples and do not attach inventory files, personal contacts, or secrets. A submitted issue is feedback, not a completed customer pilot.

Use the [fifteen-minute customer task](#fifteen-minute-customer-task) for a consented pilot, with these workflow checks:

- Pack two simultaneously departing stalls from one shared inventory; record whether the source is Simulation or Live Qloo.
- Verify that a scarce copy is not promised twice and shop reserves stay available to the shop.
- Lock one packed crate, remove stock used by the other crate, and repair. Check that the locked crate stays unchanged; an infeasible lock must produce a clear conflict.
- Export both manifests and compare titles, quantities, capacity and source labels with the displayed plan.
- Record the actual blocker or outcome, including edits and disagreements. Treat any result as unverified until the task has been observed.

## Required live Qloo validation

- Confirm a valid hackathon key against the documented hackathon host; resolve titles and authors without inventing identifiers. Store the key on the server.
- Review and persist a starter catalogue of genuine title/author and programme-anchor mappings so judges can fetch fresh evidence without sixteen manual matches. Record provenance; do not embed synthetic ranks or claim unreviewed mappings are confirmed.
- Measure resolved titles out of all twelve, ambiguous identities, and available candidates per event. Report missing titles rather than substituting unverified authors or LLM guesses.
- Compare ordered candidate inventories within each query. Do not add raw affinity scores from different queries or label scores as probabilities.
- Inspect one credible cross-domain recommendation that is not the event film's adaptation. Have a bookseller judge its usefulness without being told which source produced it where practical.
- Re-run after a lineup change. Verify a genuine acquisition/re-query path or an explicit stale-evidence state; a static fixture is not live evidence.
- Compare with an oldest-stock selection using the same inventory and constraints. Shelf age is a simple baseline, not an assertion of optimal sales performance.
- Verify zero/partial API results, invalid credentials, throttling, latency, and outage behavior. An error must remain distinguishable from a live result and from a labeled simulation.

## Interface and submission acceptance

Try a plan without login, edit stock, reserve copies, pin/veto a selection, lock a crate, trigger repair, and export matching manifests. Confirm capacity and available-copy constraints across both stalls. Confirm all evidence labels remain legible on printouts and CSV downloads. Test the public deployment on desktop and mobile and with keyboard controls. Ensure no secret or private Qloo response is included in the public repository.

**Stop or revise:** most stock cannot be resolved; useful results are predominantly adaptations; booksellers reject most bridges; repair changes locked decisions; export and screen disagree; or the workflow takes more editing than the current method. A sales study requires a later, separately agreed matched-display pilot; no revenue claims follow from this task test.
