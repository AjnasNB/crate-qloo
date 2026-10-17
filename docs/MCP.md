# Crate MCP endpoint

Developed by Ajnas N B. Experimental implementation; no MCP certification or live-Qloo validation is claimed.

Crate exposes `/api/mcp` on its deployment origin as a stateless Streamable HTTP endpoint. An external MCP-capable language-model agent can discover and call the tools below. Crate itself does not run an LLM or claim that its deterministic UI is an AI agent.

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

## Transport

Send a single JSON-RPC 2.0 message per POST with `Content-Type: application/json` and `Accept: application/json, text/event-stream`. Initialize first:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"Your agent","version":"1.0"}}}
```

Send `notifications/initialized` without an ID, then `tools/list` and `tools/call` requests. Include the negotiated `MCP-Protocol-Version` header on later requests. The implementation supports 2025-11-25, 2025-06-18 and the compatible March 2025 subset; missing headers use the 2025-03-26 fallback. Unsupported explicit versions receive HTTP 400. No session ID is issued or required. GET and DELETE return 405: this endpoint offers JSON responses, with no SSE channel, server-initiated requests, tasks or replay. Accepted notifications receive empty HTTP 202 responses. Cancellation notifications do not cancel a different stateless HTTP request; individual upstream deadlines still apply.

```json
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"crate_search_entity","arguments":{"query":"Kindred Octavia Butler","type":"book"}}}
```

Modern clients receive both `structuredContent` and a serialized JSON text block. March clients receive text content. Malformed JSON-RPC messages and unknown tools use protocol errors; tool argument, credential and upstream failures use `isError: true`. A feasible plan is not guaranteed: stock conflicts return `isError: true` with explicit planner diagnostics and an empty packing list, without silently relaxing pins.

## Deployment and limits

The existing server `QLOO_API_KEY` and allowlisted `QLOO_API_BASE` configuration are reused. Secrets are never sent to clients. The endpoint adds no second secret, user account or external credential. Initialization and discovery work before the Qloo key arrives; live tools remain unavailable until it is configured.

Only same-origin browser origins are accepted; native MCP clients normally omit Origin. Bodies are capped at 32 KiB, inventories at 18 titles, stalls at two, anchors at four per stall and slots at six per stall. Existing Qloo response-size caps and deadlines apply. This public experimental endpoint has no authenticated sessions or durable global quota counter. Deployment-level abuse/rate controls and upstream hard quotas must be configured before unrestricted public live use; a module-local counter would not supply that guarantee.

The endpoint follows the published [Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), and [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) contracts for the implemented subset. It is not a claim of support for every MCP feature.

Run `node --test tests/mcp.test.mjs`. Tests use injected mock upstream responses; they do not establish live Qloo access or external-agent interoperability.
