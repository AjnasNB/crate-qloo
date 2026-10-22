import type { Book, Evidence, Stall } from "./planner";

/** Work-level Qloo identities reviewed from live search on 2026-10-22.
 * Title/author metadata supports these choices; ISBN editions are not certified.
 * All quantities, prices, and shelf ages remain fictional. See docs/LIVE-QLOO.md.
 */
export const SAMPLE_BOOKS: Book[] = [
  { id: "b1", entityId: "40e2e5ee-a52c-4dea-986a-42f3e1b7e28b", title: "Kindred", author: "Octavia E. Butler", quantity: 1, reserve: 0, ageDays: 184, price: 17, color: "#de7754" },
  { id: "b2", entityId: "471011b7-34b3-43fe-bcc1-23294ffd6cfb", title: "Parable of the Sower", author: "Octavia E. Butler", quantity: 2, reserve: 0, ageDays: 226, price: 18, color: "#a59365" },
  { id: "b3", entityId: "c75ea743-c08d-4dbf-b456-ac6b71ac14ac", title: "The Dispossessed", author: "Ursula K. Le Guin", quantity: 1, reserve: 0, ageDays: 318, price: 19, color: "#788368" },
  { id: "b4", entityId: "4d73c871-cc0f-4fc8-88cd-7c59b26e087e", title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", quantity: 2, reserve: 1, ageDays: 149, price: 18, color: "#6c8990" },
  { id: "b5", entityId: "1111fc9c-2e04-4d7a-abc4-29e957880366", title: "The Lathe of Heaven", author: "Ursula K. Le Guin", quantity: 2, reserve: 0, ageDays: 267, price: 17, color: "#817394" },
  { id: "b6", entityId: "52d16352-df46-4cf4-9b40-eec1fa3011d8", title: "Giovanni’s Room", author: "James Baldwin", quantity: 1, reserve: 0, ageDays: 198, price: 16, color: "#bc727d" },
  { id: "b7", entityId: "0300e9be-da79-4805-bdbf-8c45e46ba07b", title: "If Beale Street Could Talk", author: "James Baldwin", quantity: 2, reserve: 0, ageDays: 123, price: 17, color: "#b89b4d" },
  { id: "b8", entityId: "8b7b61c3-bf4d-4b18-a443-13db229dc913", title: "Beloved", author: "Toni Morrison", quantity: 2, reserve: 1, ageDays: 174, price: 18, color: "#986c5e" },
  { id: "b9", entityId: "122c0f36-5a9b-4030-8bc1-cbdeea5cc6ce", title: "Jazz", author: "Toni Morrison", quantity: 2, reserve: 0, ageDays: 241, price: 17, color: "#c28449" },
  { id: "b10", entityId: "3adbb2a8-6788-4cd9-93c4-417caf2c789b", title: "Never Let Me Go", author: "Kazuo Ishiguro", quantity: 2, reserve: 0, ageDays: 212, price: 18, color: "#729591" },
  { id: "b11", entityId: "23e536b4-9185-4c01-ae22-2d65a8c9cecc", title: "Station Eleven", author: "Emily St. John Mandel", quantity: 2, reserve: 0, ageDays: 156, price: 18, color: "#8c91a0" },
  { id: "b12", entityId: "55908017-4cfd-4688-9a7e-7b1ff04b171d", title: "Piranesi", author: "Susanna Clarke", quantity: 1, reserve: 0, ageDays: 289, price: 19, color: "#71917e" },
];

/** Fictional, separately staffed stalls departing simultaneously. No artist affiliation. */
export const SAMPLE_EVENTS: Stall[] = [
  { id: "a", name: "Future Frequencies", slots: 4, anchors: [
    { name: "Janelle Monáe", type: "artist", entityId: "5032d31e-1b79-4a40-901d-dcddfa0f4493" },
    { name: "Blade Runner 2049", type: "movie", entityId: "3a02361c-987b-4f7e-9aad-071c3853ad92" },
  ] },
  { id: "b", name: "Soul & City", slots: 4, anchors: [
    { name: "Nina Simone", type: "artist", entityId: "aeb7da4d-d5a8-43f1-9881-74da17d8d521" },
    { name: "Moonlight", type: "movie", entityId: "2955f3c4-36ab-49f3-a818-3597f35ef46c" },
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
