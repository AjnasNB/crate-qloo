import type { Metadata } from "next";
import Link from "next/link";
import styles from "./player.module.css";

export const metadata: Metadata = {
  title: "Crate in motion — live Qloo packing",
  description: "Two cultural crowds, one stockroom, and a last-minute repair. A Crate motion film developed by Ajnas N B.",
};

export default function Demo() {
  return <main className={styles.shell}>
    <Link className={styles.back} href="/#desk">← Back to the packing desk</Link>
    <header className={styles.header}>
      <h1>Two crowds. One stockroom.</h1>
      <p>Watch cultural evidence become a packable plan, then survive a last-minute shortage.</p>
    </header>
    <video className={styles.video} controls playsInline preload="metadata" poster="/media/crate-live-demo-poster.jpg" aria-label="Crate live Qloo demonstration">
      <source src="/media/crate-live-demo.mp4" type="video/mp4" />
      <track kind="captions" src="/media/crate-live-demo.vtt" srcLang="en" label="English" default />
      Your browser cannot play this film. <a href="/media/crate-live-demo.mp4">Download the MP4</a>.
    </video>
    <div className={styles.actions}>
      <Link className={styles.primary} href="/#desk">Try the live packing desk →</Link>
      <a href="/media/crate-live-demo.mp4" download="crate-live-demo.mp4">Download the film</a>
    </div>
    <p className={styles.note}>The film uses recorded live Qloo results with sample stock and programmes. The moving books illustrate the allocation and repair. Reader preferences and sales effects are unmeasured.</p>
    <footer className={styles.footer}>Developed by <strong>Ajnas N B</strong> · <a href="https://github.com/AjnasNB/crate-qloo">Source and verification</a></footer>
  </main>;
}
