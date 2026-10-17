# Crate — submission draft

Developed by Ajnas N B

**Draft status: public prototype deployed; pending live Qloo integration validation and customer evaluation. This is not a submitted entry.** An API key request has been received by the access-request system; a working key has not yet been supplied. Do not remove this qualification until the relevant gates pass.

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

## Required links and final gates

- Externally hosted prototype URL: [Crate](https://crate-books-ajnas.foamythyme32.chatgpt.site). Synthetic mode is working; the required live Qloo path remains pending.
- Public source repository URL: [AjnasNB/crate-qloo](https://github.com/AjnasNB/crate-qloo), verified public with GitHub-detected MIT license on October 17, 2026.
- Public repository license: MIT; verify the repository recognizes the included `LICENSE` file.
- Live Qloo evidence: **pending approved key and validation**.
- Public prototype access: verified on October 17, 2026. Keep the completed live application available free throughout the judging period.
- Description and instructions in English: prepared here; reconcile against the final implementation.

The organizer requires a functional externally hosted app, public licensed source, and a description; a local-only or synthetic-only demonstration does not establish the required Qloo application. Review the [challenge requirements](https://qloo.devpost.com/) and [official rules](https://qloo.devpost.com/rules) before submitting. Do not invent a URL or mark this draft complete because a concept or local build looks convincing.
