# Validation plan

Developed by Ajnas N B

Status: software verification and live cultural-value validation are separate. An approved API key and customer pilot results were not available when this document was prepared. Do not present proposed research or synthetic ranks as measured results.

## Completed implementation checks, October 17, 2026

All 51 automated tests pass: 12 CSV checks, 12 planner checks (including 220 seeded independent brute-force comparisons), 14 Qloo adapter checks, and 13 MCP HTTP-contract checks. Full TypeScript checking and the production build pass. Browser checks verified initial packing, locked-crate preservation, veto repair, disabled exports for stale plans, explicit conflicting-pin errors, and the narrow mobile layout. The hosted prototype's packing flow works, and anonymous access to its configuration endpoint returns HTTP 200 without credentials.

Public prototype: [Crate](https://crate-books-ajnas.foamythyme32.chatgpt.site). Public MIT-licensed source: [AjnasNB/crate-qloo](https://github.com/AjnasNB/crate-qloo). Application code revision: `842683e195ab469ef7b3a5a7331fa7aec8f56505`; subsequent documentation-only updates do not change that implementation.

Browser policy prevented checking Chrome's download history. CSV content and stock-safe export behavior were verified by automated tests; a completed browser download was not independently confirmed. Live Qloo, external-agent interoperability with a real key, reader usefulness and customer results remain unverified.

## Reproducible inventory and export checks

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

## Live Qloo experiment: required before submission

- Confirm a valid hackathon key against the documented hackathon host; resolve titles and authors without inventing identifiers. Store the key on the server.
- Measure resolved titles out of all twelve, ambiguous identities, and available candidates per event. Report missing titles rather than substituting unverified authors or LLM guesses.
- Compare ordered candidate inventories within each query. Do not add raw affinity scores from different queries or label scores as probabilities.
- Inspect one credible cross-domain recommendation that is not the event film's adaptation. Have a bookseller judge its usefulness without being told which source produced it where practical.
- Re-run after a lineup change. Verify a genuine acquisition/re-query path or an explicit stale-evidence state; a static fixture is not live evidence.
- Compare with an oldest-stock selection using the same inventory and constraints. Shelf age is a simple baseline, not an assertion of optimal sales performance.
- Verify zero/partial API results, invalid credentials, throttling, latency, and outage behavior. An error must remain distinguishable from a live result and from a labeled simulation.

## Interface and submission acceptance

Try a plan without login, edit stock, reserve copies, pin/veto a selection, lock a crate, trigger repair, and export matching manifests. Confirm capacity and available-copy constraints across both stalls. Confirm all evidence labels remain legible on printouts and CSV downloads. Test the public deployment on desktop and mobile and with keyboard controls. Ensure no secret or private Qloo response is included in the public repository.

**Stop or revise:** most stock cannot be resolved; useful results are predominantly adaptations; booksellers reject most bridges; repair changes locked decisions; export and screen disagree; or the workflow takes more editing than the current method. A sales study requires a later, separately agreed matched-display pilot; no revenue claims follow from this task test.
