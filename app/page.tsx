import type { Metadata } from "next";
import Link from "next/link";

import { buildIndexedRouteMetadata } from "@/src/discoverability/metadata";
import {
  buildHomeStructuredData,
  serializeJsonLd,
} from "@/src/discoverability/structured-data";
import {
  getHomeRouteContentForRequest,
  getPublishedHomeMetadataForRequest,
} from "@/src/editorial/preview-content.server";

import { HomeChoreography } from "./home-choreography";
import { HomeMedia } from "./home-media";
import { HomeRealtimeReveal } from "./home-realtime-reveal";
import styles from "./home.module.css";
import { EditorialPreviewBanner } from "./ui/editorial-preview-banner";
import coreStyles from "./ui/core-route.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return buildIndexedRouteMetadata(await getPublishedHomeMetadataForRequest());
}

export default async function HomePage() {
  const { model, preview } = await getHomeRouteContentForRequest();

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildHomeStructuredData()),
        }}
        type="application/ld+json"
      />
      {preview ? <EditorialPreviewBanner session={preview} /> : null}
      <main
        className={`${coreStyles.routeMain} ${styles.home}`}
        data-home-presentation="vertical"
        data-home-presentation-tier="core"
        data-home-realtime-phase="poster"
        data-home-realtime-visible="false"
        id="main-content"
        tabIndex={-1}
      >
        <HomeRealtimeReveal />
        <section
          aria-labelledby="home-heading"
          className={styles.introduction}
          data-home-beat="opening"
        >
          <div aria-hidden="true" className={styles.grid} />
          <div className={styles.copy}>
            <p className={`${styles.telemetry} ${styles.kicker}`}>
              {model.opening.kicker}
            </p>
            <h1 id="home-heading">{model.opening.headline}</h1>
            <p className={styles.body}>{model.opening.body}</p>
            <Link
              className={coreStyles.action}
              href={model.opening.action.href}
              prefetch={false}
            >
              {model.opening.action.label}
            </Link>
          </div>
          <HomeMedia />
          <p
            aria-hidden="true"
            className={`${styles.telemetry} ${styles.routeIndex}`}
          >
            V / 001
          </p>
          <p aria-hidden="true" className={styles.openingCaption}>
            MONOLITH / GRAPHITE
          </p>
        </section>

        <HomeChoreography>
          {model.chapters.map((chapter) => (
            <section
              aria-labelledby={`chapter-${chapter.id}`}
              className={styles.chapter}
              data-chapter={chapter.id}
              data-home-beat={chapter.id}
              id={chapter.id}
              key={chapter.id}
            >
              <p className={`${styles.telemetry} ${styles.chapterIndex}`}>
                {chapter.index} / 09
              </p>
              <div className={styles.chapterCopy}>
                <h2 id={`chapter-${chapter.id}`}>{chapter.headline}</h2>
                <p>{chapter.body}</p>
                {chapter.action ? (
                  <Link
                    className={coreStyles.secondaryAction}
                    href={chapter.action.href}
                    id={`home-${chapter.id}-action`}
                  >
                    {chapter.action.label}
                  </Link>
                ) : null}
              </div>
              <div aria-hidden="true" className={styles.chapterSignal}>
                <span />
              </div>
            </section>
          ))}
        </HomeChoreography>

        <section
          aria-labelledby="lab-invitation-heading"
          className={styles.labInvitation}
          data-home-beat="lab-invitation"
        >
          <div className={styles.labInvitationInner}>
            <p className={`${styles.telemetry} ${styles.kicker}`}>
              {model.labInvitation.category}
            </p>
            <h2 id="lab-invitation-heading">{model.labInvitation.headline}</h2>
            <p>{model.labInvitation.body}</p>
            <Link
              className={coreStyles.action}
              href={model.labInvitation.action.href}
              prefetch={false}
            >
              {model.labInvitation.action.label}
            </Link>
          </div>
          <div aria-hidden="true" className={styles.labDial}>
            <span>SUB</span>
            <i />
            <span>FRACTURE</span>
          </div>
        </section>

        <section
          aria-labelledby="home-closing-heading"
          className={styles.closing}
          data-home-beat="closing"
        >
          <h2 className={styles.closingBrand} id="home-closing-heading">
            {model.closing.brand}
          </h2>
          <p>{model.closing.tagline}</p>
        </section>
      </main>
    </>
  );
}
