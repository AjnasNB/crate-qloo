# Crate

**Pack books for the crowd. Developed by Ajnas N B.**

[Try Crate](https://crate.ajnasnb.com) · [Watch the live Qloo motion film](https://crate.ajnasnb.com/demo) · [Free bookseller trial](https://crate.ajnasnb.com/trial) · [Devpost entry](https://devpost.com/software/crate-6jkox0) · [Quality record](docs/QUALITY.md)

Crate is a planning desk for an independent bookstore sending two separately staffed cultural stalls out at the same time. It allocates a shared book inventory, protects shop reserves, and repairs packing lists when stock or editorial decisions change.

## Current status

**Live Qloo integration passed on the direct Cloudflare deployment on October 22, 2026.** Choose **Use live Qloo**, then **Pack the stalls**. The reviewed twelve-title starter, inventory-restricted rankings, changed-programme retrieval, stock-safe repair and public MCP HTTP planning passed. See the [measured live record and limits](docs/LIVE-QLOO.md).

Simulation remains explicitly labeled and uses hand-authored or deterministic fixtures. Sample stock and events are fictional. This version does not call a language model. The [existing Devpost entry](https://devpost.com/software/crate-6jkox0) was updated and verified on October 22 with the live results, evidence image and judge instructions; it remains Submitted with 5/5 steps complete. Software verification does not establish reader usefulness, customer results or judging acceptance.

Report a workflow blocker through the [sanitized feedback form](https://github.com/AjnasNB/crate-qloo/issues/new?template=workflow-feedback.yml). Do not include private stock files, customer details or credentials.

## Free exploratory bookseller trial

The trial is voluntary and requires no payment or account. It compares the shop's usual packing method with live Crate using a bounded stock subset, then tests a simulated shortage. The workbook records first-use setup, packing/repair times, incomplete attempts, editorial acceptance and criticism. Reports are not sent automatically. See the [predefined protocol](docs/BOOKSELLER-TRIAL.md) and [recruitment preparation](docs/TRIAL-OUTREACH.md).

No completed bookseller trials or measured customer benefits are published yet. Developer rehearsals and software checks do not count as customer validation. Any later result must retain its sample size, setup costs, failures, learning effects and publication consent.

UTF-8 CSV file links, wrapped print layouts and warning-only stale printing are included. All **95 tests** pass, including 16 trial-report checks. [Export/print verification](docs/EXPORT-QA.md) records actual saved CSV/JSON files, inspected A4/Letter PDFs and the remaining native-dialog boundary. [Novelty and competing approaches](docs/NOVELTY.md) explains the contribution and its unmeasured customer value.

## Run locally

Requires Node.js 22.13+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open the printed local URL, normally http://localhost:5173. No key is needed for the synthetic demonstration.

For the `/demo` player, run `npm run demo:prepare` once. It copies the local rendered film or downloads the pinned public release, verifies its exact size and SHA-256, and writes the ignored MP4 into `public/media/`. Production builds run this step automatically. The editable film source and reproduction instructions are in [film/README.md](film/README.md); [the video record](docs/VIDEO.md) distinguishes the current live film from historical synthetic prototypes.

On Windows, if a package-manager shim fails, invoke npm's installed JavaScript entry point with Node. The portable starter also supports `npm run install:ci` for dependency setup.

## Try the complete workflow

1. Inspect the twelve sample books and two fictional cultural programmes.
2. Pack the stalls and inspect each selection's within-programme rank.
3. Pin editorial choices, reserve shop copies or exclude a title.
4. Lock a packed crate, change stock, and repair the lists. Conflicting constraints are surfaced, never silently relaxed.
5. Compare oldest-stock-first under the same constraints.
6. Download packing manifests or print table cards. The source label follows the export.

These are display allocations: one selected title consumes one copy per stall. Quantities are not demand predictions. Simultaneous departure matters because stock cannot be reused between the two stalls.

## Configure your own Qloo access

Copy `.env.example` to `.env.local` and set `QLOO_API_KEY`. For the local Worker runtime, also configure the key in the ignored `.dev.vars` file when required by the development host. Never use a `NEXT_PUBLIC_` prefix for credentials. Hosted runtime secrets must be configured in the hosting platform; environment files and keys must never be committed.

The default host is `https://hackathon.api.qloo.com`. Hackathon keys do not work against the production host. `QLOO_API_BASE=https://api.qloo.com` is supported only for a separately authorized production key. No client-supplied host is accepted.

The fixed starter's book and programme matches were reviewed from live metadata on October 22, 2026. Imported stock and changed programme interests require their own explicit review. Qloo text search is not an ISBN/edition lookup; do not confirm an ambiguous work. Unsupported or unmatched stock needs correction or removal, not an invented match.

The adapter uses the documented `/search` and `GET /v2/insights` endpoints. Book requests restrict `filter.results.entities` to the confirmed inventory and pass the confirmed film/artist interests through `signal.interests.entities`. Returned order supplies rank. The trace records request parameters, response hashes, missing candidates, and whether optional explainability was supplied. Stock-only repair reuses evidence; changing a programme requires new retrieval for that context.

Live errors remain errors. The adapter never silently substitutes synthetic data. The Worker uses Cloudflare's native rate limiter for credential-consuming requests: 30 per client IP per 60 seconds, approximate and local to a Cloudflare location. This abuse control is not a global upstream quota or authentication. See [deployment and operational limits](docs/CLOUDFLARE.md).

## Deploy to your Cloudflare account

```sh
npm ci
npm run build
npx wrangler login
npm run deploy
npx wrangler secret put QLOO_API_KEY --config dist/server/wrangler.json
```

Set your own `account_id` and Worker name in `wrangler.jsonc` before building. Enter the key only at Wrangler's secret prompt. The default hackathon API host requires no additional secret. The app runs directly on Workers with static assets; no external sign-in or connector gateway is required. See [the verified deployment record](docs/CLOUDFLARE.md).

## Agent tool endpoint

`POST /mcp` exposes an experimental stateless Model Context Protocol endpoint; `/api/mcp` remains an alias. External assistants can search cultural entities, rank a confirmed inventory, or obtain an exact packing plan through structured tool calls. These live tools use the same server-side Qloo adapter and do not return synthetic evidence. No model, external messaging, stock mutation or purchase is performed by this server.

See [MCP setup and tool contracts](docs/MCP.md). Without an approved key, discovery works and live tool calls return a clear configuration error. The deterministic planner and an agent calling its tools are described separately.

## Inventory CSV

Required columns: `title,author,quantity`. Optional: `id,reserve,ageDays,price,color`. Maximum 18 distinct titles. Download the in-app template for a valid example. Quantities and reserves are non-negative integers; reserves may not exceed quantity. Edition identifiers can be retained in your own stock system; Crate matches the underlying work.

CSV imports stay in the browser session. In live mode, searches send title queries and event interests to Qloo. API evidence requests send confirmed entity identifiers, not stock quantities, reserves or prices. Reloading the page starts a new workspace. There is no account, checkout, messaging or POS connection.

## Allocation method

An exact dynamic program chooses neither stall, the first, the second, or both for each title. It respects stock after shop reserves, table capacity, pins, vetoes and evidence eligibility. Missing rankings are unknown and cannot be auto-placed.

For the cultural strategy, within-list position becomes an explicitly application-defined ordinal utility. Raw affinity values are never added across Qloo queries. Repair first minimizes changed title–stall assignments, then maximizes utility with deterministic ties. A packed crate is protected by pins. The oldest-stock baseline has identical eligibility and hard constraints.

Optimizer correctness does not establish that readers prefer the selected books. No sales uplift, individual taste, attendance, or purchase probability has been measured.

## Validation

```sh
node --test tests/*.test.mjs
npx tsc --noEmit
npm run build
```

Tests include independent brute-force checks against the allocation solver, hard-constraint and infeasibility cases, CSV import/export, and mocked Qloo authentication, rate limits, timeouts, bounded responses, candidate restriction and provenance. Mock tests do not replace live API validation.

The app uses React, TypeScript and Vinext with the official Cloudflare Vite plugin. The build emits a Worker and client assets for deployment directly to the owner's Cloudflare account.

## Project evidence

- [Sixteen rounds of critique and refinement](docs/IDEATION.md)
- [Live integration gates and bookseller pilot](docs/VALIDATION.md)
- [Submission draft and honest readiness checklist](docs/SUBMISSION.md)
- [Qloo challenge](https://qloo.devpost.com/)
- [Qloo API access and developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide)
- [Qloo affinity interpretation](https://github.com/qloo/docs-public/blob/main/docs/interpreting-affinity-scores.md)

Full Qloo API responses are not included in this repository. The film retains a minimal derived rank record and public app captures for reproducibility. Bibliographic names are factual references; original typographic UI tiles are not publisher cover artwork. Sample events imply no artist or filmmaker participation or endorsement.

## License

MIT, copyright 2026 Ajnas N B. See [LICENSE](LICENSE). Dependencies and retained third-party sources keep their respective licenses.
