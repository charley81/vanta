import type { Metadata } from "next";
import styles from "./home.module.css";

import { EDITORIAL_FIXTURES } from "@/src/editorial/fixtures.server";
import { composeHomeRouteViewModel } from "@/src/routes/view-models.server";

const model = composeHomeRouteViewModel(EDITORIAL_FIXTURES.homePage);

export const metadata: Metadata = {
  title: model.title,
  description: model.seoDescription,
};

export default function HomePage() {
  return (
    <main
      className={`${styles.routeMain} ${styles.introduction}`}
      id="main-content"
      tabIndex={-1}
    >
      <div aria-hidden="true" className={styles.grid} />
      <section aria-labelledby="home-heading" className={styles.copy}>
        <p className={`${styles.telemetry} ${styles.kicker}`}>
          {model.opening.kicker}
        </p>
        <h1 id="home-heading">{model.opening.headline}</h1>
        <p className={styles.body}>{model.opening.body}</p>
      </section>
      <p aria-hidden="true" className={`${styles.telemetry} ${styles.index}`}>
        V / 001
      </p>
    </main>
  );
}
