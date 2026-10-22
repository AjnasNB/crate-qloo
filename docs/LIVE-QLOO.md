# Live Qloo verification — October 22, 2026

Developed by Ajnas N B

**Live integration passed.** The issued hackathon credential is stored as a hosted server secret. It is absent from source, client assets, reports and test inputs. The deployed public application is Site version 8, source `1b470a1726936a90fe10e9ab5b7e3adfe9e27e04`. Later presentation and documentation commits do not change that runtime.

## Failure found and corrected

The configured key initially appeared unusable because the adapter set `redirect: "error"`. Cloudflare rejects that option during Request construction, before network I/O. A local Miniflare reproduction using the app's `2026-05-15` compatibility date produced that TypeError, while `manual` constructed successfully. The adapter now uses manual mode and rejects non-success responses without following their Location. Regression checks cover 301/302/303/307/308 and a single credential-bearing request to the approved origin.

Implementation: `9d04b2f`. The complete 58-test suite, TypeScript and production build pass. These local checks are separate from the live observations below. [Cloudflare Request contract](https://developers.cloudflare.com/workers/runtime-apis/request/#parameters).

## Observed live results

| Check | Result |
| --- | --- |
| Hosted search | HTTP 200 from `/api/search` through `https://hackathon.api.qloo.com`; Kindred returned Octavia E. Butler's 1979 work. |
| Identity review | Twelve book/author pairs, four programme anchors and the changed film Amélie reviewed from typed live searches. Public UUIDs are in `lib/sample.ts` and the starter smoke input generator. |
| Inventory-restricted Insights | Both initial programmes returned 12/12 candidates. Trace candidate and signal parameters matched the supplied UUIDs; response hashes and retrieval times were present. No synthetic fallback. |
| Programme sensitivity | The manual live smoke replaced A's interests with Amélie. Both the returned order and resulting assignments changed. |
| Native external tool | Installed `crate_plan_stalls` fetched fresh live evidence and returned a feasible eight-placement plan with matching stock-safe packing instructions. |
| Public UI | Use live Qloo → Pack the stalls produced eight placements without manual starter lookups. |
| Public repair | Locked Soul & City, set The Dispossessed to zero, and repaired A by replacing it with Kindred. B's four titles stayed exactly unchanged. Two changed placements mean one removal and one addition. Exports were disabled while stale and re-enabled after repair. |
| Public programme edit | Live search confirmed Amélie (2001). Replacing A's film refreshed one programme, retained B's evidence and protected crate, and changed A's packed titles. |
| Source and layout | Both evidence lists showed 12/12 returned titles. Print DOM contained the live source and snapshot time. Narrow-screen entry controls stayed within the viewport; browser console errors were empty. |

The native call at 06:18:23 UTC returned:

- A: If Beale Street Could Talk; The Dispossessed; Parable of the Sower; The Lathe of Heaven.
- B: Beloved; If Beale Street Could Talk; Never Let Me Go; Giovanni’s Room.
- Response hashes: A `e33b216658ad53f2bdeababde5b4ff7cbdc145b2cdc0f958bca7e731de4935e9`; B `9c4621155c72c40987b9a1df449cb7104403092d77ce34fcb1e6892f3616860d`.

These are within-query orders, not probabilities. The Dispossessed in a film/music-anchored inventory demonstrates cross-domain retrieval; reader usefulness and the contribution of each individual anchor have not been established.

## Identity scope and reproduction

The selected search results matched displayed title/author or artist/film identity. Duplicate work records appeared for The Left Hand of Darkness, Giovanni’s Room and Station Eleven. The chosen UUIDs identify the matching works; no ISBN-specific edition identity is certified. Imported stock and edited programme names require new confirmation. No raw upstream descriptions or private data are committed.

Create an ignored `outputs/` directory, then run from the repository:

```sh
node --experimental-strip-types scripts/live-starter-input.mjs > outputs/live-input.json
node --experimental-strip-types tests/live-smoke.mjs --base https://crate-books-ajnas.foamythyme32.chatgpt.site --input outputs/live-input.json
```

The generator makes no API call and contains no key. The smoke consumes at most three Insights calls. Re-review changed identities before use. Run native MCP planning separately through an authorized installed client; the anonymous `/mcp` OAuth boundary is not a Qloo failure and must not be bypassed.

## Limits and submission

A browser manifest-download event timed out, so completed browser download is not verified. CSV content/constraints pass automated checks; print DOM was inspected, but physical printing was not tested. Real rate-limit, quota-exhaustion and outage incidents were not induced. The older narrated motion release illustrates the labeled synthetic prototype and does not prove the newer live integration.

Sample events, quantities, prices and shelf ages remain fictional. No customer adoption, reader acceptance, time savings, sales uplift, organizer approval or winning probability is claimed. [Public live evidence illustration](assets/crate-live-qloo.png).

The existing Devpost update is prepared with these measured results. Browser reconnection is required to save and verify it; the submitted entry has not yet been relabeled as live by this document.
