import type { Assignments, Book, Stall } from "../lib/planner";

/** Shared by browser printing and the reproducible paged-layout fixtures. */
export function PrintManifests({ books, events, assignments, sourceLabel, ready }: {
  books: Book[];
  events: Stall[];
  assignments: Assignments;
  sourceLabel: string;
  ready: boolean;
}) {
  const byId = new Map(books.map((book) => [book.id, book]));
  return <section className="print-area" data-ready={ready}>
    <header>
      <h1>crate. / Packing manifests</h1>
      <p>{sourceLabel}</p>
      <p className={ready ? undefined : "print-warning"}>{ready
        ? "One copy per listed title. Both stalls depart simultaneously."
        : "NO CURRENT PACKING LIST. Pack or repair the plan before printing."}</p>
      <p>Developed by Ajnas N B</p>
    </header>
    {ready && events.map((event) => <section key={event.id} className="print-stall">
      <h2>{event.name}</h2>
      <p>{event.anchors.map((anchor) => anchor.name).join(" · ")}</p>
      <p>{sourceLabel}</p>
      <table>
        <thead><tr><th>Packed</th><th>SKU</th><th>Title</th><th>Author</th><th>Copies</th></tr></thead>
        <tbody>{assignments[event.id]?.map((id) => {
          const book = byId.get(id);
          return <tr key={id}><td>□</td><td>{id}</td><td>{book?.title ?? "Missing record"}</td><td>{book?.author}</td><td>1</td></tr>;
        })}</tbody>
      </table>
      <h3 className="print-card-heading">Display cards / {event.name}</h3>
      <div className="print-cards">{assignments[event.id]?.map((id) => {
        const book = byId.get(id);
        return <article key={id}><small>{event.name}</small><h3>{book?.title}</h3><p>{book?.author}</p><small>{sourceLabel}</small></article>;
      })}</div>
    </section>)}
  </section>;
}
