/* eslint-disable @next/next/no-html-link-for-pages -- The recovery page intentionally works without client navigation JavaScript. */
import styles from "./ui/core-route.module.css";

export default function NotFound() {
  return (
    <main className={styles.routeMain} id="main-content" tabIndex={-1}>
      <section aria-labelledby="not-found-heading" className={styles.unavailable}>
        <p className={styles.eyebrow}>404 / NO SIGNAL</p>
        <h1 id="not-found-heading">This route does not exist.</h1>
        <p>Return to VANTA or continue directly to the MONOLITH instrument.</p>
        <div className={styles.actionRow}>
          <a className={styles.action} href="/">
            RETURN HOME
          </a>
          <a className={styles.secondaryAction} href="/monolith">
            EXPLORE MONOLITH
          </a>
        </div>
      </section>
    </main>
  );
}
