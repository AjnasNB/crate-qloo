/* eslint-disable @next/next/no-html-link-for-pages -- Full-document links support the deployed Vinext router. */
import type { Metadata } from "next";
import Workbook from "./workbook";
import styles from "./trial.module.css";

export const metadata: Metadata = {
  title: "Crate — a bookseller trial workbook",
  description: "A free, voluntary, local workbook for comparing a bookseller's manual packing task with Crate. No account or payment required.",
};

export default function Trial() {
  return <main className={styles.shell}>
    <a className={styles.back} href="/">← Back to Crate</a>
    <header className={styles.header}>
      <p className={styles.eyebrow}>A small bookseller trial · free · no account</p>
      <h1>Would this help you pack?</h1>
      <p>Try one bounded stockroom task, tell us where Crate gets in the way, and keep an honest record. No payment, purchase or commitment is needed.</p>
    </header>
    <aside className={styles.notice}><strong>No completed customer trials are claimed here.</strong> This workbook collects an unverified participant report. It cannot establish sales effects, market fit or independent relevance.</aside>
    <section className={styles.guide} aria-labelledby="trial-guide">
      <h2 id="trial-guide">One session. A firm 45-minute stop.</h2>
      <ol>
        <li><strong>Choose a small task.</strong> An adult bookseller or bookshop staff member volunteers 8–18 real titles, quantities and reserves, two cultural programme briefs, and 3–6 title slots per stall. Practice is welcome and stays separate.</li>
        <li><strong>Record the design and order.</strong> Two comparable cases with recorded case-to-method allocation are preferable. Repeating the same case is easier, but the second method benefits from learning. Neither design proves causality in one session.</li>
        <li><strong>Count first-use setup.</strong> Start setup timing before preparing the CSV, live import or identity matching. Include review of every title and artist/movie match. Mappings reset with the packing desk; do not prepare them off the clock.</li>
        <li><strong>Plan, then repair, with each method.</strong> Use the predeclared first A-only title ID in ascending ID order as the stock-out; set its available stock to zero and protect every B placement. If no title qualifies or no replacement is feasible, record N/A/failure. Never count an unchanged plan as a successful repair.</li>
        <li><strong>Review what you would pack.</strong> Record accepted/reviewed/proposed placements and stock, reserve, slot or protection errors. Self-review is distinct from a second bookseller&apos;s review. Keep failures, interruptions and negative feedback.</li>
      </ol>
      <p>Crate supports one copy of a title per stall and up to 18 titles. Programme interests are cultural signals, not facts about attendees. Hypothetical events with a real bookseller are exploratory usability work, not field or sales validation.</p>
      <a className={styles.textLink} href="/" target="_blank" rel="noopener noreferrer">Open the packing desk in another tab →</a>
    </section>
    <Workbook />
    <footer className={styles.footer}>Developed by <strong>Ajnas N B</strong> · <a href="/demo">Watch the recorded live demonstration</a></footer>
  </main>;
}
