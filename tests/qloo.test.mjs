import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseInventoryCsv } from '../lib/csv.ts';
import { validateChangedProgramme } from './live-smoke.mjs';
import {
  QLOO_LIMITS, QlooError, configFromValues, publicConfig, validateSearch,
  validateEvidenceInput, parseSearchResponse, parseInsightResponse,
  readRequestJson, searchQloo, getQlooEvidence, errorResponse,
} from '../lib/qloo.ts';

const ids = {
  first: '10000000-0000-4000-8000-000000000000',
  second: '20000000-0000-4000-8000-000000000000',
  third: '30000000-0000-4000-8000-000000000000',
  artist: '40000000-0000-4000-8000-000000000000',
  movie: '50000000-0000-4000-8000-000000000000',
  foreign: '60000000-0000-4000-8000-000000000000',
};
const config = configFromValues('test-server-secret', undefined);
const input = () => ({
  books: [{ id: 'book-one', entityId: ids.first }, { id: 'book-two', entityId: ids.second }, { id: 'book-three', entityId: ids.third }],
  events: [{ id: 'cinema', anchors: [{ name: 'An actual selected film', type: 'movie', entityId: ids.movie }] }],
});
const row = (entityId, type = 'book', name = 'A title') => ({ entity_id: entityId, name, types: [`urn:entity:${type}`], properties: { description: 'Plain text metadata' } });
const json = (value, init) => new Response(JSON.stringify(value), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
const expectError = async (promise, code, status) => assert.rejects(promise, (error) => error instanceof QlooError && error.code === code && error.status === status);

test('configuration is allowlisted and its public representation never contains the credential', () => {
  assert.deepEqual(publicConfig(config), { configured: true, host: 'https://hackathon.api.qloo.com' });
  assert.deepEqual(publicConfig(configFromValues('', undefined)), { configured: false, host: 'https://hackathon.api.qloo.com' });
  assert.equal(configFromValues('key', 'https://api.qloo.com').host, 'https://api.qloo.com');
  for (const host of ['http://api.qloo.com', 'https://api.qloo.com/elsewhere', 'https://api.qloo.com.evil.example', 'https://user@api.qloo.com', 'https://localhost']) {
    assert.throws(() => configFromValues('key', host), { code: 'QLOO_INVALID_CONFIG' });
  }
  assert.throws(() => configFromValues('key\r\ninjected', undefined), { code: 'QLOO_INVALID_CONFIG' });
  assert.ok(!JSON.stringify(publicConfig(config)).includes('test-server-secret'));
});

test('absent key blocks search and evidence without fetching or supplying sample results', async () => {
  let calls = 0;
  const runtime = { fetchImpl: async () => { calls++; throw Error('must not fetch'); } };
  const absent = configFromValues(undefined, undefined);
  await expectError(searchQloo({ query: 'a title', type: 'book' }, absent, runtime), 'QLOO_NOT_CONFIGURED', 503);
  await expectError(getQlooEvidence(input(), absent, runtime), 'QLOO_NOT_CONFIGURED', 503);
  assert.equal(calls, 0);
});

test('invalid search and evidence payloads fail before any upstream call', async () => {
  assert.deepEqual(validateSearch({ query: '  title and author  ', type: 'book' }), { query: 'title and author', type: 'book' });
  for (const bad of [{ query: 'x'.repeat(121), type: 'book' }, { query: 'x', type: 'person' }, { query: 'x\ny', type: 'artist' }, null]) {
    assert.throws(() => validateSearch(bad), { code: 'INVALID_INPUT' });
  }
  const invalid = [
    { books: [], events: [] },
    { ...input(), events: [] },
    { ...input(), books: [...input().books, input().books[0]] },
    { ...input(), books: [{ id: 'a', entityId: ids.first }, { id: 'b', entityId: ids.first }] },
    { ...input(), books: [{ id: 'id\u0000', entityId: ids.first }] },
    { ...input(), books: [{ id: 'a', entityId: 'fixture:book' }] },
    { ...input(), events: [{ id: 'event', anchors: [] }] },
    { ...input(), events: [{ id: 'event', anchors: [{ name: 'x', type: 'book', entityId: ids.first }] }] },
    { ...input(), events: [{ ...input().events[0], anchors: [input().events[0].anchors[0], input().events[0].anchors[0]] }] },
  ];
  let calls = 0;
  for (const value of invalid) await expectError(getQlooEvidence(value, config, { fetchImpl: async () => { calls++; return json({}); } }), 'INVALID_INPUT', 400);
  assert.equal(calls, 0);
  assert.deepEqual(validateEvidenceInput(input()), input());
  assert.equal(validateEvidenceInput({ ...input(), books: [{ id: 'ISBN 978-1', entityId: ids.first }] }).books[0].id, 'ISBN 978-1');
});

test('request parser enforces same origin, content type, JSON syntax and streaming byte cap', async () => {
  const request = (body, headers = {}) => new Request('https://crate.example/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
  assert.deepEqual(await readRequestJson(request('{"query":"a"}', { Origin: 'https://crate.example', 'Sec-Fetch-Site': 'same-origin' })), { query: 'a' });
  await expectError(readRequestJson(request('{}', { Origin: 'https://other.example' })), 'CROSS_ORIGIN_REQUEST', 403);
  await expectError(readRequestJson(request('{}', { 'Sec-Fetch-Site': 'cross-site' })), 'CROSS_ORIGIN_REQUEST', 403);
  await expectError(readRequestJson(request('{}', { 'Content-Type': 'text/plain' })), 'JSON_REQUIRED', 415);
  await expectError(readRequestJson(request('not JSON')), 'INVALID_INPUT', 400);
  await expectError(readRequestJson(request('x'.repeat(QLOO_LIMITS.bodyBytes + 1))), 'PAYLOAD_TOO_LARGE', 413);
});

test('typed search sends only the approved query and returns text metadata for manual confirmation', async () => {
  const result = await searchQloo({ query: 'Title Author', type: 'book' }, config, {
    now: () => new Date('2026-10-17T12:00:00Z'),
    fetchImpl: async (url, init) => {
      const parsed = new URL(url);
      assert.equal(parsed.origin, config.host);
      assert.equal(parsed.pathname, '/search');
      assert.equal(parsed.searchParams.get('types'), 'urn:entity:book');
      assert.equal(parsed.searchParams.get('query'), 'Title Author');
      assert.equal(init.headers['X-Api-Key'], config.apiKey);
      assert.equal(init.redirect, 'manual');
      assert.equal(init.cache, 'no-store');
      assert.ok(!url.includes(config.apiKey));
      return json({ results: [row(ids.first, 'book', '<script>Plain text only</script>')] });
    },
  });
  assert.equal(result.entities[0].entityId, ids.first);
  assert.equal(result.entities[0].name, '<script>Plain text only</script>');
  assert.equal(result.entities[0].author, undefined, 'Undocumented author fields must not be invented');
  assert.equal(result.retrievedAt, '2026-10-17T12:00:00.000Z');
});

test('search reports documented 404 as no matches; malformed or wrong-type success is rejected', async () => {
  assert.deepEqual((await searchQloo({ query: 'none', type: 'book' }, config, { fetchImpl: async () => json({}, { status: 404 }) })).entities, []);
  for (const data of [{ results: {} }, { results: [row(ids.artist, 'artist')] }, { results: [row(ids.first), row(ids.first)] }]) {
    assert.throws(() => parseSearchResponse(data, 'book'), { code: 'QLOO_INVALID_RESPONSE' });
  }
});

test('authentication, rate limiting and upstream failures never echo upstream messages or secrets', async () => {
  for (const status of [401, 403]) {
    await expectError(searchQloo({ query: 'book', type: 'book' }, config, { fetchImpl: async () => json({ error: `echo ${config.apiKey}` }, { status }) }), 'QLOO_AUTH', 502);
  }
  let rateError;
  try { await getQlooEvidence(input(), config, { fetchImpl: async () => json({ error: config.apiKey }, { status: 429, headers: { 'Retry-After': '9999' } }) }); } catch (error) { rateError = error; }
  assert.equal(rateError.code, 'QLOO_RATE_LIMITED');
  const response = errorResponse(rateError);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '3600');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.ok(!(await response.text()).includes(config.apiKey));
  await expectError(getQlooEvidence(input(), config, { fetchImpl: async () => json({ error: config.apiKey }, { status: 500 }) }), 'QLOO_UNAVAILABLE', 502);
});

test('upstream diagnostics reveal only a bounded status or error class', async () => {
  const httpEvents = [];
  await expectError(searchQloo({ query: 'book', type: 'book' }, config, {
    fetchImpl: async () => json({ error: config.apiKey }, { status: 503 }),
    diagnostic: (event) => httpEvents.push(event),
  }), 'QLOO_UNAVAILABLE', 502);
  assert.deepEqual(httpEvents, [{ endpoint: '/search', kind: 'http', status: 503 }]);

  const networkEvents = [];
  await expectError(searchQloo({ query: 'book', type: 'book' }, config, {
    fetchImpl: async () => { throw new Error(config.apiKey); },
    diagnostic: (event) => networkEvents.push(event),
  }), 'QLOO_UNAVAILABLE', 502);
  assert.deepEqual(networkEvents, [{ endpoint: '/search', kind: 'network', errorName: 'Error' }]);
  assert.ok(!JSON.stringify([...httpEvents, ...networkEvents]).includes(config.apiKey));
});

test('redirects are rejected without following their location or exposing the credential', async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    let calls = 0;
    const diagnostics = [];
    let failure;
    try {
      await searchQloo({ query: 'book', type: 'book' }, config, {
        diagnostic: (event) => diagnostics.push(event),
        fetchImpl: async (url, init) => {
          calls++;
          assert.equal(new URL(url).origin, config.host);
          assert.equal(init.redirect, 'manual');
          return new Response(null, { status, headers: { Location: 'https://unapproved.example/collect' } });
        },
      });
    } catch (error) { failure = error; }
    assert.equal(calls, 1);
    assert.equal(failure?.code, 'QLOO_UNAVAILABLE');
    assert.deepEqual(diagnostics, [{ endpoint: '/search', kind: 'http', status }]);
    assert.ok(!(await errorResponse(failure).text()).includes(config.apiKey));
  }
});

test('invalid JSON, oversized chunked upstream and unapproved host fail closed', async () => {
  await expectError(getQlooEvidence(input(), config, { fetchImpl: async () => new Response('not json') }), 'QLOO_INVALID_RESPONSE', 502);
  await expectError(getQlooEvidence(input(), config, { fetchImpl: async () => new Response('x'.repeat(QLOO_LIMITS.upstreamBytes + 1)) }), 'PAYLOAD_TOO_LARGE', 502);
  let calls = 0;
  await expectError(getQlooEvidence(input(), { apiKey: 'secret', host: 'https://attacker.example' }, { fetchImpl: async () => { calls++; return json({}); } }), 'QLOO_INVALID_CONFIG', 503);
  assert.equal(calls, 0);
  await expectError(getQlooEvidence(input(), config, { fetchImpl: async () => new Response(null, { status: 302, headers: { Location: 'https://attacker.example' } }) }), 'QLOO_UNAVAILABLE', 502);
});

test('timeouts abort the upstream request instead of retrying or using fixtures', async () => {
  let calls = 0;
  await expectError(getQlooEvidence(input(), config, { timeoutMs: 10, fetchImpl: async (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }));
  } }), 'QLOO_TIMEOUT', 504);
  assert.equal(calls, 1);
});

test('out-of-inventory, duplicate, wrong-type and malformed ranking results are rejected', () => {
  const books = input().books;
  for (const data of [
    { results: { entities: [row(ids.foreign)] } },
    { results: { entities: [row(ids.first), row(ids.first)] } },
    { results: { entities: [row(ids.artist, 'artist')] } },
    { results: { entities: [{ name: 'missing identity' }] } },
    { results: [] },
    { success: false, results: { entities: [row(ids.first)] } },
    { success: 'true', results: { entities: [row(ids.first)] } },
    { results: { entities: [{ ...row(ids.first), type: 'urn:entity', subtype: 'urn:entity:artist' }] } },
  ]) assert.throws(() => parseInsightResponse(data, books), { code: 'QLOO_INVALID_RESPONSE' });
});

test('documented Insights type/subtype entities work without legacy types arrays', () => {
  const documented = { entity_id: ids.first.toUpperCase(), name: 'Confirmed title', type: 'urn:entity', subtype: 'urn:entity:book', disambiguation: 'Verified author, 1984' };
  const parsed = parseInsightResponse({ success: true, results: { entities: [documented] } }, input().books);
  assert.deepEqual(parsed.orderedIds, ['book-one']);
  assert.equal(parsed.rows[0].entityId, ids.first);
  assert.match(parseSearchResponse({ results: [documented] }, 'book')[0].description, /Verified author/);
  assert.throws(() => parseSearchResponse({ success: false, results: [row(ids.first)] }, 'book'), { code: 'QLOO_INVALID_RESPONSE' });
});

test('an imported ISBN SKU can be mapped to a Qloo entity without changing its local identifier', () => {
  const books = parseInventoryCsv('id,title,author,quantity\nISBN 978-1,Stock title,Author name,2').map((book) => ({ id: book.id, entityId: ids.first }));
  const validated = validateEvidenceInput({ books, events: input().events });
  assert.equal(validated.books[0].id, 'ISBN 978-1');
  assert.deepEqual(parseInsightResponse({ success: true, results: { entities: [row(ids.first)] } }, validated.books).orderedIds, ['ISBN 978-1']);
});

test('successful evidence preserves response order, maps local IDs and records missing candidates as unknown', async () => {
  const payload = input();
  payload.events.push({ id: 'concert', anchors: [{ name: 'Selected artist', type: 'artist', entityId: ids.artist }] });
  let calls = 0;
  const bodies = [
    { results: { entities: [{ ...row(ids.second), affinity: 0.987654 }, row(ids.first)] } },
    { results: { entities: [row(ids.third), row(ids.first), row(ids.second)] }, query: { explainability: {} } },
  ];
  const evidence = await getQlooEvidence(payload, config, { now: () => new Date('2026-10-17T12:00:00Z'), fetchImpl: async (url, init) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/v2/insights');
    assert.equal(parsed.searchParams.get('filter.type'), 'urn:entity:book');
    assert.deepEqual(parsed.searchParams.get('filter.results.entities').split(','), payload.books.map(book => book.entityId));
    assert.equal(parsed.searchParams.get('take'), '3');
    assert.equal(parsed.searchParams.get('feature.explainability'), 'true');
    assert.equal(parsed.searchParams.get('signal.interests.entities'), calls === 0 ? ids.movie : ids.artist);
    assert.equal(init.redirect, 'manual');
    return json(bodies[calls++]);
  } });
  assert.equal(calls, 2);
  assert.equal(evidence.mode, 'qloo');
  assert.deepEqual(evidence.candidateIds, payload.books.map(book => book.id));
  assert.deepEqual(evidence.profiles.cinema.orderedIds, ['book-two', 'book-one']);
  assert.deepEqual(evidence.profiles.concert.orderedIds, ['book-three', 'book-one', 'book-two']);
  assert.equal(evidence.profiles.cinema.candidateCount, 3);
  assert.deepEqual(evidence.profiles.cinema.trace.rawContext.missingIds, ['book-three']);
  assert.match(evidence.profiles.cinema.trace.warnings[0], /unknown/);
  assert.equal(evidence.profiles.cinema.trace.responseHash, createHash('sha256').update(JSON.stringify(bodies[0])).digest('hex'));
  assert.equal(evidence.profiles.cinema.trace.retrievedAt, '2026-10-17T12:00:00.000Z');
  assert.ok(!JSON.stringify(evidence).includes('0.987654'), 'Raw scores must not enter cross-event allocation evidence');
  assert.ok(!JSON.stringify(evidence).includes(config.apiKey));
});

test('zero matches remain explicitly unknown and a later event failure returns no partial success', async () => {
  const zero = await getQlooEvidence(input(), config, { fetchImpl: async () => json({ results: { entities: [] } }) });
  assert.deepEqual(zero.profiles.cinema.orderedIds, []);
  assert.equal(zero.profiles.cinema.trace.rawContext.missingIds.length, 3);
  const payload = input();
  payload.events.push({ id: 'concert', anchors: [{ name: 'artist', type: 'artist', entityId: ids.artist }] });
  let calls = 0;
  await expectError(getQlooEvidence(payload, config, { fetchImpl: async () => ++calls === 1 ? json({ results: { entities: [row(ids.first)] } }) : json({}, { status: 429 }) }), 'QLOO_RATE_LIMITED', 429);
  assert.equal(calls, 2);
});

test('documented explainability warning preserves rankings without claiming an available explanation', async () => {
  const evidence = await getQlooEvidence(input(), config, { fetchImpl: async () => json({
    success: true,
    results: { entities: [row(ids.first)] },
    query: { explainability: { warning: 'Explainability could not be computed' } },
  }) });
  assert.deepEqual(evidence.profiles.cinema.orderedIds, ['book-one']);
  assert.equal(evidence.profiles.cinema.trace.rawContext.explainabilityAvailable, false);
  assert.ok(evidence.profiles.cinema.trace.warnings.some(warning => warning.includes('explainability is unavailable')));
});

test('live smoke requires changed normalized signal identities before making requests', () => {
  const original = input();
  original.events[0].anchors[0].entityId = 'abcdef00-0000-4000-8000-000000000000';
  original.events[0].anchors.push({ name: 'Selected artist', type: 'artist', entityId: ids.artist });
  for (const anchors of [
    original.events[0].anchors.map(anchor => ({ ...anchor, entityId: anchor.entityId.toUpperCase() })),
    [...original.events[0].anchors].reverse(),
  ]) {
    assert.throws(() => validateChangedProgramme({ ...original, changedEvent: { id: 'cinema', anchors } }), /genuinely changed/);
  }
  const changed = { id: 'cinema', anchors: [{ name: 'Different selected film', type: 'movie', entityId: ids.foreign }] };
  assert.equal(validateChangedProgramme({ ...original, changedEvent: changed }).targetIndex, 0);
});
