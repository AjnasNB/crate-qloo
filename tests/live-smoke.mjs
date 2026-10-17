/**
 * Manual live integration check, excluded from the four-file unit-test command.
 * No API key is accepted or printed: the deployed server owns its credential.
 * Run only after reviewing real Qloo identities; this script never guesses IDs.
 */
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { solve } from '../lib/planner.ts';
import { validateEvidenceInput } from '../lib/qloo.ts';
import { packingCsv } from '../lib/csv.ts';

const help = `Manual Crate live smoke check

node --experimental-strip-types tests/live-smoke.mjs --base https://YOUR-CRATE-SITE --input /absolute/path/to/reviewed-input.json [--mcp-http]

Input JSON: {review:{identitiesConfirmed:true},books:[Book],events:[Stall,Stall],changedEvent:{id,anchors}}
Use genuine Qloo search results reviewed against title/author and programme identity.
changedEvent must replace at least one confirmed anchor in one existing stall.
Do not paste keys in this file, the command, or the input. Use an ignored outputs/ input file.
Default: at most three Qloo Insights calls (two API profiles and one changed profile).
Optional --mcp-http adds at most two planning calls for an endpoint accessible to this client.
Sites protects canonical /mcp with OAuth. Its anonymous 401 is an authentication
boundary, not a Qloo failure. Use the installed native Crate tool for external-agent
proof; this script never extracts, accepts or stores Sites tokens or uses a bypass.
Non-adaptation and reader usefulness require separate review; the script cannot certify them.
No synthetic data is supplied. No stock is changed. No retry loop is used.`;

function argumentsOf(values) {
  if (!values.length || values.includes('--help')) return null;
  const result = {};
  for (let i = 0; i < values.length; i++) {
    const flag = values[i];
    assert.ok(!result[flag], 'Do not repeat arguments.');
    if (flag === '--mcp-http') { result[flag] = true; continue; }
    assert.ok(['--base', '--input'].includes(flag) && values[i + 1], 'Use --base URL, --input FILE and optional --mcp-http.');
    result[flag] = values[++i];
  }
  assert.ok(result['--base'] && result['--input'], 'Both --base and --input are required.');
  const url = new URL(result['--base']);
  assert.ok(url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)), 'Use HTTPS, or HTTP only for localhost.');
  assert.ok(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'The base must be a plain site origin without credentials, path, query or fragment.');
  return { base: url.origin, inputPath: result['--input'], mcpHttp: result['--mcp-http'] === true };
}

async function request(base, path, body, extraHeaders = {}, reportAuthBoundary = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extraHeaders },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error', signal: controller.signal,
    });
    if (reportAuthBoundary && response.status === 401) {
      await response.body?.cancel();
      return { authenticationRequired: true };
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let bytes = 0, text = '';
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 1_048_576) { await reader.cancel(); throw Error('The response exceeded the smoke-check byte cap.'); }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
      } finally { reader.releaseLock(); }
    }
    let data;
    try { data = JSON.parse(text); } catch { throw Error(`${path} did not return JSON.`); }
    assert.ok(response.ok, `${path} failed (${response.status}; ${data?.error?.code ?? 'HTTP_ERROR'}). No fallback used.`);
    return data;
  } finally { clearTimeout(timer); }
}

function checkEvidence(evidence, books, events) {
  assert.equal(evidence.mode, 'qloo', 'Only actual Qloo evidence is acceptable.');
  assert.ok(Number.isFinite(Date.parse(evidence.retrievedAt)), 'A real retrieval timestamp is required.');
  assert.deepEqual([...evidence.candidateIds].sort(), books.map(book => book.id).sort());
  for (const event of events) {
    const profile = evidence.profiles[event.id];
    assert.equal(profile.candidateCount, books.length);
    assert.equal(new Set(profile.orderedIds).size, profile.orderedIds.length);
    assert.ok(profile.orderedIds.every(id => evidence.candidateIds.includes(id)));
    const trace = profile.trace;
    assert.ok(['https://hackathon.api.qloo.com', 'https://api.qloo.com'].includes(trace.host));
    assert.equal(trace.path, '/v2/insights');
    assert.match(trace.responseHash, /^[a-f0-9]{64}$/);
    assert.equal(trace.parameters['filter.type'], 'urn:entity:book');
    assert.deepEqual(trace.parameters['filter.results.entities'].split(',').sort(), books.map(book => book.entityId.toLowerCase()).sort());
    assert.deepEqual(trace.parameters['signal.interests.entities'].split(',').sort(), event.anchors.map(anchor => anchor.entityId.toLowerCase()).sort());
    assert.equal(Number(trace.parameters.take), books.length);
  }
}

function checkPlan(plan, books, events, evidence) {
  assert.equal(plan.feasible, true, `No feasible packing plan: ${plan.diagnostics?.join(' ')}`);
  const counts = new Map();
  for (const event of events) {
    const ids = plan.assignments[event.id];
    assert.equal(ids.length, event.slots);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.ok(evidence.profiles[event.id].orderedIds.includes(id), 'A missing rank cannot become a placement.');
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  for (const book of books) assert.ok((counts.get(book.id) ?? 0) <= book.quantity - book.reserve, `Over-allocated ${book.id}.`);
  assert.ok(packingCsv(books, events, plan.assignments, `Live Qloo; snapshot ${evidence.retrievedAt}`).includes('Live Qloo'));
}

function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

export function validateChangedProgramme(input) {
  const initial = validateEvidenceInput(input);
  const targetIndex = initial.events.findIndex(event => event.id === input.changedEvent?.id);
  assert.ok(targetIndex >= 0, 'changedEvent must identify one existing stall.');
  const variantEvents = input.events.map((event, index) => index === targetIndex ? { ...event, anchors: input.changedEvent.anchors } : event);
  const variant = validateEvidenceInput({ books: input.books, events: variantEvents });
  const signalIds = event => event.anchors.map(anchor => anchor.entityId).sort();
  assert.ok(!same(signalIds(initial.events[targetIndex]), signalIds(variant.events[targetIndex])), 'Provide a genuinely changed, confirmed programme; UUID case and anchor order do not change its signal.');
  return { targetIndex, variantEvents };
}

async function run(options) {
  assert.ok((await stat(options.inputPath)).size <= 32_768, 'Input must not exceed 32 KiB.');
  const rawInput = await readFile(options.inputPath, 'utf8');
  assert.ok(Buffer.byteLength(rawInput) <= 32_768, 'Input must not exceed 32 KiB.');
  const input = JSON.parse(rawInput);
  assert.equal(input.review?.identitiesConfirmed, true, 'Manually review title/author and programme identities first. No IDs are auto-confirmed.');
  assert.equal(input.events?.length, 2, 'Use two simultaneously departing stalls.');
  const { targetIndex, variantEvents } = validateChangedProgramme(input);
  const config = await request(options.base, '/api/config');
  assert.equal(config.configured, true, 'Server Qloo key is not configured. Stop; no fixture fallback.');
  assert.deepEqual(Object.keys(config).sort(), ['configured', 'host']);
  assert.ok(['https://hackathon.api.qloo.com', 'https://api.qloo.com'].includes(config.host));

  const initial = await request(options.base, '/api/evidence', input);
  checkEvidence(initial, input.books, input.events);
  const plan = solve({ books: input.books, events: input.events, evidence: initial, pins: {}, vetoes: {} });
  checkPlan(plan, input.books, input.events, initial);

  // Request just the changed context, exactly as the browser's cache path does.
  const changed = await request(options.base, '/api/evidence', { books: input.books, events: [variantEvents[targetIndex]] });
  checkEvidence(changed, input.books, [variantEvents[targetIndex]]);
  const merged = { ...changed, profiles: { ...initial.profiles, ...changed.profiles } };
  const changedPlan = solve({ books: input.books, events: variantEvents, evidence: merged, pins: {}, vetoes: {} });
  checkPlan(changedPlan, input.books, variantEvents, merged);

  let mcpIntegration = { status: 'NOT_RUN', next: 'Invoke installed crate_plan_stalls through its authorized native client using the same reviewed inventory and programmes.' };
  if (options.mcpHttp) {
    const method = 'tools/call', name = 'crate_plan_stalls';
    const mcp = await request(options.base, '/mcp', { jsonrpc: '2.0', id: 1, method, params: {
      name, arguments: { books: input.books, events: input.events },
      _meta: { 'io.modelcontextprotocol/protocolVersion': '2026-07-28', 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'Crate live acceptance check', version: '1' } },
    } }, { Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2026-07-28', 'Mcp-Method': method, 'Mcp-Name': name }, true);
    if (mcp.authenticationRequired) {
      mcpIntegration = { status: 'AUTH_REQUIRED', next: 'Sites OAuth protects /mcp. Verify via the installed native Crate tool; no token extraction or alternate route was attempted.' };
    } else {
      assert.ok(!mcp.error && mcp.result && !mcp.result.isError, `MCP failed (${mcp.error?.code ?? mcp.result?.structuredContent?.error?.code ?? 'INFEASIBLE'}).`);
      const tool = mcp.result.structuredContent;
      checkEvidence(tool.evidence, input.books, input.events);
      checkPlan(tool.plan, input.books, input.events, tool.evidence);
      const independentlySolved = solve({ books: input.books, events: input.events, evidence: tool.evidence, pins: {}, vetoes: {} });
      assert.deepEqual(tool.plan.assignments, independentlySolved.assignments);
      mcpIntegration = { status: 'PASS', next: 'A native external-agent call is still a separate client-interoperability check.' };
    }
  }

  // Freeze the second crate and remove an available first-crate title locally.
  // This checks a draft repair against the actual retrieved matrix; it changes no stock.
  const [first, second] = input.events;
  const frozen = plan.assignments[second.id];
  const vetoes = { [second.id]: input.books.filter(book => !frozen.includes(book.id)).map(book => book.id) };
  let repair = null;
  for (const id of plan.assignments[first.id].filter(id => !frozen.includes(id))) {
    const books = input.books.map(book => book.id === id ? { ...book, quantity: book.reserve } : book);
    const candidate = solve({ books, events: input.events, evidence: initial, pins: { [second.id]: frozen }, vetoes, previous: plan.assignments });
    if (!candidate.feasible) continue;
    checkPlan(candidate, books, input.events, initial);
    assert.deepEqual(candidate.assignments[second.id], frozen);
    repair = { removedAvailableStock: id, changes: candidate.changeCount, protectedCrate: second.id, assignments: candidate.assignments };
    break;
  }
  const ranksChanged = !same(initial.profiles[variantEvents[targetIndex].id].orderedIds, changed.profiles[variantEvents[targetIndex].id].orderedIds);
  const assignmentsChanged = !same(plan.assignments, changedPlan.assignments);
  console.log(JSON.stringify({
    apiIntegration: 'PASS', base: options.base, keyExposed: false,
    initialReturned: Object.fromEntries(input.events.map(event => [event.id, initial.profiles[event.id].orderedIds.length])),
    changedProgramme: variantEvents[targetIndex].id, ranksChanged, assignmentsChanged,
    initialAssignments: plan.assignments, changedAssignments: changedPlan.assignments,
    mcpIntegration, stockAndExportChecks: 'PASS',
    frozenCrateRepair: repair ?? 'NOT DEMONSTRATED: no feasible separate first-crate stock-out was available',
    identityReview: 'Supplied as a manual precondition, not independently certified by this script',
    culturalValue: 'PENDING: review a non-adaptation bridge and usefulness; rank differences alone are not reader validation',
  }, null, 2));
  if (!ranksChanged || !assignmentsChanged || !repair) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = argumentsOf(process.argv.slice(2));
    if (!options) console.log(help);
    else await run(options);
  } catch (error) {
    console.error(`Live smoke check stopped: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exitCode = 1;
  }
}
