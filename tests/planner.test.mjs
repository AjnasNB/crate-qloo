import assert from "node:assert/strict";
import test from "node:test";
import { availableCopies, ordinalUtility, rankOf, solve } from "../lib/planner.ts";

const book = (id, quantity = 1, ageDays = 30, reserve = 0) => ({
  id, title: `Book ${id}`, author: "Test Author", quantity, reserve, ageDays, price: 12, color: "#888888",
});
const stall = (id, slots = 1) => ({ id, name: `Stall ${id}`, slots, anchors: [] });
function setup(books, orders, slots = [1, 1]) {
  const events = Object.keys(orders).map((id, i) => stall(id, slots[i] ?? slots[0]));
  return {
    books, events,
    evidence: {
      mode: "synthetic", retrievedAt: "2026-10-17T00:00:00.000Z", candidateIds: books.map((b) => b.id),
      profiles: Object.fromEntries(Object.entries(orders).map(([id, orderedIds]) => [id, { orderedIds, candidateCount: books.length }])),
      notes: ["Synthetic test fixture, not Qloo data."],
    },
    pins: {}, vetoes: {},
  };
}
const placementSet = (assignments) => new Set(Object.entries(assignments).flatMap(([event, ids]) => ids.map((id) => `${event}/${id}`)));
const differences = (before, after) => {
  const a = placementSet(before), b = placementSet(after);
  return [...a].filter((id) => !b.has(id)).length + [...b].filter((id) => !a.has(id)).length;
};
const canonical = (assignments) => Object.fromEntries(Object.entries(assignments).sort().map(([id, ids]) => [id, [...ids].sort()]));

test("a shared scarce title is allocated globally instead of greedily", () => {
  const input = setup([book("a"), book("b"), book("c")], { A: ["a", "b", "c"], B: ["a", "b"] });
  const result = solve(input);
  assert.equal(result.feasible, true);
  assert.deepEqual(canonical(result.assignments), { A: ["b"], B: ["a"] });
  assert.ok(Math.abs(result.utility - (100 + 200 / 3)) < 1e-9);
  assert.deepEqual(result.changes, []);
  assert.equal(result.changeCount, 0);
});

test("a second copy permits a title at both stalls; reserves remove that option", () => {
  const input = setup([book("a", 2), book("b")], { A: ["a", "b"], B: ["a", "b"] });
  assert.deepEqual(solve(input).assignments, { A: ["a"], B: ["a"] });
  input.books[0].reserve = 1;
  assert.deepEqual(canonical(solve(input).assignments), { A: ["a"], B: ["b"] });
  assert.equal(availableCopies({ ...input.books[0], quantity: 0 }), 0);
});

test("unreturned titles are unknown and ineligible, including for oldest-stock baseline", () => {
  const input = setup([book("a", 1, 1), book("b", 1, 999), book("c", 1, 50)], { A: ["a"], B: ["c"] });
  assert.equal(rankOf(input.evidence, "A", "a"), 1);
  assert.equal(rankOf(input.evidence, "A", "b"), null);
  assert.equal(ordinalUtility(input.evidence, "A", "b"), null);
  assert.equal(ordinalUtility(input.evidence, "A", "a"), 100);
  const result = solve({ ...input, strategy: "oldest" });
  assert.deepEqual(result.assignments, { A: ["a"], B: ["c"] });
  input.events[0].slots = 2;
  const impossible = solve(input);
  assert.equal(impossible.feasible, false);
  assert.match(impossible.diagnostics.join(" "), /unknown/);
});

test("pins, vetoes and capacity are hard constraints with explicit conflicts", () => {
  const input = setup([book("a"), book("b"), book("c")], { A: ["a", "b", "c"], B: ["a", "b", "c"] });
  assert.deepEqual(canonical(solve({ ...input, pins: { A: ["c"] }, vetoes: { B: ["a"] } }).assignments), { A: ["c"], B: ["b"] });
  for (const constraints of [
    { pins: { A: ["a"] }, vetoes: { A: ["a"] } },
    { pins: { A: ["a"], B: ["a"] } },
    { pins: { A: ["a", "b"] } },
  ]) {
    const result = solve({ ...input, ...constraints });
    assert.equal(result.feasible, false);
    assert.deepEqual(result.assignments, { A: [], B: [] });
    assert.equal(result.changeCount, 0);
    assert.ok(result.diagnostics.length > 0);
  }
  const unknownPin = solve({ ...input, evidence: { ...input.evidence, profiles: { ...input.evidence.profiles, A: { orderedIds: ["b", "c"], candidateCount: 3 } } }, pins: { A: ["a"] } });
  assert.equal(unknownPin.feasible, false);
  assert.match(unknownPin.diagnostics.join(" "), /no returned ranking evidence/);
});

test("shared stock shortage is detected even when each stall has enough individual candidates", () => {
  const input = setup([book("a"), book("b"), book("c")], { A: ["a", "b", "c"], B: ["a", "b", "c"] }, [2, 2]);
  const result = solve(input);
  assert.equal(result.feasible, false);
  assert.match(result.diagnostics.join(" "), /share only 3/);
});

test("repair keeps existing placements ahead of an otherwise higher-scoring reshuffle", () => {
  const input = setup([book("a"), book("b"), book("c"), book("d")], { A: ["a", "b", "c", "d"], B: ["b", "c", "a", "d"] });
  const previous = { A: ["a"], B: ["b"] };
  input.books[0].quantity = 0;
  const repaired = solve({ ...input, previous });
  assert.equal(repaired.feasible, true);
  assert.deepEqual(repaired.assignments, { A: ["c"], B: ["b"] });
  assert.deepEqual(repaired.changes, [
    { eventId: "A", bookId: "a", action: "remove" },
    { eventId: "A", bookId: "c", action: "add" },
  ]);
  assert.equal(repaired.changeCount, 2);
  const pinned = solve({ ...input, previous, pins: { A: ["a"] } });
  assert.equal(pinned.feasible, false);
  assert.match(pinned.diagnostics.join(" "), /Restore stock or unpin/);
});

test("repairs count removed inventory or stalls and explicit empty previous plans", () => {
  const input = setup([book("a"), book("b")], { A: ["a", "b"] });
  const result = solve({ ...input, previous: { A: ["deleted-book"], "deleted-stall": ["x"] } });
  assert.equal(result.changeCount, 3);
  assert.equal(result.changeCount, differences({ A: ["deleted-book"], "deleted-stall": ["x"] }, result.assignments));
  assert.equal(solve({ ...input, previous: {} }).changeCount, 1);
});

test("oldest-stock baseline changes only the objective and retains cultural scoring", () => {
  const input = setup([book("a", 1, 1), book("b", 1, 20), book("c", 1, 100)], { A: ["a", "b", "c"] });
  const result = solve({ ...input, strategy: "oldest" });
  assert.deepEqual(result.assignments, { A: ["c"] });
  assert.ok(Math.abs(result.utility - 100 / 3) < 1e-9);
  assert.deepEqual(solve(input).assignments, { A: ["a"] });
  assert.deepEqual(solve({ ...input, strategy: "oldest", previous: { A: ["a"] } }).assignments, { A: ["a"] });
});

test("input order cannot change a tied optimum and solver does not mutate inputs", () => {
  const input = setup([book("a"), book("b"), book("c")], { A: ["a", "b", "c"], B: ["a", "b", "c"] });
  const original = structuredClone(input);
  const result = solve(input);
  const reordered = { ...input, books: [...input.books].reverse(), events: [...input.events].reverse() };
  assert.deepEqual(solve(reordered), result);
  assert.deepEqual(input, original);
});

test("invalid, duplicate and off-inventory evidence is rejected rather than repaired silently", () => {
  const input = setup([book("a"), book("b")], { A: ["a", "b"] });
  const variants = [
    { ...input, books: [...input.books, input.books[0]] },
    { ...input, books: [{ ...input.books[0], quantity: -1 }, input.books[1]] },
    { ...input, books: [{ ...input.books[0], reserve: 0.5 }, input.books[1]] },
    { ...input, events: [stall("A", 7)] },
    { ...input, events: [] },
    { ...input, books: Array.from({ length: 19 }, (_, i) => book(String(i))) },
    { ...input, evidence: { ...input.evidence, profiles: { A: { orderedIds: ["a", "a"], candidateCount: 2 } } } },
    { ...input, evidence: { ...input.evidence, profiles: { A: { orderedIds: ["a", "x"], candidateCount: 2 } } } },
    { ...input, evidence: { ...input.evidence, candidateIds: ["a", "x"] } },
    { ...input, evidence: { ...input.evidence, profiles: {} } },
    { ...input, pins: { missing: ["a"] } },
    { ...input, vetoes: { A: ["x"] } },
  ];
  for (const variant of variants) {
    const result = solve(variant);
    assert.equal(result.feasible, false);
    assert.ok(result.diagnostics.length > 0);
  }
});

test("an impossible shop reserve invalidates the whole stock input even when that title is unused", () => {
  const input = setup([book("invalid", 0, 30, 2), book("available", 2)], { A: ["available", "invalid"] });
  const result = solve(input);
  assert.equal(result.feasible, false);
  assert.deepEqual(result.assignments, { A: [] });
  assert.match(result.diagnostics.join(" "), /reserve cannot exceed stock quantity/);
});

test("bounded worst-case inventory fills twelve slots", () => {
  const books = Array.from({ length: 18 }, (_, i) => book(`b${String(i).padStart(2, "0")}`, 2));
  const ids = books.map((b) => b.id);
  const result = solve(setup(books, { A: ids, B: [...ids].reverse() }, [6, 6]));
  assert.equal(result.feasible, true);
  assert.equal(result.assignments.A.length, 6);
  assert.equal(result.assignments.B.length, 6);
  assert.equal(placementSet(result.assignments).size, 12);
});

// Independent exhaustive oracle: enumerate every placement mask, then evaluate
// only complete allocations. It deliberately does not reuse planner helpers.
function bruteForce(input) {
  const choices = 1 << input.events.length;
  let best = null;
  const selected = Object.fromEntries(input.events.map((e) => [e.id, []]));
  function visit(index) {
    if (index < input.books.length) {
      const b = input.books[index];
      for (let mask = 0; mask < choices; mask++) {
        let used = 0;
        let allowed = true;
        for (let e = 0; e < input.events.length; e++) {
          const event = input.events[e];
          const chosen = Boolean(mask & (1 << e));
          const profile = input.evidence.profiles[event.id];
          if ((input.pins[event.id] ?? []).includes(b.id) && !chosen) allowed = false;
          if (chosen) {
            used++;
            if (selected[event.id].length >= event.slots || !profile.orderedIds.includes(b.id) || (input.vetoes[event.id] ?? []).includes(b.id)) allowed = false;
          }
        }
        if (used > Math.max(0, b.quantity - b.reserve) || !allowed) continue;
        for (let e = 0; e < input.events.length; e++) if (mask & (1 << e)) selected[input.events[e].id].push(b.id);
        visit(index + 1);
        for (let e = 0; e < input.events.length; e++) if (mask & (1 << e)) selected[input.events[e].id].pop();
      }
      return;
    }
    if (input.events.some((e) => selected[e.id].length !== e.slots)) return;
    let score = 0, cultural = 0;
    for (const event of input.events) {
      const order = input.evidence.profiles[event.id].orderedIds;
      for (const id of selected[event.id]) {
        const rankPoints = (100 * (order.length - order.indexOf(id))) / order.length;
        cultural += rankPoints;
        score += input.strategy === "oldest" ? input.books.find((b) => b.id === id).ageDays : rankPoints;
      }
    }
    const changes = input.previous === undefined ? 0 : differences(input.previous, selected);
    const tie = JSON.stringify(canonical(selected));
    const betterScore = !best || (input.previous !== undefined && changes !== best.changes
      ? changes < best.changes
      : Math.abs(score - best.score) > 1e-9 ? score > best.score : tie < best.tie);
    if (betterScore) best = { score, changes, tie, cultural, assignments: structuredClone(selected) };
  }
  visit(0);
  return best;
}

test("exact DP matches independent brute-force optima across seeded allocation and repair cases", () => {
  let seed = 0x1a2b3c4d;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const integer = (max) => Math.floor(random() * max);
  const shuffle = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = integer(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  let feasible = 0, infeasible = 0, repairs = 0;
  for (let run = 0; run < 220; run++) {
    // Optimization comparisons use physically valid stock; invalid reserves are
    // covered separately as rejected inputs rather than zero-availability stock.
    const books = Array.from({ length: 3 + integer(4) }, (_, i) => {
      const quantity = integer(3);
      return book(`b${i}`, quantity, integer(200), integer(quantity + 1));
    });
    const ids = books.map((b) => b.id);
    const events = integer(4) === 0 ? ["A"] : ["A", "B"];
    const orders = Object.fromEntries(events.map((id) => [id, shuffle(ids).filter(() => random() > 0.17)]));
    const input = setup(books, orders, events.map(() => 1 + integer(2)));
    input.strategy = run % 2 ? "cultural" : "oldest";
    for (const event of input.events) {
      input.pins[event.id] = ids.filter(() => random() < 0.08);
      input.vetoes[event.id] = ids.filter(() => random() < 0.12);
    }
    if (run % 3 !== 0) {
      input.previous = Object.fromEntries(events.map((id) => [id, shuffle(ids).slice(0, 1 + integer(2))]));
      repairs++;
    }
    const expected = bruteForce(input);
    const actual = solve(input);
    assert.equal(actual.feasible, expected !== null, `feasibility mismatch in seeded run ${run}`);
    if (!expected) { infeasible++; continue; }
    feasible++;
    assert.equal(actual.changeCount, expected.changes, `repair mismatch in run ${run}`);
    assert.ok(Math.abs(actual.utility - expected.cultural) < 1e-8, `utility mismatch in run ${run}`);
    assert.deepEqual(canonical(actual.assignments), canonical(expected.assignments), `assignment mismatch in run ${run}`);
  }
  assert.ok(feasible >= 20, `only ${feasible} feasible cases exercised`);
  assert.ok(infeasible >= 20, `only ${infeasible} infeasible cases exercised`);
  assert.ok(repairs >= 100);
});
