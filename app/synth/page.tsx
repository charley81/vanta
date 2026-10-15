import type { Metadata } from "next";
import Link from "next/link";

import { EDITORIAL_FIXTURES } from "@/src/editorial/fixtures.server";
import { composeSynthRouteViewModel } from "@/src/routes/view-models.server";

import styles from "../ui/core-route.module.css";
import { MediaPlaceholder } from "../ui/media-placeholder";

const model = composeSynthRouteViewModel(EDITORIAL_FIXTURES.synthPage);

export const metadata: Metadata = {
  title: { absolute: model.title },
  description: model.seoDescription,
};

export default function SynthPage() {
  return (
    <main className={styles.routeMain} id="main-content" tabIndex={-1}>
      <section aria-labelledby="synth-heading" className={styles.routeHeader}>
        <div className={styles.routeHeaderCopy}>
          <p className={styles.eyebrow}>{model.category}</p>
          <h1 id="synth-heading">{model.headline}</h1>
          <p className={styles.lede}>{model.introduction}</p>
          <div className={styles.actionRow}>
            <button className={styles.actionButton} disabled type="button">
              {model.enableSoundLabel}
            </button>
          </div>
          <p className={styles.status} role="status">
            Audio and interactive instrument rendering are unavailable in this
            Core build. The authored shell and complete control reference remain
            available below.
          </p>
        </div>
        <MediaPlaceholder label="MONOLITH / SILENT SHELL" detail="CORE TIER" />
      </section>

      <section aria-labelledby="control-deck-heading" className={styles.specifications}>
        <p className={styles.eyebrow}>CONTROL DECK / REFERENCE</p>
        <h2 id="control-deck-heading">Six controls. One evolving voice.</h2>
        <p className={styles.lede}>
          The Core tier exposes each approved normalized value and sonic purpose
          without loading an audio engine or realtime model.
        </p>
        <fieldset aria-labelledby="control-deck-heading" className={styles.controls} disabled>
          {model.supportedControls.map((control) => {
            const inputId = `control-${control.name.toLowerCase()}`;
            return (
              <div className={styles.controlCard} key={control.name}>
                <label htmlFor={inputId}>
                  <span>{control.name}</span>
                  <output htmlFor={inputId}>{control.value}</output>
                </label>
                <input
                  disabled
                  id={inputId}
                  max="100"
                  min="0"
                  step="1"
                  type="range"
                  value={control.value}
                />
                <div aria-hidden="true" className={styles.controlMeta}>
                  <span>{control.endpoints[0]}</span>
                  <span>{control.endpoints[1]}</span>
                </div>
                <p>{control.purpose}</p>
              </div>
            );
          })}
        </fieldset>
      </section>

      <section aria-labelledby="synth-next-heading" className={styles.invitation}>
        <p className={styles.eyebrow}>MONOLITH / INSTRUMENT 001</p>
        <h2 id="synth-next-heading">Start with the instrument.</h2>
        <p>
          Review the complete eight-voice architecture, physical specification,
          and continuous MORPH concept on the Product route.
        </p>
        <Link className={styles.action} href="/monolith">
          EXPLORE MONOLITH
        </Link>
      </section>
    </main>
  );
}
