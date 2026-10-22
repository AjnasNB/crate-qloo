import assert from "node:assert/strict";
import test, { after } from "node:test";
import { parseMediaRange, serveDemoMedia } from "../lib/media.ts";

// Node has no Workers FixedLengthStream. Enforce its byte-count contract;
// root also verifies this helper in the actual Workers runtime before release.
const originalFixed = globalThis.FixedLengthStream;
const fixedLengths = [];
globalThis.FixedLengthStream = class {
  constructor(expected) {
    fixedLengths.push(expected);
    let written = 0;
    const stream = new TransformStream({
      transform(chunk, controller) {
        written += chunk.byteLength;
        if (written > expected) throw new Error("Fixed stream overflow");
        controller.enqueue(chunk);
      },
      flush() {
        if (written !== expected) throw new Error("Fixed stream underflow");
      },
    });
    this.readable = stream.readable;
    this.writable = stream.writable;
  }
};
after(() => {
  if (originalFixed === undefined) delete globalThis.FixedLengthStream;
  else globalThis.FixedLengthStream = originalFixed;
});

function source(bytes, { chunkSize = 2, declaredSize = bytes.length, status = 200, headers = {} } = {}) {
  const state = { pulls: 0, cancelled: false, reason: undefined };
  let offset = 0;
  const body = new ReadableStream({
    pull(controller) {
      state.pulls++;
      if (offset === bytes.length) return controller.close();
      controller.enqueue(bytes.subarray(offset, offset + chunkSize));
      offset = Math.min(offset + chunkSize, bytes.length);
    },
    cancel(reason) { state.cancelled = true; state.reason = reason; },
  }, { highWaterMark: 0 });
  body.tee = () => { throw new Error("must not tee"); };
  const response = new Response(body, { status, headers: {
    "Content-Type": "video/mp4", "Content-Length": String(declaredSize), ETag: '"film-v1"', ...headers,
  } });
  response.clone = () => { throw new Error("must not clone"); };
  response.arrayBuffer = () => { throw new Error("must not buffer upstream"); };
  return { state, response };
}

async function invoke(upstream, { range, ifRange, method = "GET", path = "/media/crate-live-demo.mp4", headers = {} } = {}) {
  const tasks = [], requests = [];
  const incomingHeaders = new Headers(headers);
  if (range !== undefined) incomingHeaders.set("Range", range);
  if (ifRange !== undefined) incomingHeaders.set("If-Range", ifRange);
  const request = new Request(`https://crate.example${path}`, { method, headers: incomingHeaders });
  const response = await serveDemoMedia(request, { async fetch(input) { requests.push(input); return upstream; } }, {
    waitUntil(promise) { tasks.push(promise); },
  });
  return { response, requests, finish: () => Promise.all(tasks) };
}

const bytes = Uint8Array.from({ length: 10 }, (_, i) => i);

test("single ranges return exact prefix, open-ended, suffix and clamped bytes", async () => {
  const cases = [
    ["bytes=0-2", 0, 2], ["bytes=4-", 4, 9], ["bytes=-3", 7, 9],
    ["bytes=8-999999999999999999999999", 8, 9],
    ["bytes=-999999999999999999999999", 0, 9], ["BYTES=0-0", 0, 0],
  ];
  for (const [range, start, end] of cases) {
    const upstream = source(bytes);
    const run = await invoke(upstream.response, { range });
    assert.equal(run.response.status, 206);
    assert.equal(run.response.headers.get("Content-Range"), `bytes ${start}-${end}/10`);
    assert.equal(run.response.headers.get("Content-Length"), String(end - start + 1));
    assert.equal(run.response.headers.get("Content-Type"), "video/mp4");
    assert.equal(run.response.headers.get("ETag"), '"film-v1"');
    assert.equal(run.response.headers.get("Accept-Ranges"), "bytes");
    assert.deepEqual(new Uint8Array(await run.response.arrayBuffer()), bytes.slice(start, end + 1));
    await run.finish();
    assert.equal(run.requests.length, 1);
    assert.equal(upstream.state.cancelled, true);
    assert.equal(fixedLengths.at(-1), end - start + 1);
  }
});

test("unsatisfiable ranges return empty 416 and cancel without reading the asset", async () => {
  for (const range of ["bytes=10-", "bytes=999999999999999999999999999-", "bytes=-0"]) {
    const upstream = source(bytes);
    const run = await invoke(upstream.response, { range });
    assert.equal(run.response.status, 416);
    assert.equal(run.response.headers.get("Content-Range"), "bytes */10");
    assert.equal(await run.response.text(), "");
    await run.finish();
    assert.equal(upstream.state.pulls, 0);
    assert.equal(upstream.state.cancelled, true);
  }
});

test("malformed, reversed, multipart and unknown units are ignored without consuming the response", async () => {
  for (const range of ["bytes=", "bytes=-", "bytes=4-2", "bytes=0-1,4-5", "items=0-1", "bytes=NaN-2", `bytes=${"9".repeat(600)}-`]) {
    const upstream = source(bytes);
    const run = await invoke(upstream.response, { range });
    assert.equal(run.response, upstream.response);
    assert.equal(upstream.state.pulls, 0);
    await upstream.response.body.cancel();
  }
  assert.equal(parseMediaRange("bytes=0-", 0), false);
});

test("only exact strong If-Range tags permit slicing; other validators return the full representation", async () => {
  for (const ifRange of ['"older-film"', 'W/"film-v1"', "Thu, 22 Oct 2026 07:37:24 GMT", "invalid"]) {
    const upstream = source(bytes, { headers: { "Last-Modified": "Thu, 22 Oct 2026 07:37:24 GMT" } });
    const run = await invoke(upstream.response, { range: "bytes=0-1", ifRange });
    assert.equal(run.response, upstream.response);
    assert.equal(upstream.state.pulls, 0);
    await upstream.response.body.cancel();
  }
  const upstream = source(bytes);
  const run = await invoke(upstream.response, { range: "bytes=0-1", ifRange: '"film-v1"' });
  assert.equal(run.response.status, 206);
  assert.deepEqual(new Uint8Array(await run.response.arrayBuffer()), bytes.slice(0, 2));
  await run.finish();
});

test("HEAD strips range headers and stays bodyless; other methods and URLs do not fetch assets", async () => {
  const upstream = new Response(null, { headers: { "Content-Length": "10", ETag: '"film-v1"' } });
  const run = await invoke(upstream, { method: "HEAD", range: "bytes=0-1", ifRange: '"film-v1"' });
  assert.equal(run.response.status, 200);
  assert.equal(run.response.body, null);
  assert.equal(run.requests[0].method, "HEAD");
  assert.equal(run.requests[0].headers.has("Range"), false);
  assert.equal(run.requests[0].headers.has("If-Range"), false);
  for (const options of [{ method: "POST" }, { path: "/media/other.mp4" }, { path: "/MEDIA/crate-live-demo.mp4" }]) {
    const ignored = await invoke(upstream, options);
    assert.equal(ignored.response, null);
    assert.equal(ignored.requests.length, 0);
  }
});

test("native 206, conditional 304 and asset errors pass through; conditional headers survive", async () => {
  for (const status of [206, 304, 404, 500]) {
    const upstream = new Response(null, { status });
    const run = await invoke(upstream, { range: "bytes=0-1", headers: { "If-None-Match": '"film-v1"' } });
    assert.equal(run.response, upstream);
    assert.equal(run.requests[0].headers.get("If-None-Match"), '"film-v1"');
  }
});

test("prefix stops early and consumer cancellation propagates through the fixed-length pipe", async () => {
  const prefix = source(new Uint8Array(100_000), { chunkSize: 1024 });
  const first = await invoke(prefix.response, { range: "bytes=0-2" });
  assert.equal((await first.response.arrayBuffer()).byteLength, 3);
  await first.finish();
  assert.equal(prefix.state.pulls, 1);
  assert.equal(prefix.state.cancelled, true);

  const interrupted = source(new Uint8Array(1_000_000), { chunkSize: 1024 });
  const second = await invoke(interrupted.response, { range: "bytes=0-999999" });
  const reader = second.response.body.getReader();
  assert.equal((await reader.read()).value.byteLength, 1024);
  await reader.cancel("player stopped");
  await second.finish();
  assert.equal(interrupted.state.cancelled, true);
  assert.equal(interrupted.state.reason, "player stopped");
  assert.ok(interrupted.state.pulls < 10, "must not eagerly read the full film");
});

test("short upstream fails the partial body instead of silently completing a false Content-Length", async () => {
  const upstream = source(Uint8Array.of(1, 2), { declaredSize: 10 });
  const run = await invoke(upstream.response, { range: "bytes=0-9" });
  assert.equal(run.response.status, 206);
  await assert.rejects(run.response.arrayBuffer(), /ended before|underflow/);
  await run.finish();
});

test("a large upstream chunk is emitted in bounded chunks without reading the rest", async () => {
  const upstream = source(new Uint8Array(1_000_000), { chunkSize: 500_000 });
  const run = await invoke(upstream.response, { range: "bytes=0-99999" });
  const reader = run.response.body.getReader();
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    assert.ok(value.byteLength <= 64 * 1024);
    received += value.byteLength;
  }
  await run.finish();
  assert.equal(received, 100_000);
  assert.equal(upstream.state.pulls, 1);
  assert.equal(upstream.state.cancelled, true);
});

test("missing size uses the verified release pin; invalid size or encoded representations are left intact", async () => {
  const pinned = source(bytes);
  pinned.response.headers.delete("Content-Length");
  const run = await invoke(pinned.response, { range: "bytes=0-1" });
  assert.equal(run.response.status, 206);
  assert.match(run.response.headers.get("Content-Range"), /^bytes 0-1\/\d+$/);
  assert.deepEqual(new Uint8Array(await run.response.arrayBuffer()), bytes.slice(0, 2));
  await run.finish();
  for (const headers of [{ "Content-Length": "invalid" }, { "Content-Length": "99999999999999999999999" }, { "Content-Encoding": "gzip" }]) {
    const upstream = source(bytes, { headers });
    const ignored = await invoke(upstream.response, { range: "bytes=0-1" });
    assert.equal(ignored.response, upstream.response);
    await upstream.response.body.cancel();
  }
});
