import type { Metadata } from "next";
import Link from "next/link";

import { buildIndexedRouteMetadata } from "@/src/discoverability/metadata";
import {
  getPublishedSynthMetadataForRequest,
  getSynthRouteContentForRequest,
} from "@/src/editorial/preview-content.server";

import routeStyles from "../ui/core-route.module.css";
import { EditorialPreviewBanner } from "../ui/editorial-preview-banner";
import { SynthControlDeck } from "./synth-control-deck";
import { SynthInstrument } from "./synth-instrument";
import styles from "./synth.module.css";
import { SynthTransport } from "./synth-transport";

export async function generateMetadata(): Promise<Metadata> {
  return buildIndexedRouteMetadata(await getPublishedSynthMetadataForRequest());
}

export default async function SynthPage() {
  const { model, preview } = await getSynthRouteContentForRequest();
  return (
    <>
      {preview ? <EditorialPreviewBanner session={preview} /> : null}
      <main className={routeStyles.routeMain} id="main-content" tabIndex={-1}>
        <section
          aria-labelledby="synth-heading"
          className={routeStyles.routeHeader}
          data-section="instrument"
        >
          <div className={routeStyles.routeHeaderCopy}>
            <p className={routeStyles.eyebrow}>{model.category}</p>
            <h1 id="synth-heading">{model.headline}</h1>
            <p className={routeStyles.lede}>{model.introduction}</p>
            <SynthTransport enableLabel={model.enableSoundLabel} />
          </div>
          <SynthInstrument />
        </section>

        <section
          aria-labelledby="phrase-heading"
          className={styles.scopeSection}
          data-section="phrase"
        >
          <div>
            <p className={routeStyles.eyebrow}>ONE VOICE / AUTHORED PHRASE</p>
            <h2 id="phrase-heading">A steady phrase. No hidden keyboard.</h2>
          </div>
          <div className={styles.scopeCopy}>
            <p>
              MORPH Lab is scoped to one repeating monophonic six-note phrase:
              <strong> A — C — D — E — D — C</strong>. The six controls shape
              that voice without implying a complete MONOLITH emulation.
            </p>
            <p>
              There is no keyboard, note grid, MIDI, chord mode, preset browser,
              save, share, URL encoding, or polyphony mode.
            </p>
            <p className={styles.unavailableCopy}>
              OSC, MIX, MOD, LFO, TONE, DECAY, SUSTAIN, and the display buttons
              remain visible physical context. They are intentionally inert and
              have no interaction or focus target.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="control-deck-heading"
          className={styles.deckSection}
          data-section="control-deck"
        >
          <p className={routeStyles.eyebrow}>CONTROL DECK / AUTHORITATIVE</p>
          <h2 id="control-deck-heading">Six controls. One normalized state.</h2>
          <p className={routeStyles.lede}>
            Select a control to open its native 0–100 range. Every visible value
            and future physical interaction uses this same tab-local MORPH
            session.
          </p>
          <SynthControlDeck controls={model.supportedControls} />
        </section>

        <section
          aria-labelledby="synth-next-heading"
          className={routeStyles.invitation}
          data-section="product"
        >
          <p className={routeStyles.eyebrow}>MONOLITH / INSTRUMENT 001</p>
          <h2 id="synth-next-heading">Start with the instrument.</h2>
          <p>
            Review the complete eight-voice architecture, physical specification,
            and continuous MORPH concept on the Product route.
          </p>
          <Link className={routeStyles.action} href="/monolith">
            EXPLORE MONOLITH
          </Link>
        </section>
      </main>
    </>
  );
}
