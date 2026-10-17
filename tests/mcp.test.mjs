import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

// Production uses the bundler's extensionless imports. Native Node TS tests need
// resolution for the two local runtime imports only; no compiled test build.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.endsWith("/lib/mcp.ts") && ["./planner", "./qloo"].includes(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { handleMcpRequest, MCP_TOOLS } = await import("../lib/mcp.ts");

const key = "test-secret-never-returned";
const config = { apiKey: key, host: "https://hackathon.api.qloo.com" };
const noKey = { config: { ...config, apiKey: "" } };
const ids = ["10000000-0000-4000-8000-000000000001", "10000000-0000-4000-8000-000000000002", "10000000-0000-4000-8000-000000000003"];
const anchorId = "20000000-0000-4000-8000-000000000001";
const envelope = (method, params = {}, id = 1) => ({ jsonrpc: "2.0", id, method, params });
function request(body, headers = {}, method = "POST") {
  return new Request("https://crate.example/api/mcp", { method, headers: {
    Accept: "application/json, text/event-stream", "Content-Type": "application/json", "MCP-Protocol-Version": "2025-11-25", ...headers,
  }, ...(method === "POST" ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
}
const invoke = (body, dependencies = noKey, headers = {}) => handleMcpRequest(request(body, headers), dependencies);
const decode = async (response) => ({ status: response.status, body: await response.json() });
const call = (name, args) => envelope("tools/call", { name, arguments: args });
const rankArgs = () => ({ books: ids.map((entityId, i) => ({ id: `b${i}`, entityId })), events: [{ id: "a", anchors: [{ name: "Confirmed artist", type: "artist", entityId: anchorId }] }] });
const planArgs = () => ({
  books: ids.map((entityId, i) => ({ id: `b${i}`, entityId, title: `Title ${i}`, author: "Author", quantity: 1, reserve: 0, ageDays: 20 + i })),
  events: [{ id: "a", name: "Stall A", slots: 1, anchors: [{ name: "Confirmed artist", type: "artist", entityId: anchorId }] }],
});
const upstreamRow = (entityId, type = "book") => ({ entity_id: entityId, name: "An actual mock response", type: "urn:entity", subtype: `urn:entity:${type}` });
function liveDependencies() {
  const calls = [];
  return { calls, config, runtime: { now: () => new Date("2026-10-17T00:00:00Z"), fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    assert.equal(options.headers["X-Api-Key"], key);
    const body = new URL(url).pathname === "/search"
      ? { results: [upstreamRow(ids[0])] }
      : { success: true, results: { entities: ids.map((id) => upstreamRow(id)) } };
    return Response.json(body);
  } } };
}

test("initialize negotiates versions and declares only implemented tools", async () => {
  const params = { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "Test agent", version: "1" } };
  const { status, body } = await decode(await invoke(envelope("initialize", params, "init")));
  assert.equal(status, 200);
  assert.equal(body.id, "init");
  assert.equal(body.result.protocolVersion, "2025-11-25");
  assert.deepEqual(body.result.capabilities, { tools: { listChanged: false } });
  const fallback = await (await invoke(envelope("initialize", { ...params, protocolVersion: "2099-01-01" }))).json();
  assert.equal(fallback.result.protocolVersion, "2025-11-25");
  const older = await (await invoke(envelope("initialize", { ...params, protocolVersion: "2025-03-26" }))).json();
  assert.equal(older.result.protocolVersion, "2025-03-26");
  assert.equal((await (await invoke(envelope("initialize", {}))).json()).error.code, -32602);
});

test("initialized and cancellation notifications return empty 202; ping returns an object", async () => {
  for (const method of ["notifications/initialized", "notifications/cancelled"]) {
    const response = await invoke({ jsonrpc: "2.0", method, params: {} });
    assert.equal(response.status, 202);
    assert.equal(await response.text(), "");
  }
  const response = await invoke(envelope("ping", {}, 0));
  assert.deepEqual(await response.json(), { jsonrpc: "2.0", id: 0, result: {} });
});

test("transport rejects foreign origins, wrong Accept, unsupported versions and oversized JSON", async () => {
  assert.equal((await invoke(envelope("ping"), noKey, { Origin: "https://evil.example" })).status, 403);
  assert.equal((await invoke(envelope("ping"), noKey, { Accept: "application/json" })).status, 406);
  assert.equal((await invoke(envelope("ping"), noKey, { Accept: "application/json;q=0,text/event-stream" })).status, 406);
  assert.equal((await invoke(envelope("ping"), noKey, { "MCP-Protocol-Version": "invalid" })).status, 400);
  assert.equal((await invoke(envelope("ping"), noKey, { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await invoke("x".repeat(32769))).status, 413);
  const get = await handleMcpRequest(request(undefined, {}, "GET"), noKey);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("Allow"), "POST");
  assert.equal(get.headers.get("MCP-Session-Id"), null);
});

test("malformed envelopes and unknown methods/tools produce JSON-RPC errors", async () => {
  assert.equal((await (await invoke("not-json")).json()).error.code, -32700);
  for (const body of [[], [{ jsonrpc: "2.0", id: 1, method: "ping" }], { jsonrpc: "1.0", id: 1, method: "ping" }, { jsonrpc: "2.0", id: null, method: "ping" }, { jsonrpc: "2.0", method: "tools/call" }])
    assert.equal((await invoke(body)).status, 400);
  assert.equal((await (await invoke(envelope("missing"))).json()).error.code, -32601);
  assert.equal((await (await invoke(call("missing_tool", {}))).json()).error.code, -32602);
  assert.equal((await (await invoke(envelope("tools/call", { name: "crate_search_entity", arguments: [] }))).json()).error.code, -32602);
});

test("tool list exposes exactly three live read-only tools without requiring a key", async () => {
  const body = await (await invoke(envelope("tools/list"))).json();
  assert.deepEqual(body.result.tools.map((tool) => tool.name), ["crate_search_entity", "crate_rank_inventory", "crate_plan_stalls"]);
  for (const tool of MCP_TOOLS) assert.equal(tool.annotations.readOnlyHint, true);
  assert.ok(!JSON.stringify(body).includes(key));
});

test("missing live key is a tool execution error, never synthetic evidence", async () => {
  for (const [name, args] of [["crate_search_entity", { query: "Title", type: "book" }], ["crate_rank_inventory", rankArgs()], ["crate_plan_stalls", planArgs()]]) {
    const { status, body } = await decode(await invoke(call(name, args)));
    assert.equal(status, 200);
    assert.equal(body.result.isError, true);
    assert.equal(body.result.structuredContent.error.code, "QLOO_NOT_CONFIGURED");
    assert.ok(!JSON.stringify(body).includes('"mode":"synthetic"'));
  }
});

test("invalid tool metadata fails before upstream I/O and returns self-correctable feedback", async () => {
  const dependencies = liveDependencies();
  const args = planArgs();
  args.books[0].quantity = -1;
  const body = await (await invoke(call("crate_plan_stalls", args), dependencies)).json();
  assert.equal(body.result.isError, true);
  assert.equal(body.result.structuredContent.error.code, "INVALID_INPUT");
  assert.equal(dependencies.calls.length, 0);
  const unknown = await (await invoke(call("crate_plan_stalls", { ...planArgs(), pins: { a: ["not-stocked"] } }), dependencies)).json();
  assert.equal(unknown.result.isError, true);
  assert.equal(dependencies.calls.length, 0);
});

test("mocked live tools search, rank and allocate through the same public HTTP contract", async () => {
  const dependencies = liveDependencies();
  const search = await (await invoke(call("crate_search_entity", { query: "A title", type: "book" }), dependencies)).json();
  assert.equal(search.result.isError, false);
  assert.equal(search.result.structuredContent.entities[0].entityId, ids[0]);
  const ranked = await (await invoke(call("crate_rank_inventory", rankArgs()), dependencies)).json();
  assert.equal(ranked.result.structuredContent.mode, "qloo");
  assert.deepEqual(ranked.result.structuredContent.profiles.a.orderedIds, ["b0", "b1", "b2"]);
  const planned = await (await invoke(call("crate_plan_stalls", planArgs()), dependencies)).json();
  assert.equal(planned.result.isError, false);
  assert.equal(planned.result.structuredContent.plan.feasible, true);
  assert.deepEqual(planned.result.structuredContent.plan.assignments, { a: ["b0"] });
  assert.equal(planned.result.structuredContent.packingList[0].books[0].copies, 1);
  assert.ok(!JSON.stringify(planned).includes(key));
  assert.ok(dependencies.calls.every((entry) => entry.options.redirect === "error"));
});

test("repair requests refresh evidence and preserve feasible old assignments before utility", async () => {
  const dependencies = liveDependencies();
  const args = { ...planArgs(), previous: { a: ["b1"] } };
  const result = await (await invoke(call("crate_plan_stalls", args), dependencies)).json();
  assert.deepEqual(result.result.structuredContent.plan.assignments, { a: ["b1"] });
  assert.equal(result.result.structuredContent.plan.changeCount, 0);
  assert.equal(dependencies.calls.length, 1);
});

test("infeasible constraints return a tool error containing planner diagnostics and no packing instructions", async () => {
  const dependencies = liveDependencies();
  const args = planArgs();
  args.books[0].quantity = 0;
  args.pins = { a: ["b0"] };
  const result = await (await invoke(call("crate_plan_stalls", args), dependencies)).json();
  assert.equal(result.result.isError, true);
  assert.equal(result.result.structuredContent.plan.feasible, false);
  assert.ok(result.result.structuredContent.plan.diagnostics.length > 0);
  assert.deepEqual(result.result.structuredContent.packingList, []);
});

test("March fallback omits newer structuredContent while retaining text tool results", async () => {
  const message = call("crate_search_entity", { query: "Title", type: "book" });
  const req = request(message);
  req.headers.delete("MCP-Protocol-Version");
  const body = await (await handleMcpRequest(req, noKey)).json();
  assert.equal(body.result.structuredContent, undefined);
  assert.equal(JSON.parse(body.result.content[0].text).error.code, "QLOO_NOT_CONFIGURED");
});
