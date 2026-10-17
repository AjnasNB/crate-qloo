export type Book = {
  id: string;
  title: string;
  author: string;
  quantity: number;
  reserve: number;
  ageDays: number;
  price: number;
  color: string;
  entityId?: string;
};

export type Stall = {
  id: string;
  name: string;
  slots: number;
  anchors: { name: string; type: "artist" | "movie"; entityId?: string }[];
};

export type Evidence = {
  mode: "synthetic" | "qloo";
  retrievedAt: string;
  candidateIds: string[];
  profiles: Record<string, { orderedIds: string[]; candidateCount: number }>;
  notes: string[];
};

export type Assignments = Record<string, string[]>;
export type PlanChange = { eventId: string; bookId: string; action: "add" | "remove" };
export type SolveInput = {
  books: Book[];
  events: Stall[];
  evidence: Evidence;
  pins: Assignments;
  vetoes: Assignments;
  previous?: Assignments;
  strategy?: "cultural" | "oldest";
};
export type SolveResult = {
  feasible: boolean;
  assignments: Assignments;
  changes: PlanChange[];
  diagnostics: string[];
  /** Sum of 0–100 ordinal points per placement, including for the oldest-stock baseline. */
  utility: number;
  changeCount: number;
};

const compareId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const identifier = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 160;

/** Returned-list rank, starting at one. Unreturned candidates have unknown relevance. */
export function rankOf(evidence: Evidence, eventId: string, bookId: string): number | null {
  if (!evidence.candidateIds.includes(bookId) || !own(evidence.profiles, eventId)) return null;
  const index = evidence.profiles[eventId].orderedIds.indexOf(bookId);
  return index === -1 ? null : index + 1;
}

/** These are application-defined ordinal points, never probabilities or demand estimates. */
export function ordinalUtility(evidence: Evidence, eventId: string, bookId: string): number | null {
  const rank = rankOf(evidence, eventId, bookId);
  if (rank === null) return null;
  const count = evidence.profiles[eventId].orderedIds.length;
  return (100 * (count - rank + 1)) / count;
}

export function availableCopies(book: Book): number {
  return Math.max(0, book.quantity - book.reserve);
}

function validate(input: SolveInput): string[] {
  const errors: string[] = [];
  const { books, events, evidence, pins, vetoes, previous, strategy } = input;
  if (!Array.isArray(books) || books.length > 18) return ["Use at most 18 inventory titles."];
  if (!Array.isArray(events) || events.length < 1 || events.length > 2)
    return ["Choose one or two stalls."];
  if (strategy !== undefined && strategy !== "cultural" && strategy !== "oldest")
    errors.push("Choose the cultural or oldest-stock strategy.");
  const bookIds = new Set<string>();
  for (const book of books) {
    if (!book || !identifier(book.id) || typeof book.title !== "string" || !book.title.trim()) {
      errors.push("Every inventory title needs a unique ID and a title.");
      continue;
    }
    if (bookIds.has(book.id)) errors.push(`Duplicate inventory ID: ${book.id}.`);
    bookIds.add(book.id);
    if (![book.quantity, book.reserve].every((n) => Number.isSafeInteger(n) && n >= 0))
      errors.push(`${book.title}: quantity and reserve must be non-negative whole numbers.`);
    if (!Number.isSafeInteger(book.ageDays) || book.ageDays < 0 || book.ageDays > 1_000_000)
      errors.push(`${book.title}: stock age must be a whole number from 0 to 1,000,000 days.`);
  }
  const eventIds = new Set<string>();
  for (const event of events) {
    if (!event || !identifier(event.id)) {
      errors.push("Every stall needs a unique ID.");
      continue;
    }
    if (eventIds.has(event.id)) errors.push(`Duplicate stall ID: ${event.id}.`);
    eventIds.add(event.id);
    if (!Number.isInteger(event.slots) || event.slots < 1 || event.slots > 6)
      errors.push(`${event.name || event.id}: choose between one and six display slots.`);
  }
  if (
    !evidence ||
    !["synthetic", "qloo"].includes(evidence.mode) ||
    !Array.isArray(evidence.candidateIds) ||
    !evidence.profiles ||
    typeof evidence.profiles !== "object"
  ) {
    errors.push("Ranking evidence is missing or has an unsupported format.");
  } else {
    const candidates = new Set(evidence.candidateIds);
    if (candidates.size !== evidence.candidateIds.length)
      errors.push("Ranking evidence contains duplicate candidate IDs.");
    if (evidence.candidateIds.some((id) => !bookIds.has(id)))
      errors.push("Ranking evidence refers to titles outside this inventory. Retrieve rankings for the current inventory.");
    for (const event of events) {
      if (!event || !identifier(event.id)) continue;
      const profile = own(evidence.profiles, event.id) ? evidence.profiles[event.id] : undefined;
      if (
        !profile ||
        !Array.isArray(profile.orderedIds) ||
        !Number.isInteger(profile.candidateCount) ||
        profile.candidateCount !== candidates.size ||
        profile.orderedIds.length > profile.candidateCount
      ) {
        errors.push(`${event.name || event.id}: ranking evidence must describe this fixed candidate inventory.`);
        continue;
      }
      if (new Set(profile.orderedIds).size !== profile.orderedIds.length)
        errors.push(`${event.name || event.id}: ranking evidence contains duplicate result IDs.`);
      if (profile.orderedIds.some((id) => !candidates.has(id)))
        errors.push(`${event.name || event.id}: ranking evidence contains an unrequested title.`);
    }
  }
  for (const [label, record] of [["Pin", pins], ["Veto", vetoes], ["Previous plan", previous]] as const) {
    if (label === "Previous plan" && record === undefined) continue;
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(`${label} assignments must be a record of stall IDs and title IDs.`);
      continue;
    }
    for (const [eventId, ids] of Object.entries(record)) {
      if (!identifier(eventId) || (label !== "Previous plan" && !eventIds.has(eventId)))
        errors.push(`${label} refers to an unknown stall: ${eventId}.`);
      if (!Array.isArray(ids) || ids.some((id) => !identifier(id)) || new Set(ids).size !== ids.length) {
        errors.push(`${label} assignments must contain distinct title IDs.`);
        continue;
      }
      if (label !== "Previous plan" && ids.some((id) => !bookIds.has(id)))
        errors.push(`${label} refers to a title outside this inventory.`);
    }
  }
  return errors;
}

type State = {
  changes: number;
  objective: number;
  culturalPoints: number;
  selected: string[][];
};

function better(candidate: State, incumbent: State | undefined, repairing: boolean): boolean {
  if (!incumbent) return true;
  if (repairing && candidate.changes !== incumbent.changes) return candidate.changes < incumbent.changes;
  if (candidate.objective !== incumbent.objective) return candidate.objective > incumbent.objective;
  // Books and stalls are sorted by ID first, so this tie-break is independent of input order.
  for (let event = 0; event < candidate.selected.length; event++) {
    for (let slot = 0; slot < candidate.selected[event].length; slot++) {
      const order = compareId(candidate.selected[event][slot], incumbent.selected[event][slot]);
      if (order !== 0) return order < 0;
    }
  }
  return false;
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function assignmentChanges(previous: Assignments | undefined, next: Assignments): PlanChange[] {
  if (previous === undefined) return [];
  const changes: PlanChange[] = [];
  for (const eventId of [...new Set([...Object.keys(previous), ...Object.keys(next)])].sort(compareId)) {
    const oldIds = new Set(own(previous, eventId) ? previous[eventId] : []);
    const nextIds = new Set(own(next, eventId) ? next[eventId] : []);
    for (const bookId of [...oldIds].sort(compareId))
      if (!nextIds.has(bookId)) changes.push({ eventId, bookId, action: "remove" });
    for (const bookId of [...nextIds].sort(compareId))
      if (!oldIds.has(bookId)) changes.push({ eventId, bookId, action: "add" });
  }
  return changes;
}

/**
 * Exact allocation for at most 18 titles and two stalls. A title has four choices:
 * neither, A, B, both. DP keeps the best prefix at each pair of filled slot counts.
 * Stock-only repairs reuse the original rankings and minimize assignment changes
 * before optimizing fit. Pins are hard constraints and are never silently relaxed.
 */
export function solve(input: SolveInput): SolveResult {
  const eventList = Array.isArray(input?.events) ? input.events.filter((event) => event && identifier(event.id)) : [];
  const empty = (): Assignments => Object.fromEntries(eventList.map((event) => [event.id, []]));
  const fail = (diagnostics: string[]): SolveResult => ({
    feasible: false, assignments: empty(), changes: [], diagnostics, utility: 0, changeCount: 0,
  });
  if (!input || typeof input !== "object") return fail(["Planner input is missing."]);
  const invalid = validate(input);
  if (invalid.length) return fail(invalid);

  const { evidence, pins, vetoes, previous } = input;
  const strategy = input.strategy ?? "cultural";
  const repairing = previous !== undefined;
  const books = [...input.books].sort((a, b) => compareId(a.id, b.id));
  const events = [...input.events].sort((a, b) => compareId(a.id, b.id));
  const bookById = new Map(books.map((book) => [book.id, book]));
  const pinSets = events.map((event) => new Set(own(pins, event.id) ? pins[event.id] : []));
  const vetoSets = events.map((event) => new Set(own(vetoes, event.id) ? vetoes[event.id] : []));
  const previousSets = events.map((event) => new Set(previous && own(previous, event.id) ? previous[event.id] : []));
  const rankMaps = events.map((event) => new Map(evidence.profiles[event.id].orderedIds.map((id, i) => [id, i + 1])));
  const counts = events.map((event) => evidence.profiles[event.id].orderedIds.length);
  const eligible = books.map((book) => events.map((_, e) => rankMaps[e].has(book.id) && !vetoSets[e].has(book.id)));
  const pinCounts = books.map((book) => pinSets.reduce((count, set) => count + Number(set.has(book.id)), 0));
  const diagnostics: string[] = [];

  for (let e = 0; e < events.length; e++) {
    const event = events[e];
    if (pinSets[e].size > event.slots)
      diagnostics.push(`${event.name}: ${pinSets[e].size} pinned titles exceed ${event.slots} display slots.`);
    for (const id of pinSets[e]) {
      const book = bookById.get(id)!;
      if (vetoSets[e].has(id)) diagnostics.push(`${book.title} is both pinned and vetoed at ${event.name}. Remove one constraint.`);
      if (!rankMaps[e].has(id)) diagnostics.push(`${book.title} is pinned at ${event.name} but has no returned ranking evidence. Resolve or unpin it.`);
    }
  }
  for (let i = 0; i < books.length; i++) {
    if (pinCounts[i] > availableCopies(books[i]))
      diagnostics.push(`${books[i].title}: ${pinCounts[i]} pinned display copies need stock, but only ${availableCopies(books[i])} remain after reserve. Restore stock or unpin a placement.`);
  }
  if (diagnostics.length) return fail(diagnostics);

  // Residual capacity checks explain shared-stock conflicts before the exact solve.
  let required = 0;
  let sharedCapacity = 0;
  for (let e = 0; e < events.length; e++) {
    const needed = events[e].slots - pinSets[e].size;
    const possible = books.reduce((count, book, i) => count + Number(
      eligible[i][e] && !pinSets[e].has(book.id) && availableCopies(book) > pinCounts[i],
    ), 0);
    required += needed;
    if (possible < needed)
      diagnostics.push(`${events[e].name}: only ${possible} eligible, unpinned titles have available copies for ${needed} remaining slots. Missing ranking evidence is unknown; reduce slots, change a veto or restore stock.`);
  }
  for (let i = 0; i < books.length; i++) {
    const eligibleStalls = events.reduce((count, _, e) => count + Number(eligible[i][e] && !pinSets[e].has(books[i].id)), 0);
    sharedCapacity += Math.min(Math.max(0, availableCopies(books[i]) - pinCounts[i]), eligibleStalls);
  }
  if (sharedCapacity < required)
    diagnostics.push(`The stalls need ${required} further display copies but share only ${sharedCapacity} eligible copies after reserves and pins. Restore stock or reduce slots; constraints were not relaxed.`);
  if (diagnostics.length) return fail(diagnostics);

  // LCM scaling makes Borda-style rank comparisons exact even with unequal result counts.
  const scale = counts.reduce((multiple, count) => count > 0 ? (multiple * count) / gcd(multiple, count) : multiple, 1);
  let states = new Map<number, State>([[0, { changes: 0, objective: 0, culturalPoints: 0, selected: events.map(() => []) }]]);
  const width = (events[1]?.slots ?? 0) + 1;
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const requiredMask = pinSets.reduce((mask, set, e) => set.has(book.id) ? mask | (1 << e) : mask, 0);
    const nextStates = new Map<number, State>();
    for (const [key, state] of states) {
      const filled = [Math.floor(key / width), key % width];
      for (let mask = 0; mask < (1 << events.length); mask++) {
        if ((mask & requiredMask) !== requiredMask) continue;
        const chosen = events.map((_, e) => Boolean(mask & (1 << e)));
        const copies = chosen.reduce((sum, selected) => sum + Number(selected), 0);
        if (copies > availableCopies(book)) continue;
        if (chosen.some((selected, e) => selected && (!eligible[i][e] || filled[e] >= events[e].slots))) continue;
        let culturalPoints = 0;
        let changes = 0;
        for (let e = 0; e < events.length; e++) {
          if (chosen[e]) culturalPoints += (scale / counts[e]) * (counts[e] - rankMaps[e].get(book.id)! + 1);
          if (repairing && chosen[e] !== previousSets[e].has(book.id)) changes++;
        }
        const candidate: State = {
          changes: state.changes + changes,
          objective: state.objective + (strategy === "oldest" ? copies * book.ageDays : culturalPoints),
          culturalPoints: state.culturalPoints + culturalPoints,
          selected: state.selected.map((ids, e) => chosen[e] ? [...ids, book.id] : ids),
        };
        const nextKey = (filled[0] + Number(chosen[0])) * width + filled[1] + Number(chosen[1] ?? false);
        if (better(candidate, nextStates.get(nextKey), repairing)) nextStates.set(nextKey, candidate);
      }
    }
    states = nextStates;
  }
  const winner = states.get(events[0].slots * width + (events[1]?.slots ?? 0));
  if (!winner) return fail(["No complete allocation satisfies stock, reserves, ranking evidence, slots, pins and vetoes. No constraint was relaxed."]);
  const assignments: Assignments = Object.fromEntries(events.map((event, e) => [
    event.id,
    [...winner.selected[e]].sort((a, b) => strategy === "oldest"
      ? bookById.get(b)!.ageDays - bookById.get(a)!.ageDays || compareId(a, b)
      : rankMaps[e].get(a)! - rankMaps[e].get(b)! || compareId(a, b)),
  ]));
  const changes = assignmentChanges(previous, assignments);
  return {
    feasible: true, assignments, changes, diagnostics: [],
    utility: (winner.culturalPoints * 100) / scale, changeCount: changes.length,
  };
}
