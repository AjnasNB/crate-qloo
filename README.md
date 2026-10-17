# Crate

**Pack books for the crowd. Developed by Ajnas N B.**

[Try the public prototype](https://crate-books-ajnas.foamythyme32.chatgpt.site) · [Read the sixteen-round idea review](docs/IDEATION.md)

Crate is a planning desk for an independent bookstore sending two separately staffed cultural stalls out at the same time. It allocates a shared book inventory, protects shop reserves, and repairs packing lists when stock or editorial decisions change.

## Current status

The public source contains a working allocation engine, an interactive synthetic demonstration, and a server-side Qloo adapter. **Qloo access has been requested; no live key or live validation is available yet.** Sample rankings are hand-authored or deterministic simulation fixtures, not Qloo data. This version does not call a language model. It is not yet a verified hackathon submission.

## Run locally

Requires Node.js 22.13+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open the printed local URL, normally http://localhost:5173. No key is needed for the synthetic demonstration.

On Windows, if a package-manager shim fails, invoke npm's installed JavaScript entry point with Node. The portable starter also supports `npm run install:ci` for dependency setup.

## Try the complete workflow

1. Inspect the twelve sample books and two fictional cultural programmes.
2. Pack the stalls and inspect each selection's within-programme rank.
3. Pin editorial choices, reserve shop copies or exclude a title.
4. Lock a packed crate, change stock, and repair the lists. Conflicting constraints are surfaced, never silently relaxed.
5. Compare oldest-stock-first under the same constraints.
6. Download packing manifests or print table cards. The source label follows the export.

These are display allocations: one selected title consumes one copy per stall. Quantities are not demand predictions. Simultaneous departure matters because stock cannot be reused between the two stalls.

## Connect Qloo when approved

Copy `.env.example` to `.env.local` and set `QLOO_API_KEY`. For the local Worker runtime, also configure the key in the ignored `.dev.vars` file when required by the development host. Never use a `NEXT_PUBLIC_` prefix for credentials. Hosted runtime secrets must be configured in the hosting platform; environment files and keys must never be committed.

The default host is `https://hackathon.api.qloo.com`. Hackathon keys do not work against the production host. `QLOO_API_BASE=https://api.qloo.com` is supported only for a separately authorized production key. No client-supplied host is accepted.

Live mode requires explicit review of book and programme entity matches. Qloo text search is not an ISBN/edition lookup; do not confirm an ambiguous work. Unsupported or unmatched stock needs correction or removal, not an invented match.

The adapter uses the documented `/search` and `GET /v2/insights` endpoints. Book requests restrict `filter.results.entities` to the confirmed inventory and pass the confirmed film/artist interests through `signal.interests.entities`. Returned order supplies rank. The trace records request parameters, response hashes, missing candidates, and whether optional explainability was supplied. Stock-only repair reuses evidence; changing a programme requires new retrieval for that context.

Live errors remain errors. The adapter never silently substitutes synthetic data. Before enabling public live traffic, confirm the upstream key's hard quota or configure hosting abuse controls. No in-memory counter is represented as reliable quota enforcement.

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

The app uses React with the Sites Vinext starter and Cloudflare-compatible server routes. The maintained `sites()` Vite integration and source manifest are retained for publishing. The build emits a deployable Worker and client assets.

## Project evidence

- [Fifteen rounds of critique and refinement](docs/IDEATION.md)
- [Live integration gates and bookseller pilot](docs/VALIDATION.md)
- [Submission draft and honest readiness checklist](docs/SUBMISSION.md)
- [Qloo challenge](https://qloo.devpost.com/)
- [Qloo API access and developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide)
- [Qloo affinity interpretation](https://github.com/qloo/docs-public/blob/main/docs/interpreting-affinity-scores.md)

Qloo API responses are not included in this repository. Bibliographic names are factual references; original typographic UI tiles are not publisher cover artwork. Sample events imply no artist or filmmaker participation or endorsement.

## License

MIT, copyright 2026 Ajnas N B. See [LICENSE](LICENSE). The supplied Sites Vite integration retains its included third-party license. Dependencies retain their respective licenses.
