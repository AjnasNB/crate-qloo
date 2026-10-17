import type { Book, Evidence, Stall } from "./planner";

/** Real bibliographic pairs; all quantities, prices, and shelf ages are fictional. */
export const SAMPLE_BOOKS: Book[] = [
  { id: "b1", title: "Kindred", author: "Octavia E. Butler", quantity: 1, reserve: 0, ageDays: 184, price: 17, color: "#de7754" },
  { id: "b2", title: "Parable of the Sower", author: "Octavia E. Butler", quantity: 2, reserve: 0, ageDays: 226, price: 18, color: "#a59365" },
  { id: "b3", title: "The Dispossessed", author: "Ursula K. Le Guin", quantity: 1, reserve: 0, ageDays: 318, price: 19, color: "#788368" },
  { id: "b4", title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", quantity: 2, reserve: 1, ageDays: 149, price: 18, color: "#6c8990" },
  { id: "b5", title: "The Lathe of Heaven", author: "Ursula K. Le Guin", quantity: 2, reserve: 0, ageDays: 267, price: 17, color: "#817394" },
  { id: "b6", title: "Giovanni’s Room", author: "James Baldwin", quantity: 1, reserve: 0, ageDays: 198, price: 16, color: "#bc727d" },
  { id: "b7", title: "If Beale Street Could Talk", author: "James Baldwin", quantity: 2, reserve: 0, ageDays: 123, price: 17, color: "#b89b4d" },
  { id: "b8", title: "Beloved", author: "Toni Morrison", quantity: 2, reserve: 1, ageDays: 174, price: 18, color: "#986c5e" },
  { id: "b9", title: "Jazz", author: "Toni Morrison", quantity: 2, reserve: 0, ageDays: 241, price: 17, color: "#c28449" },
  { id: "b10", title: "Never Let Me Go", author: "Kazuo Ishiguro", quantity: 2, reserve: 0, ageDays: 212, price: 18, color: "#729591" },
  { id: "b11", title: "Station Eleven", author: "Emily St. John Mandel", quantity: 2, reserve: 0, ageDays: 156, price: 18, color: "#8c91a0" },
  { id: "b12", title: "Piranesi", author: "Susanna Clarke", quantity: 1, reserve: 0, ageDays: 289, price: 19, color: "#71917e" },
];

/** Fictional, separately staffed stalls departing simultaneously. No artist affiliation. */
export const SAMPLE_EVENTS: Stall[] = [
  { id: "a", name: "Future Frequencies", slots: 4, anchors: [
    { name: "Janelle Monáe", type: "artist" },
    { name: "Blade Runner 2049", type: "movie" },
  ] },
  { id: "b", name: "Soul & City", slots: 4, anchors: [
    { name: "Nina Simone", type: "artist" },
    { name: "Moonlight", type: "movie" },
  ] },
];

// Hand-authored permutations exercise competition for single-copy books. These are
// software fixtures: they are not inferred tastes, API data, or literary judgments.
const CURATED_ORDERS: Record<string, string[]> = {
  a: ["b12", "b3", "b1", "b10", "b2", "b5", "b4", "b11", "b6", "b8", "b9", "b7"],
  b: ["b1", "b6", "b12", "b9", "b7", "b8", "b10", "b3", "b11", "b2", "b5", "b4"],
};

const ORIGINAL_ANCHORS = new Map(SAMPLE_EVENTS.map((event) => [event.id, anchorSignature(event)]));
const ORIGINAL_BOOKS = new Map(SAMPLE_BOOKS.map((book) => [book.id, `${book.title}|${book.author}`]));

function anchorSignature(event: Stall): string {
  return event.anchors.map((anchor) => `${anchor.type}:${anchor.name.trim().toLocaleLowerCase("en-US")}`).join("|");
}

function hash(text: string): number {
  let value = 2_166_136_261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16_777_619);
  return value >>> 0;
}

/** Explicit simulation only. Changing inputs changes a fixture, never a claimed graph result. */
export function makeSyntheticEvidence(books: Book[], events: Stall[]): Evidence {
  const candidateIds = books.map((book) => book.id);
  const sampleBooks = books.every((book) => ORIGINAL_BOOKS.get(book.id) === `${book.title}|${book.author}`);
  const profiles: Evidence["profiles"] = {};
  for (const event of events) {
    const signature = anchorSignature(event);
    const curated = sampleBooks && signature === ORIGINAL_ANCHORS.get(event.id) ? CURATED_ORDERS[event.id] : undefined;
    const orderedIds = curated
      ? [...curated.filter((id) => candidateIds.includes(id)), ...candidateIds.filter((id) => !curated.includes(id))]
      : [...candidateIds].sort((left, right) => hash(`${signature}|${event.id}|${left}`) - hash(`${signature}|${event.id}|${right}`) || left.localeCompare(right));
    profiles[event.id] = { orderedIds, candidateCount: candidateIds.length };
  }
  return {
    mode: "synthetic",
    retrievedAt: new Date().toISOString(),
    candidateIds,
    profiles,
    notes: [
      "Simulation: rankings are curated fixtures for the sample lineups and deterministic hashes for other inputs. No Qloo API call was made.",
      "Sample events, stock quantities, shop reserves, prices, and shelf ages are fictional. Artists and films have no affiliation with Crate.",
      "These orders test allocation and repair behavior. They are not evidence of cultural affinity, purchase likelihood, or audience demand.",
    ],
  };
}
