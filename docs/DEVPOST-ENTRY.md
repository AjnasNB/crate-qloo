# Devpost entry fields and submission record

Historical October 17 payload. The current live results are in [LIVE-QLOO.md](LIVE-QLOO.md), and the prepared replacement fields are in [DEVPOST-LIVE.json](DEVPOST-LIVE.json). Live validation passed October 22; browser reconnection is required to save and verify the replacement on Devpost.

Prepared October 17, 2026. Crate’s [public project](https://devpost.com/software/crate-6jkox0) has its story and three screenshots saved. Submission `1242313-crate` was confirmed by Devpost’s “Project submitted!” receipt and “SUBMITTED TO Qloo” status after the user explicitly authorized final terms acceptance and submission. Local receipt evidence is `evidence/devpost-crate-submitted.jpg` in the parent workspace. Keep the live-pending status in the public body until successful Qloo validation; submission is not proof of eligibility or live integration.

## Project name

Crate

## Elevator pitch

Pack two cultural book pop-ups from one stockroom. Preserve shop reserves and editorial choices, then repair packing lists when stock changes. Live Qloo validation pending.

## About-project body

The following body records the prepared English description, limited to demonstrated scope and explicit pending work. The submitted story also links the verified motion release below.

Crate helps an independent bookshop prepare two separately staffed cultural pop-ups that leave at the same time. Both stalls draw from one stockroom, so the same single copy cannot leave in both crates.

The public prototype works with clearly labeled synthetic rankings. The API access request receipt was confirmed on October 17, 2026, but no working Qloo key or live recommendation has been verified. Sample events, quantities, prices and shelf ages are fictional; the twelve book/author pairs are real.

## Try it

1. Inspect the twelve sample titles, or import up to eighteen stock records with quantities and shop reserves.
2. Set each stall’s artist and film programme and choose its number of display titles.
3. Pack both stalls. Pin editorial choices, veto a poor fit, and lock a crate that is already packed.
4. Set a selected title’s stock to zero and repair. Review what changed, then export source-labeled manifests or print display cards.

## How it works

React, TypeScript and Vinext provide the interface, hosted on Cloudflare. An exact bounded allocator respects available copies, shop reserves, display capacity, pins, vetoes and evidence eligibility. Each selected title consumes one copy per stall. Stock and editorial repairs minimize changed placements before improving the rank objective; programme changes trigger a fresh allocation while protecting locked crates. Impossible constraints produce an explanation.

The server-side Qloo adapter provides typed entity search for manual confirmation and book rankings restricted to the confirmed inventory. Within-query ranks are used without combining raw scores across requests or calling them sales probabilities. Missing evidence stays unknown. These contracts are implemented and mock-tested; live execution remains pending. Three published MCP tools expose search, ranking and planning. External dispatch to the missing-key error has been verified, but a successful live agent-tool plan has not.

## What is verified

All 54 automated checks pass, including 220 seeded independent brute-force comparisons, CSV handling, Qloo failure boundaries and MCP contracts. TypeScript and production build pass. Browser checks cover packing, locked-crate stock-out repair, stale export protection, conflicting pins, dialog keyboard access, inline CSV errors and narrow-screen layout. This version calls no language model.

Next are genuine Qloo mappings, a fast reviewed starter catalogue, useful non-adaptation cultural bridges and live external-tool planning. Bookseller adoption, time savings and sales uplift have not been measured.

[Try the public prototype](https://crate-books-ajnas.foamythyme32.chatgpt.site)
[Read the public MIT-licensed source](https://github.com/AjnasNB/crate-qloo)

Developed by Ajnas N B

## Built with

TypeScript, React, Vinext, Vite, Cloudflare Workers, Qloo API adapter, Model Context Protocol.

Qloo live access remains pending. No language model is called by this version.

## Links

- Working prototype: https://crate-books-ajnas.foamythyme32.chatgpt.site
- Public source: https://github.com/AjnasNB/crate-qloo
- License: MIT.
- Motion video: https://github.com/AjnasNB/crate-qloo/releases/tag/v0.2.0-motion-prototype — verified public release, linked in the submitted story.
- Submitted project: https://devpost.com/software/crate-6jkox0
- Screenshot: use the source-labeled packing view. A synthetic screenshot must not be labeled as live Qloo evidence.

## Remaining validation after submission

- Keep the app, source and released video links publicly accessible and synchronized with the described implementation.
- Complete hosted live Qloo search, entity confirmation, candidate-restricted ranking and allocation.
- Review starter mappings, programme-dependent results and a credible non-adaptation bridge.
- Complete a successful live external MCP planning call and stock-safe repair.
- Replace pending claims only with actual results. Preserve the confirmed submission receipt when making later authorized edits.

Devpost receipt establishes that the entry was submitted. No working Qloo key, successful live recommendation, live external-tool plan, customer result or organizer eligibility decision has yet been verified.
