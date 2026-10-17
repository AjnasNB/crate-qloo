"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, Box, Check, ChevronRight, CircleHelp, FileText, LockKeyhole, Minus, Music2, Pin, Plus, RefreshCw, Search, Settings2, ShieldCheck, UnlockKeyhole, Upload, X } from "./icons";
import { SAMPLE_BOOKS, SAMPLE_EVENTS, makeSyntheticEvidence } from "../lib/sample";
import { inventoryCsv, packingCsv, parseInventoryCsv } from "../lib/csv";
import { rankOf, solve, type Assignments, type Book, type Evidence, type SolveResult, type Stall } from "../lib/planner";

type Modal = "stock" | "about" | "evidence" | "programme" | "match" | null;
type Match = { entityId: string; name: string; type: "book" | "artist" | "movie"; description?: string; author?: string };
type MatchTarget = { bookId?: string; eventId?: string; anchorIndex?: number; query: string; type: "book" | "artist" | "movie" };
const clone = <T,>(value: T): T => structuredClone(value);
const programmeKey = (event: Stall) => JSON.stringify(event.anchors.map((a) => [a.type, a.name, a.entityId ?? ""]));
const candidateKey = (books: Book[]) => JSON.stringify(books.map((b) => [b.id, b.title, b.author, b.entityId ?? ""]).sort());
function coverInk(background: string): "#000000" | "#ffffff" {
  const hex = /^#[\da-f]{6}$/i.test(background) ? background : "#ffffff";
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const channels = rgb.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
}
function saveFile(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function post<T,>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  catch { throw new Error("The server could not be reached. Your stock and decisions are still in this session. Check the connection and try again."); }
  let data: T & { error?: { message?: string } };
  try { data = await response.json() as T & { error?: { message?: string } }; }
  catch { throw new Error("The server returned an unreadable response. Your inputs are still in this session; try again later."); }
  if (!response.ok) throw new Error(data?.error?.message ?? "The request failed. No replacement evidence was used.");
  return data as T;
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>(() => clone(SAMPLE_BOOKS));
  const [events, setEvents] = useState<Stall[]>(() => clone(SAMPLE_EVENTS));
  const [pins, setPins] = useState<Assignments>({ a: [], b: [] });
  const [vetoes, setVetoes] = useState<Assignments>({ a: [], b: [] });
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState<SolveResult | null>(null);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [snapshot, setSnapshot] = useState<Evidence | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [live, setLive] = useState(false);
  const [sampleStock, setSampleStock] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [editingEvent, setEditingEvent] = useState("a");
  const [matchTarget, setMatchTarget] = useState<MatchTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const cachedCandidates = useRef("");
  const cachedProgrammes = useRef<Record<string, string>>({});
  const plannedContext = useRef("");
  const matchEpoch = useRef(0);
  const matchedTarget = useRef("");

  useEffect(() => { fetch("/api/config").then(async (r) => r.ok ? await r.json() as { configured?: boolean } : null).then((c) => setConfigured(c?.configured === true)).catch(() => setConfigured(false)); }, []);
  useEffect(() => {
    if (modal) {
      if (!dialog.current?.open) {
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.current?.showModal();
      }
      dialog.current?.querySelector<HTMLElement>("#dialog-title")?.focus({ preventScroll: true });
    } else {
      if (dialog.current?.open) dialog.current.close();
      if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [modal]);

  const dirty = () => { revision.current += 1; if (plan) setStale(true); setError(""); };
  const updateBook = (id: string, field: "quantity" | "reserve", value: number) => {
    dirty(); const next = Math.max(0, Math.min(99, Math.floor(Number.isFinite(value) ? value : 0)));
    setBooks((old) => old.map((b) => b.id === id ? { ...b, [field]: next, ...(field === "quantity" ? { reserve: Math.min(b.reserve, next) } : {}) } : b));
  };
  const updateEvent = (id: string, change: Partial<Stall>) => { dirty(); setEvents((old) => old.map((e) => e.id === id ? { ...e, ...change } : e)); };
  const effectivePins: Assignments = Object.fromEntries(events.map((e) => [e.id, locked[e.id] && plan ? plan.assignments[e.id] : pins[e.id] ?? []]));
  const effectiveVetoes: Assignments = Object.fromEntries(events.map((e) => [e.id, locked[e.id] && plan ? books.filter((b) => !plan.assignments[e.id]?.includes(b.id)).map((b) => b.id) : vetoes[e.id] ?? []]));
  const baseline = snapshot && plan?.feasible ? solve({ books, events, evidence: snapshot, pins: effectivePins, vetoes: effectiveVetoes, strategy: "oldest" }) : null;
  const totalCopies = books.reduce((sum, b) => sum + b.quantity, 0);
  const reserveCopies = books.reduce((sum, b) => sum + b.reserve, 0);
  const packedCopies = plan?.feasible ? Object.values(plan.assignments).reduce((sum, ids) => sum + ids.length, 0) : 0;
  const ready = Boolean(plan?.feasible && !stale && !busy);
  const editingProgramme = events.find((event) => event.id === editingEvent);
  const sourceLabel = `${sampleStock ? "Sample stock" : "Imported stock"}; ${snapshot?.mode === "qloo" ? "live Qloo returned ranks" : "synthetic fixture rankings, no Qloo call"}${snapshot ? `; original snapshot ${snapshot.retrievedAt}` : "; no plan snapshot yet"}`;

  async function pack() {
    setBusy(true); setError(""); setSteps([]); const started = revision.current;
    try {
      const badReserve = books.find((b) => b.reserve > b.quantity);
      if (badReserve) throw new Error(`${badReserve.title}: shop reserve exceeds quantity. Update stock or reserve before packing.`);
      if (events.some((event) => !event.name.trim() || event.anchors.some((anchor) => !anchor.name.trim()))) throw new Error("Give both stalls a name and fill in every artist and film name in Edit programme before packing.");
      let next: Evidence;
      let acquired: string;
      if (live) {
        if (books.some((b) => !b.entityId) || events.some((e) => e.anchors.some((a) => !a.entityId))) throw new Error("Confirm a Qloo entity for every book and programme anchor first. Open Manage stock and Edit programme to search and choose matches.");
        const key = candidateKey(books);
        const sameInventory = evidence?.mode === "qloo" && cachedCandidates.current === key;
        const changed = sameInventory ? events.filter((e) => cachedProgrammes.current[e.id] !== programmeKey(e)) : events;
        if (changed.length) {
          const fetched = await post<Evidence>("/api/evidence", { books: books.map((b) => ({ id: b.id, entityId: b.entityId })), events: changed });
          next = { ...fetched, profiles: { ...(sameInventory ? evidence!.profiles : {}), ...fetched.profiles } };
          acquired = `Retrieved live Qloo ranks for ${changed.length} changed programme${changed.length === 1 ? "" : "s"}; unchanged contexts retained.`;
          if (revision.current !== started) throw new Error("Inputs changed during the request. Review the current inputs and pack again.");
          cachedCandidates.current = key;
          cachedProgrammes.current = Object.fromEntries(events.map((e) => [e.id, programmeKey(e)]));
        } else { next = evidence!; acquired = "Reused the original Qloo evidence. Stock changes do not change the audience query."; }
      } else { next = makeSyntheticEvidence(books, events); acquired = "Loaded explicitly synthetic fixture ranks. No Qloo request was made."; }
      setEvidence(next);
      const context = JSON.stringify([live, candidateKey(books), events.map(programmeKey)]);
      const repairing = Boolean(plan?.feasible && context === plannedContext.current);
      const result = solve({ books, events, evidence: next, pins: effectivePins, vetoes: effectiveVetoes, ...(repairing ? { previous: plan!.assignments } : {}) });
      if (!repairing && plan?.feasible && result.feasible) {
        result.changes = events.flatMap((event) => [
          ...(plan.assignments[event.id] ?? []).filter((id) => !result.assignments[event.id].includes(id)).map((bookId) => ({ eventId: event.id, bookId, action: "remove" as const })),
          ...result.assignments[event.id].filter((id) => !plan.assignments[event.id]?.includes(id)).map((bookId) => ({ eventId: event.id, bookId, action: "add" as const })),
        ]);
        result.changeCount = result.changes.length;
      }
      setSteps([acquired, `Checked ${books.length} titles, shop reserves, pins, vetoes and packed crates.`, result.feasible ? `${repairing ? "Repaired with minimum disruption:" : plan ? "Rebalanced both stalls after programme or candidate changes:" : "Packed:"} ${Object.values(result.assignments).flat().length} placements, ${result.changeCount} changes${plan ? " to the previous plan" : ""}.` : "No complete plan satisfies every constraint. Nothing was silently relaxed."]);
      if (!result.feasible) { setStale(Boolean(plan)); throw new Error(result.diagnostics.join(" ")); }
      setSnapshot(next); setPlan(result); setStale(false); plannedContext.current = context;
    } catch (err) { setError(err instanceof Error ? err.message : "The plan could not be completed."); }
    finally { setBusy(false); }
  }
  function toggleDecision(kind: "pin" | "veto", eventId: string, bookId: string) {
    dirty(); const setter = kind === "pin" ? setPins : setVetoes;
    setter((old) => ({ ...old, [eventId]: old[eventId]?.includes(bookId) ? old[eventId].filter((id) => id !== bookId) : [...old[eventId] ?? [], bookId] }));
  }
  function closeModal() { matchEpoch.current += 1; matchedTarget.current = ""; setSearchBusy(false); setMatches([]); setModal(null); }
  function openMatch(target: MatchTarget) { matchEpoch.current += 1; matchedTarget.current = ""; setSearchBusy(false); setMatchTarget(target); setSearchQuery(target.query.slice(0, 120)); setMatches([]); setSearchMessage(""); setModal("match"); }
  async function search() {
    if (!matchTarget) return;
    const request = ++matchEpoch.current;
    const target = matchTarget;
    const query = searchQuery;
    matchedTarget.current = "";
    setSearchBusy(true); setSearchMessage(""); setMatches([]);
    try {
      const result = await post<{ entities: Match[] }>("/api/search", { query, type: target.type });
      if (request !== matchEpoch.current) return;
      if (result.entities.some((entity) => entity.type !== target.type)) throw new Error("A search result had the wrong entity type. No match was applied.");
      matchedTarget.current = JSON.stringify([target, query]);
      setMatches(result.entities);
      setSearchMessage(result.entities.length ? `${result.entities.length} matches returned. Review the metadata and confirm the right entity.` : "No matches returned. Revise the search; no entity was guessed.");
    } catch (err) { if (request === matchEpoch.current) setSearchMessage(err instanceof Error ? err.message : "Search failed."); }
    finally { if (request === matchEpoch.current) setSearchBusy(false); }
  }
  function chooseMatch(match: Match) {
    if (!matchTarget || match.type !== matchTarget.type || matchedTarget.current !== JSON.stringify([matchTarget, searchQuery])) return;
    matchEpoch.current += 1; matchedTarget.current = ""; dirty();
    if (matchTarget.bookId) setBooks((old) => old.map((b) => b.id === matchTarget.bookId ? { ...b, entityId: match.entityId } : b));
    else setEvents((old) => old.map((e) => e.id === matchTarget.eventId ? { ...e, anchors: e.anchors.map((a, i) => i === matchTarget.anchorIndex ? { ...a, entityId: match.entityId } : a) } : e));
    setModal(matchTarget.bookId ? "stock" : "programme");
  }
  async function importFile(file?: File) {
    if (!file) return;
    try { const imported = parseInventoryCsv(await file.text()); dirty(); setBooks(imported); setSampleStock(false); setPins({ a: [], b: [] }); setVetoes({ a: [], b: [] }); setLocked({}); setPlan(null); setStale(false); setSnapshot(null); setEvidence(null); setSteps([`Imported ${imported.length} local stock records. No Qloo identities were inferred.`]); }
    catch (err) { setError(err instanceof Error ? err.message : "CSV import failed."); }
    if (upload.current) upload.current.value = "";
  }

  return <>
    <div className="desk-app"><a className="skip-link" href="#desk">Skip to packing desk</a>
      <header className="site-header"><a className="wordmark" href="#desk" aria-label="Crate packing desk"><Box size={29} strokeWidth={1.6} />crate<span>.</span></a><nav aria-label="Main navigation"><a href="#desk" className="active">Packing desk</a><button type="button" onClick={() => setModal("about")}>About Crate</button></nav><span className="developer">Developed by <strong>Ajnas N B</strong></span></header>
      <main id="desk" className="page-shell" tabIndex={-1}>
        <section className="intro"><div><p className="intro-kicker"><span className="little-line" /> A little planning. A lot of possibility.</p><h1>Good books.<br />The right crowd.</h1><p className="intro-copy">Two pop-ups. One stockroom. Find a place for your books,<br className="desktop-break" /> then get the crates out the door.</p></div><aside className="editorial-note"><span className="note-icon"><Box size={25} strokeWidth={1.4} /></span><p>For the books that<br />deserve another audience.</p><span>Built for independent booksellers.</span></aside></section>
        <div className={`source-strip ${live ? "live-strip" : ""}`}><span className="status-dot" /><p>{live ? (snapshot?.mode === "qloo" && !stale ? "Live Qloo ranking snapshot in use. Programme interests remain an audience hypothesis." : "Live setup selected. The displayed plan keeps its original source until a live plan succeeds.") : `${sampleStock ? "Sample stock" : "Imported stock"} & synthetic rankings. ${configured ? "A server key is configured; live access has not been verified." : "Qloo access awaiting approval."}`}</p><button type="button" onClick={() => setModal("evidence")}>See the evidence <ArrowRight size={14} /></button></div>
        <div className="workspace-heading"><div><h2>Your packing desk</h2><p>Separate stalls. Shared stock. Both leave at the same time.</p></div><div className="primary-actions"><button type="button" className="button secondary" onClick={() => setModal("stock")} disabled={busy}><Settings2 size={16} />Manage stock</button><button type="button" className="button primary" onClick={pack} disabled={busy}>{busy ? <RefreshCw size={17} className="spin" /> : plan ? <RefreshCw size={17} /> : <Box size={17} />}{busy ? "Planning…" : stale ? "Repair the plan" : plan ? "Repack the stalls" : "Pack the stalls"}<ArrowRight size={16} /></button></div></div>
        {error && <div className="error-box" role="alert"><CircleHelp size={20} /><div><strong>Let’s resolve this before packing.</strong><p>{error}</p></div><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X size={17} /></button></div>}
        {stale && <div className="stale-banner" role="status"><RefreshCw size={17} /><span>Inputs changed. This is the previous plan. Repair it before exporting or locking a crate.</span></div>}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{busy ? "Planning the stalls. Please wait." : steps[steps.length - 1] ?? ""}</p><div className="workspace" aria-busy={busy}>
          <aside className="stock-sidebar"><div className="sidebar-top"><div className="stock-symbol"><Box size={20} /></div><span>{sampleStock ? "The sample stockroom" : "Your stockroom"}</span><button type="button" onClick={() => setModal("stock")} aria-label="Edit inventory"><Settings2 size={16} /></button></div><h3>{books.length} titles.<br />Plenty of possibility.</h3><div className="stock-stats"><div><strong>{totalCopies}</strong><span>copies in stock</span></div><div><strong>{reserveCopies}</strong><span>held for the shop</span></div></div><div className="inventory-list">{books.map((b) => <div className="inventory-item" key={b.id}><span className="book-spine" style={{ backgroundColor: b.color }} /><div><strong>{b.title}</strong><small>{b.author}</small></div><span className="stock-count" title={`${b.quantity} copies, ${b.reserve} reserved`}>{Math.max(0, b.quantity - b.reserve)}<small>free</small></span></div>)}</div><p className="sidebar-caption">{sampleStock ? "Real titles. Fictional stock, prices and ages." : "Stock stays in this browser session."}</p><button type="button" className="sidebar-link" onClick={() => upload.current?.click()} disabled={busy}><Upload size={15} /> Import your CSV <ArrowRight size={14} /></button><button type="button" className="text-button" onClick={() => saveFile("crate-inventory-template.csv", inventoryCsv(SAMPLE_BOOKS))}><ArrowDownToLine size={13} /> Download sample template</button><input autoComplete="off" ref={upload} tabIndex={-1} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Upload inventory CSV" onChange={(e) => importFile(e.target.files?.[0])} /></aside>
          <section className="stall-area" aria-label="Your cultural stalls"><div className="stalls">{events.map((event, index) => {
            const ids = plan?.assignments[event.id] ?? [];
            return <article className={`stall-panel ${stale ? "is-stale" : ""}`} key={event.id}><div className="stall-top"><span className={`stall-tag tag-${index}`}>Stall {index === 0 ? "A" : "B"} <span>·</span> Sample event</span><span className="slot-count">{ids.length}/{event.slots} titles</span></div><div className="stall-title"><h3>{event.name}</h3><button type="button" aria-label={`Edit ${event.name} programme`} disabled={busy || locked[event.id]} onClick={() => { setEditingEvent(event.id); setModal("programme"); }}><Settings2 size={16} /></button></div><p className="programme-label">An audience inspired by</p><div className="anchor-chips">{event.anchors.map((a, i) => <span key={i}>{a.type === "artist" ? <Music2 size={12} /> : <FileText size={12} />}{a.name}</span>)}</div><div className="stall-divider" />{!ids.length ? <div className="empty-crate"><div className={`empty-books empty-${index}`}><span /><span /><span /></div><h4>A new audience awaits.</h4><p>Pack the stalls to choose {event.slots} titles<br />from your shared stockroom.</p><span className="empty-footnote">Every copy gets one destination.</span></div> : <div className="book-grid">{ids.map((id) => {
              const book = books.find((b) => b.id === id); if (!book) return <div key={id} className="missing-book">Removed stock record: {id}. Repair required.</div>;
              const pinned = effectivePins[event.id]?.includes(id); const vetoed = vetoes[event.id]?.includes(id);
              return <div className={`book-tile ${vetoed ? "vetoed" : ""}`} key={id}><div className="book-cover" style={{ backgroundColor: book.color, color: coverInk(book.color) }}><span className="cover-line" /><span className="cover-author">{book.author}</span><strong>{book.title}</strong><span className="cover-imprint">THE TRAVELLING SHELF</span>{pinned && <span className="cover-pin"><Pin size={12} />Pinned</span>}</div><div className="book-meta"><span>Rank {snapshot ? rankOf(snapshot, event.id, id) ?? "unknown" : "–"}</span><span>1 copy</span></div><div className="book-actions"><button type="button" aria-pressed={pinned} className={pinned ? "selected" : ""} disabled={busy || locked[event.id]} onClick={() => toggleDecision("pin", event.id, id)} aria-label={`${pinned ? "Unpin" : "Pin"} ${book.title} at ${event.name}`} title={pinned ? "Unpin this title" : "Keep this title here"}><Pin size={13} />{pinned ? "Pinned" : "Pin"}</button><button type="button" aria-pressed={vetoed} className={vetoed ? "selected" : ""} disabled={busy || locked[event.id]} onClick={() => toggleDecision("veto", event.id, id)} aria-label={`${vetoed ? "Undo veto" : "Veto"} ${book.title} at ${event.name}`} title="Exclude from this stall"><X size={14} />{vetoed ? "Undo" : "Veto"}</button><button type="button" onClick={() => setModal("evidence")} aria-label={`Inspect ranking evidence for ${book.title}`} title="Inspect evidence"><Search size={14} /></button></div></div>;
            })}</div>}{Boolean(vetoes[event.id]?.length) && <div className="active-exclusions"><strong>Excluded from this stall</strong>{vetoes[event.id].map((id) => <div key={id}><span>{books.find((b) => b.id === id)?.title ?? id}</span><button type="button" disabled={busy || locked[event.id]} onClick={() => toggleDecision("veto", event.id, id)}>Undo veto</button></div>)}</div>}<div className="stall-bottom"><span><span className={`small-dot ${locked[event.id] ? "is-locked" : ""}`} />{locked[event.id] ? "Packed crate protected" : ids.length ? "Ready for your review" : "Waiting to be packed"}</span><button type="button" aria-pressed={Boolean(locked[event.id])} disabled={!ready && !locked[event.id]} onClick={() => setLocked((old) => ({ ...old, [event.id]: !old[event.id] }))}>{locked[event.id] ? <UnlockKeyhole size={14} /> : <LockKeyhole size={14} />}{locked[event.id] ? "Unlock" : "Lock crate"}</button></div></article>;
          })}</div><div className="desk-bottom"><div><ShieldCheck size={17} /><span>Shop reserves respected. Every copy accounted for.</span></div><button type="button" onClick={() => setModal("about")}>How Crate makes a plan <ChevronRight size={15} /></button></div></section>
        </div>
        <section className="plan-review"><div><h2>{plan ? "The plan, made practical." : "From a good idea to a packed crate."}</h2><p>{plan ? `${packedCopies} copies across two stalls. ${stale ? "Updates need a repair." : "Review the choices before they leave."}` : "Choose a programme, make room for your favourites, and leave with a clear list."}</p></div><div className="export-actions"><button type="button" className="button secondary" disabled={!ready} onClick={() => { try { saveFile("crate-packing-manifest.csv", packingCsv(books, events, plan!.assignments, sourceLabel)); } catch (err) { setError(err instanceof Error ? err.message : "Export failed."); } }}><ArrowDownToLine size={16} />Export manifest</button><button type="button" className="button secondary" disabled={!ready} onClick={() => window.print()}><FileText size={16} />Print cards & lists</button></div></section>
        {steps.length > 0 && <section className="process-panel" aria-label="Actual planner actions"><h3>What happened in this plan</h3><ol>{steps.map((step, i) => <li key={i}><Check size={14} /><span>{step}</span></li>)}</ol>{plan && !stale && <div className="comparison"><p><strong>Oldest-stock comparison</strong> uses the same eligible titles, reserves, pins and vetoes. It prioritises shelf age rather than rank.</p>{baseline?.feasible ? events.map((e) => <p key={e.id}><strong>{e.name}:</strong> {baseline.assignments[e.id].map((id) => books.find((b) => b.id === id)?.title).join(" · ")}</p>) : <p>No complete baseline under the current constraints.</p>}</div>}{plan && plan.changes.length > 0 && <div className="change-list"><strong>{plan.changeCount} changes to the previous plan</strong>{plan.changes.map((c, i) => <span key={i}>{c.action === "add" ? <Plus size={13} /> : <Minus size={13} />}{books.find((b) => b.id === c.bookId)?.title ?? c.bookId}<small>{events.find((e) => e.id === c.eventId)?.name}</small></span>)}</div>}</section>}
        <footer className="site-footer"><a className="wordmark small" href="#desk"><Box size={20} strokeWidth={1.5} />crate.</a><p>A thoughtful way to take your bookshop beyond its walls.</p><a href="https://github.com/AjnasNB/crate-qloo" target="_blank" rel="noreferrer">Open source <ArrowRight size={13} /></a></footer>
      </main>
    </div>
    <dialog ref={dialog} className={`desk-dialog ${modal === "stock" ? "wide-dialog" : ""}`} aria-labelledby="dialog-title" onClose={closeModal} onCancel={closeModal}><div className="dialog-top"><span className="dialog-brand"><Box size={20} />crate.</span><button type="button" className="icon-button" aria-label="Close dialog" onClick={closeModal}><X size={21} /></button></div>{error && <div className="dialog-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")}>Dismiss</button></div>}
      {modal === "stock" && <><h2 id="dialog-title" tabIndex={-1}>The stockroom</h2><p>Edits apply immediately and reset on reload. Download current stock to keep a copy. Shop reserves stay behind; each stall takes one copy of a selected title.</p><div className="table-scroll"><table className="stock-table"><thead><tr><th>Title & author</th><th>Copies</th><th>Reserve</th><th>Editorial pins</th>{live && <th>Qloo match</th>}</tr></thead><tbody>{books.map((b) => <tr key={b.id}><td><strong>{b.title}</strong><small>{b.author}</small></td><td><input autoComplete="off" type="number" min="0" max="99" value={b.quantity} aria-label={`Copies of ${b.title}`} onChange={(e) => updateBook(b.id, "quantity", e.target.valueAsNumber)} /></td><td><input autoComplete="off" type="number" min="0" max={b.quantity} value={b.reserve} aria-invalid={b.reserve > b.quantity} aria-label={`Shop reserve for ${b.title}`} onChange={(e) => updateBook(b.id, "reserve", e.target.valueAsNumber)} /></td><td><div className="stock-pin-actions">{events.map((event, index) => <button type="button" key={event.id} aria-pressed={Boolean(effectivePins[event.id]?.includes(b.id))} className={`small-button ${effectivePins[event.id]?.includes(b.id) ? "pin-active" : ""}`} disabled={busy || locked[event.id]} aria-label={`${effectivePins[event.id]?.includes(b.id) ? "Unpin" : "Pin"} ${b.title} at ${event.name}`} onClick={() => toggleDecision("pin", event.id, b.id)}>{effectivePins[event.id]?.includes(b.id) ? "Pinned" : "Pin"} {index === 0 ? "A" : "B"}</button>)}</div></td>{live && <td><button type="button" className="small-button" onClick={() => openMatch({ bookId: b.id, query: `${b.title} ${b.author}`, type: "book" })}>{b.entityId ? "Matched · change" : "Find match"}</button></td>}</tr>)}</tbody></table></div><p className="small-print">Reducing copies also reduces their reserve if needed. CSV: title, author, quantity. Optional: id, reserve, ageDays, price, color. Maximum 18 titles. Import replaces this session’s stock and clears editorial decisions.</p><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => upload.current?.click()}><Upload size={15} />Import CSV</button><button type="button" className="button secondary" onClick={() => saveFile("crate-current-stock.csv", inventoryCsv(books))}><ArrowDownToLine size={15} />Download current stock</button><button type="button" className="button primary" onClick={() => setModal(null)}>Back to the desk<ArrowRight size={15} /></button></div></>}
      {modal === "programme" && editingProgramme && <><h2 id="dialog-title" tabIndex={-1}>Edit the programme</h2><p>The selected interests describe an audience hypothesis. These are fictional sample events with no artist affiliation.</p><label className="field-label">Stall name<input autoComplete="off" value={editingProgramme.name} aria-invalid={!editingProgramme.name.trim()} maxLength={80} onChange={(e) => updateEvent(editingProgramme.id, { name: e.target.value })} /></label><label className="field-label">Display titles<select value={editingProgramme.slots} onChange={(e) => updateEvent(editingProgramme.id, { slots: Number(e.target.value) })}>{[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} titles</option>)}</select></label>{editingProgramme.anchors.map((anchor, index) => <div className="anchor-editor" key={index}><label className="field-label">{anchor.type === "artist" ? "Artist" : "Film"}<input autoComplete="off" value={anchor.name} aria-invalid={!anchor.name.trim()} maxLength={120} onChange={(e) => updateEvent(editingProgramme.id, { anchors: editingProgramme.anchors.map((a, i) => i === index ? { name: e.target.value, type: a.type } : a) })} /></label>{live && <button type="button" className="small-button" onClick={() => openMatch({ eventId: editingProgramme.id, anchorIndex: index, query: anchor.name, type: anchor.type })}>{anchor.entityId ? "Matched · change" : "Find Qloo match"}</button>}</div>)}<p className="small-print">Edits apply immediately. Editing an anchor clears its confirmed entity identity. A packed crate must be unlocked before changing its programme.</p><button type="button" className="button primary" onClick={() => setModal(null)}>Save programme<ArrowRight size={15} /></button></>}
      {modal === "match" && <><h2 id="dialog-title" tabIndex={-1}>Confirm the right match</h2><p>Compare the title and author or programme identity carefully. Missing author metadata does not establish an exact match.</p><form className="search-form" onSubmit={(e) => { e.preventDefault(); search(); }}><input autoComplete="off" aria-label="Qloo entity search" value={searchQuery} maxLength={120} onChange={(e) => { matchEpoch.current += 1; matchedTarget.current = ""; setSearchBusy(false); setMatches([]); setSearchMessage(""); setSearchQuery(e.target.value); }} required /><button type="submit" className="button primary" disabled={searchBusy}>{searchBusy ? "Searching…" : "Search"}<Search size={16} /></button></form>{searchMessage && <p role="status" className="search-message">{searchMessage}</p>}<div className="match-list">{matches.map((match) => <button type="button" key={match.entityId} onClick={() => chooseMatch(match)}><strong>{match.name}</strong>{match.author && <span>{match.author}</span>}<p>{match.description ?? "No descriptive metadata returned. Confirm only if you can identify this work."}</p><small>{match.entityId}</small><span className="choose-label">Confirm this entity <ArrowRight size={14} /></span></button>)}</div></>}
      {modal === "evidence" && <><h2 id="dialog-title" tabIndex={-1}>Evidence, without the guesswork.</h2><p className="evidence-source">{sourceLabel}</p><p>{snapshot?.mode === "qloo" ? "Returned order from Qloo is converted to within-list ranks. It does not predict sales or establish each attendee’s taste." : "These rankings are authored simulation fixtures. Other inputs use deterministic hash fixtures. No Qloo call or cultural inference is represented."}</p><div className="mode-control"><button type="button" aria-pressed={!live} className={!live ? "chosen" : ""} onClick={() => { if (live) { dirty(); setLive(false); } }}>Simulation</button><button type="button" aria-pressed={live} className={live ? "chosen" : ""} disabled={!configured} onClick={() => { if (!live) { dirty(); setLive(true); } }}>Live Qloo{!configured && " · awaiting access"}</button></div>{!configured && <p className="small-print">The server has no configured Qloo key. The access request is awaiting approval; live mode is unavailable.</p>}{snapshot ? <><p className="small-print">Original plan snapshot: {new Date(snapshot.retrievedAt).toLocaleString()}. {stale ? "The displayed plan needs repair." : ""}</p><div className="evidence-ranks">{events.map((e) => <div key={e.id}><h3>{e.name}</h3><ol>{snapshot.profiles[e.id]?.orderedIds.map((id) => <li key={id}>{books.find((b) => b.id === id)?.title ?? id}</li>)}</ol></div>)}</div><details><summary>Inspect original snapshot JSON</summary><pre>{JSON.stringify(snapshot, null, 2)}</pre></details><button type="button" className="text-button" onClick={() => { const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "crate-evidence-snapshot.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}><ArrowDownToLine size={14} />Download evidence snapshot</button></> : <div className="empty-evidence"><FileText size={25} /><p>No plan snapshot yet. Pack the stalls to inspect the evidence used.</p></div>}</>}
      {modal === "about" && <><h2 id="dialog-title" tabIndex={-1}>A bookshop, beyond its walls.</h2><p>Crate plans two simultaneously departing, separately staffed cultural stalls from one shared inventory. It keeps stock, shop reserves, pins and vetoes consistent, then produces a list another bookseller can pack.</p><h3>What makes the plan?</h3><p>A deterministic exact planner selects distinct titles for each stall. In repair mode it minimises changes before improving rank fit. Packed crates are protected with hard constraints. There is no LLM generating these decisions.</p><h3>Where does taste come from?</h3><p>Simulation uses explicitly synthetic fixtures. The live Qloo adapter is designed to resolve user-confirmed cultural entities and retrieve a fixed-inventory ranking for each programme. API access and live validation are pending. Cultural affinities are hypotheses, not sales forecasts.</p><h3>Your stock stays local.</h3><p>Inventory is held in this browser session. Live mode sends confirmed entity IDs and programme anchors to the server to query Qloo. No stock database, purchasing, booking or artist affiliation is implied.</p><p className="credit-line">Developed by Ajnas N B</p><a className="button secondary" href="https://github.com/AjnasNB/crate-qloo" target="_blank" rel="noreferrer">Explore the source<ArrowRight size={15} /></a></>}
    </dialog>
    <section className="print-area"><header><h1>crate. / Packing manifests</h1><p>{sourceLabel}</p><p>{stale ? "STALE PLAN. REPAIR BEFORE USE." : "One copy per listed title. Both stalls depart simultaneously."}</p><p>Developed by Ajnas N B</p></header>{events.map((event) => <section key={event.id} className="print-stall"><h2>{event.name}</h2><p>{event.anchors.map((a) => a.name).join(" · ")}</p><table><thead><tr><th>Packed</th><th>SKU</th><th>Title</th><th>Author</th><th>Copies</th></tr></thead><tbody>{plan?.assignments[event.id]?.map((id) => { const b = books.find((book) => book.id === id); return <tr key={id}><td>□</td><td>{id}</td><td>{b?.title ?? "Missing record"}</td><td>{b?.author}</td><td>1</td></tr>; })}</tbody></table><div className="print-cards">{plan?.assignments[event.id]?.map((id) => { const b = books.find((book) => book.id === id); return <article key={id}><small>{event.name}</small><h3>{b?.title}</h3><p>{b?.author}</p><small>{sourceLabel}</small></article>; })}</div></section>)}</section>
  </>;
}
