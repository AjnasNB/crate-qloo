# Prepared Devpost fields

Developed by Ajnas N B

Prepared October 17, 2026. These fields have not been saved to Devpost: project creation is currently blocked by its reCAPTCHA service connection error. The final entry must also await successful live Qloo validation. Keep the status paragraph below until that validation is complete.

## Project name

Crate

## Elevator pitch

Pack two cultural book pop-ups from shared stock. Turn music and film tastes into feasible book choices, preserve shop reserves, and repair the packing lists when plans change.

## Project story

### Inspiration

An independent bookseller sending two separately staffed stalls out at the same time faces a physical problem: the same single copy cannot leave in both crates. Reading recommendations alone do not account for that conflict, shop reserves, or a bookseller's editorial decisions. Crate connects a cultural brief to an actionable packing plan.

### What it does

Import stock or try twelve sample titles. Give each stall an explicit artist and film programme, choose the number of title slots, and pack both from one stock pool. Pin editorial choices, veto unsuitable titles, reserve shop copies, and lock a crate that is already packed. Repair preserves locked decisions and minimizes changes before improving cultural fit. Export source-labeled manifests and printable display cards. The sample events and stock quantities are fictional.

### How it is built

Crate uses React, TypeScript, Vinext and Cloudflare hosting. Its exact, bounded allocation engine handles up to eighteen titles and two stalls with up to six title slots each. Every selected title consumes one available copy per stall. Constraints remain explicit; contradictory pins or insufficient stock produce an explanation rather than a silently altered plan.

The server-side Qloo adapter resolves books, artists and films to confirmed entities, then requests book rankings restricted to the available inventory. The planner uses ranks within each programme's query; it does not combine raw scores across queries or present them as sales probabilities. Missing evidence remains unknown. Three published MCP tools let an external assistant search identities, acquire rankings and request a fresh, stock-safe draft plan. They do not modify a shop's stock or place orders.

### Current status

The hosted synthetic planning workflow works. Qloo API access has been requested and is awaiting approval. Until a working key is configured and tested, sample rankings are explicitly synthetic and live calls return an error. This draft does not claim a completed live Qloo demonstration or measured customer impact.

### Challenges

A plan can be mathematically feasible and still be unhelpful to a bookseller. Crate therefore separates cultural evidence, editorial judgment and physical constraints. The remaining live validation must establish catalogue coverage and useful cross-domain recommendations. Public examples of event bookselling support the workflow's existence, but no bookseller adoption, time saving or sales uplift has been measured.

### Accomplishments

The public prototype completes packing, constrained repair, inventory import and source-labeled export. All 54 automated checks pass, including independent brute-force comparisons of the allocator, CSV handling, Qloo error boundaries and MCP contracts. Production build and TypeScript checks pass. Browser checks cover locking, stock-out repair, stale exports, conflicting pins, dialog keyboard access, inline errors and mobile layout.

### What is next

Validate real Qloo entity mappings and restricted rankings, provide a reviewed starter catalogue for a quick live judge walkthrough, and verify a live external-tool planning call. Then evaluate the workflow with booksellers who actually prepare simultaneous off-site stalls. Report results and failures before making impact claims.

Developed by Ajnas N B.

## Built with

TypeScript, React, Vinext, Vite, Cloudflare Workers, Qloo API adapter, Model Context Protocol. Qloo live access remains pending; no language model is called by this version.

## Links

- Working prototype: https://crate-books-ajnas.foamythyme32.chatgpt.site
- Public source: https://github.com/AjnasNB/crate-qloo
- License: MIT, visible in the public repository.
- Proposed screenshot: the source-labeled packing view. Do not label a synthetic screenshot as live Qloo evidence.

## Final submission checklist

- Successful live hosted Qloo search, entity confirmation, candidate-restricted ranking and allocation.
- Reviewed starter mappings, useful differences between programmes and a credible non-adaptation selection.
- One successful live external MCP planning call, followed by stock-safe repair.
- Public app and source remain available; license is recognized; instructions match the deployed version.
- Replace the pending-status paragraph only with actual results. Save and verify the Devpost draft, then complete the final submission using the authorized eligibility confirmation.
