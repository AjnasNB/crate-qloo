# Crate — submission record

Developed by Ajnas N B

**Submission status: Devpost submission confirmed on October 17, 2026. Live Qloo integration validation and customer evaluation remain pending.** The API access request was submitted and its receipt confirmed on October 17, 2026. Keys are delivered manually, typically within a few business days; no working key or live result has yet been verified. A submission receipt does not establish challenge eligibility or successful Qloo integration.

AjnasNB registered for the hackathon on October 17, 2026 after confirming eligibility and authorizing acceptance of its rules. Crate's [own public project](https://devpost.com/software/crate-6jkox0) has its story and three screenshots saved, with the [public motion-video release](https://github.com/AjnasNB/crate-qloo/releases/tag/v0.2.0-motion-prototype) linked in the story. It was imported through the Qloo portfolio workflow into submission `1242313-crate`. After the user's explicit “Accept terms and submit now” authorization, Devpost displayed “Project submitted!” and the project displayed “SUBMITTED TO Qloo”. Local receipt evidence is retained as `evidence/devpost-crate-submitted.jpg` in the parent workspace. The receipt allows continued editing until October 30, 2026 at 11:45 pm EDT; it is not evidence of judging acceptance. Prepared English fields are in [DEVPOST-ENTRY.md](DEVPOST-ENTRY.md), with a checkout-local JSON copy in the ignored `.sites-runtime/devpost-fields.json`.

The official Devpost welcome email and developer guide lead to the same published "Qloo Agent Hackathon API Key Request Form". The form was successfully submitted and a response receipt confirmed on October 17, 2026. Workspace evidence is retained as `qloo-current-request-confirmed.jpg`. Receipt establishes that the request was received, not that a key was approved, delivered, configured or tested.

## One sentence

Crate helps independent booksellers pack two cultural pop-ups from one limited stock pool, using cultural evidence to propose relevant books while keeping reservations, editorial decisions, and packing manifests consistent.

## The problem

Bookstores already sell at cultural events. Preparing two separately staffed stalls that depart simultaneously creates a concrete allocation problem: the same appealing single-copy book cannot leave in both crates. A conventional reading recommendation does not track those physical constraints, shop reserves, or the bookseller's decisions.

Public examples establish that event-specific bookselling exists; they are not users or endorsers of Crate. [A Cappella film-book pop-up](https://www.acappellabooks.com/pages/events/1525/a-cappella-at-the-movies-a-film-book-pop-up-sale), [Small Print Books](https://www.smallprintbooks.com/).

## Intended experience

Import or edit stock, choose explicit film and artist anchors for two sample event audiences, and generate a bounded plan. Inspect evidence, pin a title, veto a poor fit, protect shop stock, or lock an already packed crate. When availability changes, repair the remaining plan and print the revised manifests and display cards.

The sample events are fictional audience hypotheses. They do not claim actual attendee preferences, event bookings, artist affiliation, or sponsorship. Stock quantities, prices, and shelf ages are fictional. The sample book titles and authors are real.

## What Qloo must contribute

The intended live workflow resolves cultural inputs and books to genuine Qloo entities, obtains recommendations restricted to the available candidate inventory, and uses within-query rank evidence to guide allocation. The agent must gather evidence, handle missing or ambiguous matches, verify constraints, and repair the plan when inputs change. An LLM does not substitute invented book tastes or identities for API results.

**Pending proof:** a valid hackathon key; live title/author resolution; supported candidate-restricted queries; credible non-adaptation cross-domain results; and a working hosted end-to-end evidence path. The current synthetic mode demonstrates planning behavior only. Its curated or deterministic-hash rankings are not Qloo results or evidence of cultural affinity. API errors must not silently fall back to apparent live evidence.

Relevant documentation: [Qloo hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide), [entity type parameter guide](https://docs.qloo.com/reference/available-parameters-by-entity-type).

## Suggested judge walkthrough

1. Open the app and inspect the evidence source before generating a plan.
2. Use the twelve-title sample inventory and the two fictional event lineups.
3. Inspect the single-copy conflict between stalls and the proposed allocation.
4. Pin a title to the other stall, lock one packed crate, and remove a copy elsewhere.
5. Repair, inspect any unmet slots, then export the updated source-labeled manifests.
6. Change an artist or film anchor. In live mode, verify new acquisition or an explicit stale state. In simulation, observe only a changed software fixture.

## What has and has not been established

The product is a bounded planning prototype. Automated software checks can verify CSV behavior and allocation invariants; they cannot establish cultural quality, adoption, time savings, or sales uplift. No customer pilot results, recommendations acceptance rates, or revenue effects are claimed. Follow [the validation plan](VALIDATION.md) and report actual results, including failures, before editing this section.

## Independent readiness review

The following twelve gates reuse the recorded checks rather than claim a new live or customer trial. Results describe the verified version 3 prototype and the current documentation; source changes or a new deployment require the relevant checks again.

| Gate | Evidence already established | Remaining work |
| --- | --- | --- |
| 1. Reach a useful first result | The hosted sample flow produces eight placements without account creation. | Verify the final entry URL still serves the intended revision. |
| 2. Public, runnable source | Public repository and GitHub-detected MIT license were verified; installation instructions are present. | Keep source, assets and instructions synchronized with the final deployment. |
| 3. Implementation correctness | Final automated run: 54/54 passes; TypeScript and production build passed. | Re-run affected checks after implementation changes. |
| 4. Physical constraint demonstration | Browser run locked A, set Kindred stock to zero, preserved A, and replaced B's Kindred with Beloved: eight placements and two changes. | Include this concrete behavior in the judge walkthrough; do not present it as reader-preference evidence. |
| 5. Editorial recovery | Any title can be pinned from stock; exclusions remain visible with Undo; contradictory constraints produce explanations. | Keep the judge's route to pin, repair, and unlock clear. |
| 6. Honest provenance and exports | Simulation labels persist; original snapshot time appears in the print DOM; CSV safety and stock totals are tested. | A completed browser download and physical print pagination were not independently verified. |
| 7. Practical access and recovery | Local keyboard focus/Escape, inline malformed-CSV recovery, narrow-screen geometry and a console-error-free flow were verified. | Screen-reader behavior, physical touch and field performance remain unmeasured. |
| 8. Reachable agent tool | Three MCP tools are published; an external search invocation reached the explicit missing-key error without fallback. | Complete a successful live external-tool planning and repair call. Discovery alone is insufficient. |
| 9. Working Qloo credential | The same published access form was successfully submitted and its receipt confirmed on October 17, 2026. Issuance is manual and typically takes a few business days. | Obtain, configure and test the authorized key. A confirmed request receipt does not establish key approval, delivery or successful API access. |
| 10. Resolved live candidate inventory | Typed search, confirmation UI and candidate-restricted ranking contracts exist and are mock-tested. | Review genuine book/author identities and programme entities. Prepare a small genuine starter mapping so judges need not perform sixteen lookups before reaching value. |
| 11. Cultural contribution | The hypothesis and oldest-stock comparison are explicit. No customer or recommendation-quality result is fabricated. | Show useful programme-dependent live rankings and at least one credible non-adaptation bridge. If small-inventory coverage or usefulness fails, revise the claim rather than substitute fixtures. |
| 12. Saved and final Devpost entry | Crate's own public story and three screenshots are saved; the verified v0.2.0 motion-release link is included. Submission `1242313-crate` showed “Project submitted!” and “SUBMITTED TO Qloo” on October 17, 2026. | Preserve the receipt and keep any later edits truthful. Submission establishes receipt, not Qloo eligibility, live API success or organizer approval. |

The largest unresolved issue is gate 11, dependent on gates 9 and 10: the product can be correct at packing while Qloo adds little useful distinction for the available books. More animation or broader scope does not resolve that risk. Customer evaluation remains a separate future test of utility, not a substitute for live integration.

## Required links and final gates

- Externally hosted prototype URL: [Crate](https://crate-books-ajnas.foamythyme32.chatgpt.site). Synthetic mode is working; the required live Qloo path remains pending.
- Public source repository URL: [AjnasNB/crate-qloo](https://github.com/AjnasNB/crate-qloo), verified public with GitHub-detected MIT license on October 17, 2026.
- Submitted project: [Crate on Devpost](https://devpost.com/software/crate-6jkox0), submission receipt confirmed October 17, 2026; [editor](https://devpost.com/software/crate-6jkox0/edit) remains available for authorized updates.
- Motion-video URL: [v0.2.0 motion prototype release](https://github.com/AjnasNB/crate-qloo/releases/tag/v0.2.0-motion-prototype), publicly released and linked in the submitted story. Its synthetic/pending-live disclosure remains material.
- Public repository license: MIT; verify the repository recognizes the included `LICENSE` file.
- Live Qloo evidence: **pending approved key and validation**.
- Public prototype access: verified on October 17, 2026. Keep the completed live application available free throughout the judging period.
- Description and instructions in English: prepared here; reconcile against the final implementation.

The organizer requires a functional externally hosted app, public licensed source, and a description; a local-only or synthetic-only demonstration does not establish the required Qloo application. The [challenge requirements](https://qloo.devpost.com/) and [official rules](https://qloo.devpost.com/rules) remain the authority. The entry is submitted, while the unresolved live and usefulness gates above remain open.
