/** Server-only Qloo adapter. Never substitute sample data for a live response. */
export const QLOO_HOSTS = ["https://hackathon.api.qloo.com", "https://api.qloo.com"] as const;
export const QLOO_LIMITS = { books: 18, events: 2, anchors: 4, bodyBytes: 32_768, upstreamBytes: 1_048_576, searchResults: 8, upstreamMs: 10_000 } as const;

export type EntityType = "book" | "artist" | "movie";
export type SearchEntity = { entityId: string; name: string; type: EntityType; description?: string; author?: string };
export type QlooConfig = { host: string; apiKey: string };
export type EvidenceInput = {
  books: { id: string; entityId: string }[];
  events: { id: string; anchors: { name: string; type: "artist" | "movie"; entityId: string }[] }[];
};
type Runtime = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
  diagnostic?: (event: { endpoint: string; kind: "http" | "network"; status?: number; errorName?: string }) => void;
};
type JsonObject = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class QlooError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: string;
  constructor(status: number, code: string, message: string, retryAfter?: string) {
    super(message);
    this.name = "QlooError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

function object(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function badInput(message: string): never { throw new QlooError(400, "INVALID_INPUT", message); }
function badUpstream(message = "Qloo returned an unexpected response. No replacement data was used."): never {
  throw new QlooError(502, "QLOO_INVALID_RESPONSE", message);
}
function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) ? value.trim() : undefined;
}
function uuid(value: unknown): string | undefined { return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : undefined; }
function id(value: unknown, max = 80): string | undefined {
  return typeof value === "string" && value.trim().length > 0 && value === value.trim() && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value) ? value : undefined;
}

export function configFromValues(apiKey: unknown, apiBase: unknown): QlooConfig {
  const host = apiBase === undefined || apiBase === "" ? QLOO_HOSTS[0] : apiBase;
  if (typeof host !== "string" || !QLOO_HOSTS.some((allowed) => host === allowed)) {
    throw new QlooError(503, "QLOO_INVALID_CONFIG", "The server's Qloo API host is not allowed.");
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) return { host, apiKey: "" };
  if (apiKey.length > 4096 || /[\r\n]/.test(apiKey)) {
    throw new QlooError(503, "QLOO_INVALID_CONFIG", "The server's Qloo credential is invalid.");
  }
  return { host, apiKey: apiKey.trim() };
}

/** Resolve request-time bindings; no credential or request state is cached. */
export async function getQlooConfig(): Promise<QlooConfig> {
  let bindings: typeof import("cloudflare:workers").env | undefined;
  try { bindings = (await import("cloudflare:workers")).env; } catch { /* Node unit tests/local tooling have no Worker module. */ }
  const local = typeof process !== "undefined" ? process.env : undefined;
  return configFromValues(
    bindings ? Reflect.get(bindings, "QLOO_API_KEY") ?? local?.QLOO_API_KEY : local?.QLOO_API_KEY,
    bindings ? Reflect.get(bindings, "QLOO_API_BASE") ?? local?.QLOO_API_BASE : local?.QLOO_API_BASE,
  );
}

export function publicConfig(config: QlooConfig) { return { configured: Boolean(config.apiKey), host: config.host }; }
function requireKey(config: QlooConfig) {
  if (!config.apiKey) throw new QlooError(503, "QLOO_NOT_CONFIGURED", "Live Qloo is not connected. A server API key is required; sample data will not replace this request.");
}

export function validateSearch(value: unknown): { query: string; type: EntityType } {
  if (!object(value)) return badInput("Expected a JSON object.");
  const query = text(value.query, 120);
  if (!query || /[\r\n\t]/.test(query)) return badInput("Enter a search query between 1 and 120 characters.");
  if (value.type !== "book" && value.type !== "artist" && value.type !== "movie") return badInput("Search type must be book, artist or movie.");
  return { query, type: value.type };
}

export function validateEvidenceInput(value: unknown): EvidenceInput {
  if (!object(value) || !Array.isArray(value.books) || !Array.isArray(value.events)) return badInput("Expected books and events arrays.");
  if (!value.books.length || value.books.length > QLOO_LIMITS.books) return badInput(`Provide 1–${QLOO_LIMITS.books} confirmed books.`);
  if (!value.events.length || value.events.length > QLOO_LIMITS.events) return badInput("Provide one or two events.");
  const bookIds = new Set<string>(), entityIds = new Set<string>(), eventIds = new Set<string>();
  const books = value.books.map((book) => {
    if (!object(book)) return badInput("Each book requires a local id and confirmed Qloo entityId.");
    const bookId = id(book.id), entityId = uuid(book.entityId);
    if (!bookId || !entityId || bookIds.has(bookId) || entityIds.has(entityId)) return badInput("Books need unique local ids and unique confirmed Qloo UUIDs.");
    bookIds.add(bookId); entityIds.add(entityId);
    return { id: bookId, entityId };
  });
  const events = value.events.map((event) => {
    if (!object(event)) return badInput("Each event requires an id and confirmed anchors.");
    const eventId = id(event.id, 64);
    if (!eventId || !/^[a-z0-9][a-z0-9._:-]*$/i.test(eventId) || eventIds.has(eventId)) return badInput("Events need unique local ids of up to 64 letters, numbers or ._:- characters.");
    if (!Array.isArray(event.anchors) || !event.anchors.length || event.anchors.length > QLOO_LIMITS.anchors) return badInput("Each event needs 1–4 confirmed artist or movie anchors.");
    eventIds.add(eventId);
    const anchorIds = new Set<string>();
    const anchors = event.anchors.map((anchor): EvidenceInput["events"][number]["anchors"][number] => {
      if (!object(anchor)) return badInput("Each anchor must be a confirmed artist or movie.");
      const name = text(anchor.name, 200), entityId = uuid(anchor.entityId);
      if (!name || !entityId || (anchor.type !== "artist" && anchor.type !== "movie") || anchorIds.has(entityId)) return badInput("Anchors need a name, artist/movie type and unique confirmed Qloo UUID.");
      anchorIds.add(entityId);
      return { name, entityId, type: anchor.type };
    });
    return { id: eventId, anchors };
  });
  return { books, events };
}

/** A byte cap applies while streaming, including chunked bodies with no Content-Length. */
async function boundedText(message: Request | Response, maxBytes: number, signal?: AbortSignal): Promise<string> {
  const declared = message.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) {
    await message.body?.cancel();
    throw new QlooError(message instanceof Request ? 413 : 502, "PAYLOAD_TOO_LARGE", "The JSON payload exceeds the allowed size.");
  }
  if (!message.body) return "";
  const reader = message.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, result = "";
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      if (signal?.aborted) throw new QlooError(504, "QLOO_TIMEOUT", "The request timed out. Try again later.");
      const { done, value } = await reader.read();
      if (signal?.aborted) throw new QlooError(504, "QLOO_TIMEOUT", "The request timed out. Try again later.");
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new QlooError(message instanceof Request ? 413 : 502, "PAYLOAD_TOO_LARGE", "The JSON payload exceeds the allowed size.");
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally { signal?.removeEventListener("abort", cancel); reader.releaseLock(); }
}

export async function readRequestJson(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== new URL(request.url).origin) || (site && site !== "same-origin" && site !== "none")) {
    throw new QlooError(403, "CROSS_ORIGIN_REQUEST", "Use this API from the Crate application.");
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) throw new QlooError(415, "JSON_REQUIRED", "Send application/json.");
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const body = await boundedText(request, QLOO_LIMITS.bodyBytes, controller.signal);
    try { return JSON.parse(body); } catch { return badInput("The request body must contain valid JSON."); }
  } finally { clearTimeout(timer); }
}

function entity(value: unknown, expected: EntityType): SearchEntity {
  if (!object(value)) return badUpstream();
  const entityId = uuid(value.entity_id), name = text(value.name, 300);
  if (!entityId || !name) return badUpstream();
  const expectedType = `urn:entity:${expected}`;
  // Search uses types[]; the documented v2 Insights example uses type/subtype.
  // Accept either documented shape, but reject contradictory declared kinds.
  if (value.types !== undefined && (!Array.isArray(value.types) || !value.types.includes(expectedType))) return badUpstream();
  if (value.subtype !== undefined && (value.subtype !== expectedType || (value.type !== undefined && value.type !== "urn:entity"))) return badUpstream();
  if (value.types === undefined && value.subtype === undefined) return badUpstream();
  const properties = object(value.properties) ? value.properties : {};
  const description = [text(value.disambiguation, 500), text(properties.description, 2000)].filter(Boolean).join(" — ");
  return { entityId, name, type: expected, ...(description ? { description } : {}) };
}

export function parseSearchResponse(value: unknown, expected: EntityType): SearchEntity[] {
  if (!object(value) || (value.success !== undefined && value.success !== true) || !Array.isArray(value.results) || value.results.length > QLOO_LIMITS.searchResults) return badUpstream();
  const entities = value.results.map((row) => entity(row, expected));
  if (new Set(entities.map((row) => row.entityId)).size !== entities.length) return badUpstream();
  return entities;
}

export function parseInsightResponse(value: unknown, books: EvidenceInput["books"]) {
  if (!object(value) || (value.success !== undefined && value.success !== true) || !object(value.results) || !Array.isArray(value.results.entities) || value.results.entities.length > books.length) return badUpstream();
  const allowed = new Map(books.map((book) => [book.entityId, book.id]));
  const seen = new Set<string>();
  const rows = value.results.entities.map((row, index) => {
    const parsed = entity(row, "book");
    const localId = allowed.get(parsed.entityId);
    if (!localId || seen.has(parsed.entityId)) return badUpstream("Qloo returned a duplicate or out-of-inventory entity. The evidence was rejected.");
    seen.add(parsed.entityId);
    return { id: localId, entityId: parsed.entityId, name: parsed.name, rank: index + 1 };
  });
  const explainability = object(value.query) && object(value.query.explainability) ? value.query.explainability : undefined;
  return {
    orderedIds: rows.map((row) => row.id),
    rows,
    missingIds: books.filter((book) => !seen.has(book.entityId)).map((book) => book.id),
    // Qloo returns this object with warning when explanations cannot be computed.
    explainabilityAvailable: Boolean(explainability && !("warning" in explainability)),
  };
}

async function upstream(config: QlooConfig, path: string, parameters: Record<string, string>, runtime: Runtime = {}, allowNotFound = false) {
  requireKey(config);
  // Revalidate injected configs as well: the credential must never reach another origin.
  configFromValues(config.apiKey, config.host);
  const url = new URL(path, config.host);
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), runtime.timeoutMs ?? QLOO_LIMITS.upstreamMs);
  try {
    const response = await (runtime.fetchImpl ?? fetch)(url.toString(), { method: "GET", headers: { Accept: "application/json", "X-Api-Key": config.apiKey }, signal: controller.signal, redirect: "error", cache: "no-store" });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 404 && allowNotFound) return { data: { results: [] }, responseHash: "", retrievedAt: (runtime.now?.() ?? new Date()).toISOString() };
      diagnose(runtime, { endpoint: path, kind: "http", status: response.status });
      if (response.status === 401 || response.status === 403) throw new QlooError(502, "QLOO_AUTH", "Qloo rejected the server credential. Check the key and its approved API host.");
      if (response.status === 429) {
        const retry = response.headers.get("retry-after");
        const retryAfter = retry && /^\d{1,4}$/.test(retry) ? String(Math.min(Number(retry), 3600)) : undefined;
        throw new QlooError(429, "QLOO_RATE_LIMITED", "Qloo's request limit has been reached. Try again later; no replacement data was used.", retryAfter);
      }
      throw new QlooError(502, "QLOO_UNAVAILABLE", "Qloo could not complete this request. No replacement data was used.");
    }
    const body = await boundedText(response, QLOO_LIMITS.upstreamBytes, controller.signal);
    let data: unknown;
    try { data = JSON.parse(body); } catch { return badUpstream("Qloo returned invalid JSON. No replacement data was used."); }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
    const responseHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return { data, responseHash, retrievedAt: (runtime.now?.() ?? new Date()).toISOString() };
  } catch (error) {
    if (error instanceof QlooError) throw error;
    if (controller.signal.aborted) throw new QlooError(504, "QLOO_TIMEOUT", "Qloo did not respond before the deadline. Try again later.");
    diagnose(runtime, { endpoint: path, kind: "network", errorName: error instanceof Error ? error.name.slice(0, 40) : typeof error });
    throw new QlooError(502, "QLOO_UNAVAILABLE", "The Qloo connection failed. No replacement data was used.");
  } finally { clearTimeout(timer); }
}

/** Emit only bounded endpoint/status metadata; never log credentials, URLs, or upstream bodies. */
function diagnose(runtime: Runtime, event: { endpoint: string; kind: "http" | "network"; status?: number; errorName?: string }) {
  try {
    (runtime.diagnostic ?? ((entry) => console.error("Qloo upstream diagnostic", entry)))(event);
  } catch { /* Diagnostics must not change the live request result. */ }
}

export async function searchQloo(input: unknown, config: QlooConfig, runtime: Runtime = {}) {
  const { query, type } = validateSearch(input);
  const result = await upstream(config, "/search", { query, types: `urn:entity:${type}`, take: String(QLOO_LIMITS.searchResults) }, runtime, true);
  return { entities: parseSearchResponse(result.data, type), retrievedAt: result.retrievedAt };
}

export async function getQlooEvidence(input: unknown, config: QlooConfig, runtime: Runtime = {}) {
  const { books, events } = validateEvidenceInput(input);
  requireKey(config);
  const started = Date.now();
  const profiles: Record<string, { orderedIds: string[]; candidateCount: number; trace: {
    host: string; path: string; parameters: Record<string, string>; responseHash: string; retrievedAt: string;
    warnings: string[]; rawContext: { anchors: EvidenceInput["events"][number]["anchors"]; results: { id: string; entityId: string; name: string; rank: number }[]; missingIds: string[]; explainabilityAvailable: boolean };
  } }> = Object.create(null);
  let retrievedAt = "";
  for (const event of events) {
    const parameters = { "filter.type": "urn:entity:book", "filter.results.entities": books.map((book) => book.entityId).join(","), "signal.interests.entities": event.anchors.map((anchor) => anchor.entityId).join(","), take: String(books.length), "feature.explainability": "true" };
    const remaining = QLOO_LIMITS.upstreamMs * QLOO_LIMITS.events - (Date.now() - started);
    if (remaining <= 0) throw new QlooError(504, "QLOO_TIMEOUT", "The evidence request exceeded its deadline.");
    const result = await upstream(config, "/v2/insights", parameters, { ...runtime, timeoutMs: Math.min(runtime.timeoutMs ?? QLOO_LIMITS.upstreamMs, remaining) });
    const parsed = parseInsightResponse(result.data, books);
    retrievedAt = result.retrievedAt;
    const warnings = parsed.missingIds.length ? [`${parsed.missingIds.length} inventory candidates were not returned. Their affinity is unknown.`] : [];
    if (!parsed.explainabilityAvailable) warnings.push("Optional explainability is unavailable or carries an upstream warning; returned order is used without invented explanations.");
    profiles[event.id] = { orderedIds: parsed.orderedIds, candidateCount: books.length, trace: { host: config.host, path: "/v2/insights", parameters, responseHash: result.responseHash, retrievedAt, warnings, rawContext: { anchors: event.anchors, results: parsed.rows, missingIds: parsed.missingIds, explainabilityAvailable: parsed.explainabilityAvailable } } };
  }
  return { mode: "qloo" as const, retrievedAt, candidateIds: books.map((book) => book.id), profiles, notes: ["Live Qloo response order only. Raw affinity scores are neither combined nor compared across requests.", "The selected artist/film interests describe an audience hypothesis, not every attendee or predicted sales.", "Missing candidates have unknown affinity; they are not negative evidence."] };
}

export function jsonResponse(value: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders } });
}

export function errorResponse(error: unknown): Response {
  const safe = error instanceof QlooError ? error : new QlooError(500, "INTERNAL_ERROR", "The request could not be completed.");
  return jsonResponse({ error: { code: safe.code, message: safe.message } }, safe.status, safe.retryAfter ? { "Retry-After": safe.retryAfter } : {});
}
