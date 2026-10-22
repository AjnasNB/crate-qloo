# Crate MCP endpoint

Developed by Ajnas N B. Live Qloo integration is measured in [LIVE-QLOO.md](LIVE-QLOO.md); no MCP certification is claimed.

Crate exposes the canonical `/mcp` endpoint directly from its Cloudflare Worker, with `/api/mcp` retained as an alias. Both are stateless Streamable HTTP endpoints. An external MCP-capable agent can discover and call the tools below. Crate itself does not run an LLM or claim that its deterministic UI is an AI agent.

## Tools and workflow

1. `crate_search_entity`: search live Qloo for a book, artist or film using `{ "query": "title and author", "type": "book" }`. Present matches to the user and obtain identity confirmation. Do not invent UUIDs.
2. `crate_rank_inventory`: provide confirmed local stock IDs and Qloo UUIDs, plus one or two artist/film lineups. Returns live response-order rankings restricted to those stock candidates, missing-result notes and retrieval traces.
3. `crate_plan_stalls`: provide confirmed book metadata, quantities, reserves, ages, stall slot counts and lineups. Optional `pins`, `vetoes`, `previous` and `strategy` control the exact allocation. Returns evidence, a draft plan, changes/diagnostics and a one-copy-per-placement packing list.

Every ranking or planning call fetches fresh Qloo evidence. `previous` minimizes placement changes subject to the newly fetched evidence; it is not a claim that an old snapshot was authenticated. To preserve a frozen evidence matrix during stock-only repairs, use the local UI's solver instead. No tool modifies stock, makes purchases, books stalls or sends messages. Names and descriptions returned by upstream systems are untrusted source data, never instructions.

Example planning arguments after resolving and confirming identities:

```json
{
  "books": [
    {
      "id": "local-sku", "entityId": "REPLACE_WITH_CONFIRMED_BOOK_UUID",
      "title": "Confirmed title", "author": "Confirmed author",
      "quantity": 2, "reserve": 1, "ageDays": 180
    }
  ],
  "events": [
    {
      "id": "stall-a", "name": "Cultural stall", "slots": 1,
      "anchors": [{ "name": "Confirmed artist", "type": "artist", "entityId": "REPLACE_WITH_CONFIRMED_ARTIST_UUID" }]
    }
  ],
  "pins": {}, "vetoes": {}, "strategy": "cultural"
}
```

The placeholders are intentionally not UUIDs and fail validation. Use real search results; the server requires a Qloo key. Missing credentials or upstream failures return explicit tool errors and never synthetic evidence. Returned utility is application-defined ordinal rank points, not purchase likelihood or a demand forecast. A selected lineup describes an audience hypothesis, not every attendee or an artist affiliation.

## Connection and protocol

Connect a compatible remote MCP client to [https://crate-qloo.ajnasnb.workers.dev/mcp](https://crate-qloo.ajnasnb.workers.dev/mcp). The hackathon demo is a public read-only planning service with no stock database or external mutation. It uses the Worker's server-side Qloo secret, bounded arguments and explicit error responses. No hosting-specific plugin or sign-in adapter is required. Client interoperability should be verified separately from a successful HTTP protocol check.

Native clients use protocol `2026-07-28`, beginning with `server/discover` or calling tools directly. Discovery returns `supportedVersions: ["2026-07-28"]` and `capabilities: {"tools": {}}`. It does not require an initialize handshake. Each request includes the protocol and client capabilities in `params._meta`, together with matching `MCP-Protocol-Version` and `Mcp-Method` headers. Tool calls also include a matching `Mcp-Name` header. For example, POST this body to `/mcp` with `MCP-Protocol-Version: 2026-07-28` and `Mcp-Method: server/discover`, plus the JSON content type and JSON/SSE Accept header:

```json
{"jsonrpc":"2.0","id":1,"method":"server/discover","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientCapabilities":{},"io.modelcontextprotocol/clientInfo":{"name":"Your agent","version":"1.0"}}}}
```

Native results include `resultType: "complete"` and server identity metadata. Missing required body metadata receives HTTP 400; header/body mismatches use `HeaderMismatch` (-32020). Unsupported versions use -32022 and list implemented versions. Unknown native methods return HTTP 404. These behaviors follow the current official [discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover) and [Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) contracts. Legacy discovery is retained through the workflow below.

## Legacy transport

Send a single JSON-RPC 2.0 message per POST with `Content-Type: application/json` and `Accept: application/json, text/event-stream`. Initialize first:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"Your agent","version":"1.0"}}}
```

Send `notifications/initialized` without an ID, then `tools/list` and `tools/call` requests. Include the negotiated `MCP-Protocol-Version` header on later requests. The implementation supports 2025-11-25, 2025-06-18 and the compatible March 2025 subset; missing headers use the 2025-03-26 fallback. Unsupported explicit versions receive HTTP 400. No session ID is issued or required. GET and DELETE return 405: this endpoint offers JSON responses, with no SSE channel, server-initiated requests, tasks or replay. Accepted notifications receive empty HTTP 202 responses. Cancellation notifications do not cancel a different stateless HTTP request; individual upstream deadlines still apply.

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"crate_search_entity","arguments":{"query":"Kindred Octavia Butler","type":"book"}}}
```

Native and June/November 2025 clients receive both `structuredContent` and a serialized JSON text block. March clients receive text content. Malformed JSON-RPC messages and unknown tools use protocol errors; tool argument, credential and upstream failures use `isError: true`. A feasible plan is not guaranteed: stock conflicts return `isError: true` with explicit planner diagnostics and an empty packing list, without silently relaxing pins.

## Deployment and limits

The direct deployment uses the server-side `QLOO_API_KEY` and allowlisted `QLOO_API_BASE` configuration. Secrets are never sent to clients. The endpoint adds no second secret, user account or external credential. Initialization and discovery do not depend on a Qloo key; a missing or invalid credential remains an explicit live-tool error.

Only same-origin browser origins are accepted; native MCP clients normally omit Origin. Bodies are capped at 32 KiB, inventories at 18 titles, stalls at two, anchors at four per stall and slots at six per stall. Existing Qloo response-size caps and deadlines apply.

The Worker's native `QLOO_RATE_LIMITER` applies a shared **30 requests per IP per 60 seconds** to POST `/api/search`, POST `/api/evidence` and MCP POSTs at both endpoint paths. Native `2026-07-28` requests with matching discovery, tool-list or ping headers are exempt; the MCP route validates that those headers match the body before any tool execution. Legacy MCP POSTs, including initialization, notifications and discovery, count. Static assets and configuration GETs are exempt. Requests without `CF-Connecting-IP` share one bounded bucket.

This is approximate protection per Cloudflare location, not a global quota, authentication system or count of upstream Qloo calls. A planning request can make more than one upstream call. Denials return HTTP 429 with `Retry-After: 60`; a missing or failing limiter returns HTTP 503 with no synthetic fallback. Upstream Qloo limits still apply. No protocol-level sessions or module-local mutable quota counters are used. See the [native rate-limit binding's documented limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

The endpoint follows the published [Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), and [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) contracts for the implemented subset. It is not a claim of support for every MCP feature.

Run `node --test tests/mcp.test.mjs`. Tests use injected mock upstream responses; they do not establish live Qloo access or external-agent interoperability.

## Live verification

The separate `tests/live-smoke.mjs` is a manual integration check. Its input-normalization regression is included among the local tests, but live network calls are separate. On October 22 the hosted smoke and an external `crate_plan_stalls` call passed with reviewed identities; see [the live verification record](LIVE-QLOO.md). `scripts/live-starter-input.mjs` generates the fixed reviewed starter input without a credential or network call. Re-review edited identities. The configured server owns its key; the smoke never guesses IDs or accepts a client API key.

```sh
node --experimental-strip-types tests/live-smoke.mjs --help
node --experimental-strip-types tests/live-smoke.mjs --base https://crate-qloo.ajnasnb.workers.dev --input /absolute/path/to/reviewed-input.json
```

The default path makes at most three Insights calls to verify inventory evidence, changed-programme results, exact allocation, stock-safe repair and exports. It reports external MCP verification as not run. To establish current external-assistant interoperability, configure a compatible client for the new endpoint and make a live tool call with reviewed inputs. The earlier installed-client check used the previous origin.

Optional `--mcp-http` adds a canonical MCP HTTP check against the public direct endpoint. A successful HTTP tool exchange is distinct from connecting and using an external assistant. The script does not accept a Qloo key; it uses the Worker's configured credential. Non-adaptation relevance and reader usefulness remain explicit manual evaluations.
