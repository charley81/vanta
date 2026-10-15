"use client";

import Link from "next/link";

import styles from "./ui/core-route.module.css";

export default function RouteError({ retry }: { retry: () => void }) {
  return (
    <main className={styles.routeMain} id="main-content" tabIndex={-1}>
      <section aria-labelledby="route-error-heading" className={styles.unavailable}>
        <p className={styles.eyebrow}>ROUTE SIGNAL / INTERRUPTED</p>
        <h1 id="route-error-heading">This route could not be rendered.</h1>
        <p>
          The shared VANTA shell remains available. Retry this route or return
          to the server-rendered Home experience.
        </p>
        <div className={styles.actionRow}>
          <button className={styles.actionButton} onClick={() => retry()} type="button">
            RETRY ROUTE
          </button>
          <Link className={styles.secondaryAction} href="/">
            RETURN HOME
          </Link>
        </div>
      </section>
    </main>
  );
}
