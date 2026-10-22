import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { registerHooks } from "node:module";
import ts from "typescript";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.endsWith("/lib/mcp.ts") && ["./planner", "./qloo"].includes(specifier)) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
} });
const { handleMcpRequest } = await import("../lib/mcp.ts");
const { serveDemoMedia } = await import("../lib/media.ts");

// Vinext's entry is virtual at build time; inject only its fetch boundary.
function worker(forward = async () => Response.json({ forwarded: true })) {
  const source = readFileSync(new URL("../worker.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const taskModule = { exports: {} };
  const context = vm.createContext({ module: taskModule, exports: taskModule.exports, Response, URL, require(name) {
    if (name === "./lib/media") return { serveDemoMedia };
    assert.equal(name, "vinext/server/fetch-handler");
    return { __esModule: true, default: { fetch: forward } };
  } });
  vm.runInContext(outputText, context);
  return taskModule.exports.default;
}

function request(path, body, headers = {}) {
  return new Request(`https://crate.example${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const native = (method) => ({ "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": method });

test("static, config and validated native discovery do not need the limiter", async () => {
  const entry = worker();
  for (const path of ["/", "/api/config", "/mcp"]) {
    assert.equal((await entry.fetch(request(path), {}, {})).status, 200);
  }
  for (const method of ["server/discover", "tools/list", "ping"]) {
    assert.equal((await entry.fetch(request("/mcp", { method }, native(method)), {}, {})).status, 200);
  }
});

test("REST, tool calls and legacy handshakes share the native IP limit", async () => {
  const keys = [];
  const env = { QLOO_RATE_LIMITER: { async limit({ key }) { keys.push(key); return { success: true }; } } };
  const body = { jsonrpc: "2.0", id: "original", method: "tools/call", params: { name: "crate_search_entity" } };
  const entry = worker(async (incoming) => { assert.deepEqual(await incoming.json(), body); return new Response(null, { status: 204 }); });
  for (const path of ["/api/search", "/api/evidence/", "/API/%73earch", "/mcp", "/api/mcp"]) {
    assert.equal((await entry.fetch(request(path, body, { "CF-Connecting-IP": "192.0.2.1" }), env, {})).status, 204);
  }
  assert.deepEqual(keys, Array(5).fill("crate:qloo:192.0.2.1"));
  const defaultEntry = worker();
  await defaultEntry.fetch(request("/mcp", { method: "initialize" }), env, {});
  await defaultEntry.fetch(request("/api/search", {}), env, {});
  assert.deepEqual(keys.slice(-2), ["crate:qloo:unknown-client", "crate:qloo:unknown-client"]);
});

test("spoofing native discovery headers cannot invoke a tool", async () => {
  const entry = worker((incoming) => handleMcpRequest(incoming));
  const body = { jsonrpc: "2.0", id: 1, method: "tools/call", params: {
    name: "crate_search_entity", arguments: { query: "test", type: "book" },
    _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} },
  } };
  const response = await entry.fetch(request("/mcp", body, { ...native("tools/list"), Accept: "application/json, text/event-stream" }), {}, {});
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, -32020);
});

test("denial is a 429 transport response without reading or cloning the body", async () => {
  let forwarded = false;
  const entry = worker(async () => { forwarded = true; return new Response(); });
  const incoming = request("/mcp", { data: "x".repeat(40_000) }, { "Content-Length": "50000" });
  Object.defineProperty(incoming, "clone", { value() { throw new Error("must not clone"); } });
  const response = await entry.fetch(incoming, { QLOO_RATE_LIMITER: { async limit() { return { success: false }; } } }, {});
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.json()).error.code, "RATE_LIMITED");
  assert.equal(incoming.bodyUsed, false);
  assert.equal(forwarded, false);
});

test("allowed oversized MCP reaches its existing parser without a tee cancellation hang", { timeout: 3000 }, async () => {
  let limited = 0;
  const incoming = request("/mcp", { data: "x".repeat(40_000) }, {
    "Content-Length": "50000", Accept: "application/json, text/event-stream",
  });
  Object.defineProperty(incoming, "clone", { value() { throw new Error("must not clone"); } });
  const entry = worker((original) => {
    assert.equal(original, incoming);
    assert.equal(original.bodyUsed, false);
    return handleMcpRequest(original);
  });
  const response = await entry.fetch(incoming, { QLOO_RATE_LIMITER: { async limit() { limited++; return { success: true }; } } }, {});
  assert.equal(limited, 1);
  assert.equal(response.status, 413);
});

test("missing or failing limiter fails closed with an explicit 503", async () => {
  const entry = worker(async () => { throw new Error("must not forward"); });
  for (const env of [{}, { QLOO_RATE_LIMITER: { async limit() { throw new Error("binding failed"); } } }]) {
    for (const path of ["/api/evidence", "/mcp"]) {
      const response = await entry.fetch(request(path, {}), env, {});
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("Retry-After"), "60");
      assert.equal((await response.json()).error.code, "RATE_LIMIT_UNAVAILABLE");
    }
  }
});
