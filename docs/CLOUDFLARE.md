# Direct Cloudflare deployment — October 22, 2026

Developed by Ajnas N B

Public app: **https://crate-qloo.ajnasnb.workers.dev**. Worker: `crate-qloo`. Initial application source: `8df452b`. Initial version: `ca3a7571-c767-4f6a-9458-1285a45a48b5`; the first version after securely configuring the existing Qloo server secret is `af52090d-269d-4604-a2e5-14af7417f042`, deployed at 07:36:41 UTC. No key is stored in source, client assets or this record.

## Current motion-film release

The active version is **57f55a99-10cb-4947-9514-31462a49c05a**, from application source **0c888d3**. [Watch the rendered film](https://crate-qloo.ajnasnb.workers.dev/demo). The film source is 70ae134 and the frozen rendered release is [v0.3.0-live-motion](https://github.com/AjnasNB/crate-qloo/releases/tag/v0.3.0-live-motion). Current source, video and verification are published without credentials.

All **79 tests** pass, including ten new media regressions. TypeScript, targeted lint and the production build pass. The actual local Workers runtime and the public Worker return exact prefix, middle, suffix and open-ended bytes as 206 with correct Content-Length; unsatisfiable requests return 416, mismatched strong If-Range receives 200, and conditional retrieval receives 304. HEAD is bodyless; the native asset binding omits its optional length. The early asset-first delivery ignored Range. The fix routes only this MP4 through a bounded stream and FixedLengthStream, cancelling upstream after the requested bytes. Late seeks still read/discard the preceding internal asset stream; this is not storage-level seeking. [Measured record](RELEASE-OCT22.json).

The 17,455,515-byte MP4 fetched from GitHub and Cloudflare matches SHA-256 db971723683eb6ae3f8bb0865f025fe9926566e453c1f7a5fc990b7746763db8. Poster and caption bytes also match. Full hosted playback of those bytes reached 33.166667 seconds, 1920×1080, with visible English captions, unmuted audio and no media error. Framework Link prefetch and navigation failures were found in the browser; two full-document links now return to the packing desk successfully. A fresh final-deployment browser then packed eight placements from live Qloo, both 12/12 profiles, snapshot **2026-10-22T09:21:25.863Z**, with no new console errors. The unchanged MCP HTTP and changed-programme smoke also passed after adding the media wrapper.

One Wrangler deploy reported completion-token-already-consumed after creating version c1afaae4-d1f7-4546-b6ea-9870fe929c0d. Listing versions and deployments distinguished a completed upload from activation; the existing upload was activated directly. The final navigation-only release used explicit version upload and 100% activation successfully. No Qloo key was reread or republished.

Devpost was saved, reopened and publicly verified with the current film, real-plan export/PDF checks and 79-test statement. It remains **Submitted, 5/5 complete** with sole credit Ajnas N B. Both embedded story images loaded, both watch links target the direct Cloudflare player, and the exact saved story matches DEVPOST-LIVE.json. Owned browser tabs and local film/app preview servers were closed. Native Chrome Save/Print dialogs, physical printing and customer outcomes remain outside these verification claims.

## Runtime and reproducibility

React, TypeScript and Vinext build through the official Cloudflare Vite plugin. `worker.ts` wraps the Vinext handler; `ASSETS` serves the client bundle. There is no application database, sign-in gateway or external connector dependency. The compatibility date remains `2026-05-15`, matching the installed and tested local runtime.

Run `npm ci`, `npm test`, `npm run typecheck`, `npm run build` and `npm run deploy:dry-run`. After setting your own account ID and Worker name in `wrangler.jsonc`, build again and run `npm run deploy`. Configure `QLOO_API_KEY` with Wrangler's interactive secret prompt using `dist/server/wrangler.json`. Local development uses an ignored `.dev.vars` file. Never commit credentials or prefix them with `NEXT_PUBLIC_`.

The initial pre-film build passed **69 tests**, TypeScript, targeted lint and Wrangler dry-run. Upload size was 829.35 KiB, 243.49 KiB gzip. The bundle binds only static assets and the native rate limiter.

## Verified on this origin

The live smoke used reviewed starter identities and real Qloo calls. Both profiles returned 12/12 inventory titles. Replacing A's interests with Amélie changed returned ranks and packed choices. The direct `/mcp` HTTP handshake, discovery and planning checks passed. This is HTTP integration evidence; it is separate from the earlier installed-client interoperability check.

Initial allocation: A `b7,b3,b2,b5`; B `b8,b7,b10,b6`. Changed programme: A `b10,b5,b6,b3`; B `b8,b7,b10,b5`. The locked-B stock-out repair produced A `b7,b2,b5,b1` with B unchanged. Stock, reserves and manifest checks passed.

A fresh public browser independently retrieved live evidence at **07:37:24.327 UTC**, packed eight placements, disabled the manifest and rendered zero print rows after a stock change, then repaired A while keeping B unchanged. Repaired printing contained eight rows and retained the original snapshot time. The actual JSON link matched the expanded visible snapshot byte for byte. No browser console errors were observed. Files and screenshots remain outside Git; see [export verification](EXPORT-QA.md).

## Abuse controls and limits

Cloudflare's native binding permits approximately **30 credential-consuming requests per client IP per 60 seconds at each location**. REST search/evidence and MCP tool POSTs share the bucket. Legacy MCP POST handshakes also count. Valid native discovery, tool-list and ping headers are exempt; header/body mismatches still fail validation before Qloo. Missing or failed limiter bindings fail closed with 503; denial returns 429 and `Retry-After: 60`. Six Worker tests cover these boundaries and oversized-body handling.

This is neither authentication nor a global Qloo quota. Multiple IPs/locations can consume additional calls; a plan can fetch two profiles. Upstream quota/exhaustion and real distributed abuse were not induced. Customer adoption, reader relevance, time savings and sales effects remain unmeasured. Native browser file saving, Chrome Save as PDF and physical printing remain unverified.

## Submission and previous host

The existing [Devpost submission](https://devpost.com/software/crate-6jkox0) was updated after these live checks. Its public try-it link, story and judge-facing application URL now point to this Worker. The exact story was reopened and matched the prepared file; the public evidence image loaded, the initial 69-check statement and sole developer credit were present, and the finalization page retained **Submitted, 5/5 steps complete**. The GitHub repository homepage also points to this Worker.

After the new app and Devpost links were verified, public access to the previous host was removed. A fresh access-policy read confirmed owner-only access, no external visitors or groups. No new deployment was published there.
