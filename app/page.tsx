import type { Metadata } from "next";
import Link from "next/link";

import { EDITORIAL_FIXTURES } from "@/src/editorial/fixtures.server";
import { composeHomeRouteViewModel } from "@/src/routes/view-models.server";

import coreStyles from "./ui/core-route.module.css";
import styles from "./home.module.css";

const model = composeHomeRouteViewModel(EDITORIAL_FIXTURES.homePage);

export const metadata: Metadata = {
  title: { absolute: model.title },
  description: model.seoDescription,
};

export default function HomePage() {
  return (
    <main className={`${coreStyles.routeMain} ${styles.home}`} id="main-content" tabIndex={-1}>
      <section aria-labelledby="home-heading" className={styles.introduction}>
        <div aria-hidden="true" className={styles.grid} />
        <div className={styles.copy}>
          <p className={`${styles.telemetry} ${styles.kicker}`}>
            {model.opening.kicker}
          </p>
          <h1 id="home-heading">{model.opening.headline}</h1>
          <p className={styles.body}>{model.opening.body}</p>
          <Link className={coreStyles.action} href={model.opening.action.href}>
            {model.opening.action.label}
          </Link>
        </div>
        <p aria-hidden="true" className={`${styles.telemetry} ${styles.routeIndex}`}>
          V / 001
        </p>
      </section>

      <div aria-label="MONOLITH story" className={styles.chapters}>
        {model.chapters.map((chapter) => (
          <section
            aria-labelledby={`chapter-${chapter.id}`}
            className={styles.chapter}
            data-chapter={chapter.id}
            id={chapter.id}
            key={chapter.id}
          >
            <p aria-hidden="true" className={`${styles.telemetry} ${styles.chapterIndex}`}>
              {chapter.index} / 09
            </p>
            <div>
              <h2 id={`chapter-${chapter.id}`}>{chapter.headline}</h2>
              <p>{chapter.body}</p>
              {chapter.action ? (
                <Link className={coreStyles.secondaryAction} href={chapter.action.href}>
                  {chapter.action.label}
                </Link>
              ) : null}
            </div>
            <div aria-hidden="true" className={styles.chapterSignal} />
          </section>
        ))}
      </div>

      <section aria-labelledby="lab-invitation-heading" className={styles.labInvitation}>
        <p className={`${styles.telemetry} ${styles.kicker}`}>
          {model.labInvitation.category}
        </p>
        <h2 id="lab-invitation-heading">{model.labInvitation.headline}</h2>
        <p>{model.labInvitation.body}</p>
        <Link className={coreStyles.action} href={model.labInvitation.action.href}>
          {model.labInvitation.action.label}
        </Link>
      </section>

      <section aria-labelledby="home-closing-heading" className={styles.closing}>
        <p className={styles.closingBrand} id="home-closing-heading">
          {model.closing.brand}
        </p>
        <p>{model.closing.tagline}</p>
      </section>
    </main>
  );
}
