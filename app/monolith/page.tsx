import type { Metadata } from "next";

import { buildIndexedRouteMetadata } from "@/src/discoverability/metadata";
import {
  buildProductStructuredData,
  serializeJsonLd,
} from "@/src/discoverability/structured-data";
import {
  getProductRouteContentForRequest,
  getPublishedProductMetadataForRequest,
} from "@/src/editorial/preview-content.server";

import { EditorialPreviewBanner } from "../ui/editorial-preview-banner";
import { BagTrigger } from "../ui/bag-trigger";
import { ProductMedia } from "./product-media";
import { ProductRouteLink } from "./product-route-link";
import styles from "./product.module.css";

export async function generateMetadata(): Promise<Metadata> {
  return buildIndexedRouteMetadata(await getPublishedProductMetadataForRequest());
}

function specificationLabel(term: string): string {
  return term.charAt(0).toUpperCase() + term.slice(1);
}

export default async function ProductPage() {
  const [{ model, preview }, publishedMetadata] = await Promise.all([
    getProductRouteContentForRequest(),
    getPublishedProductMetadataForRequest(),
  ]);
  const bagStatus = preview
    ? "Bag mutation is disabled in Editorial preview."
    : "Bag stores one MONOLITH in this browser for up to 30 days.";

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            buildProductStructuredData(publishedMetadata),
          ),
        }}
        type="application/ld+json"
      />
      {preview ? <EditorialPreviewBanner session={preview} /> : null}
      <main className={styles.productMain} id="main-content" tabIndex={-1}>
        <section
          aria-labelledby="product-heading"
          className={styles.hero}
          data-section="hero"
        >
          <ProductMedia
            alt="MONOLITH graphite desktop synthesizer with its MORPH encoder and control surface."
            className={styles.heroMedia}
            eager
            kind="hero"
            sizes="(max-width: 767px) 100vw, 50vw"
          />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{model.hero.identifier}</p>
            <h1 id="product-heading">{model.hero.name}</h1>
            <p className={styles.subtitle}>{model.hero.subtitle}</p>
            <p className={styles.body}>{model.hero.body}</p>
            <div className={styles.commerce}>
              <p className={styles.price}>{model.hero.price}</p>
              <BagTrigger
                ariaDescribedBy="product-bag-status"
                ariaLabel="Add MONOLITH to Bag"
                className={styles.actionButton}
                disabled={Boolean(preview)}
                operation="add"
              >
                {model.hero.addToBagLabel}
              </BagTrigger>
              <p className={styles.status} id="product-bag-status">
                {bagStatus}
              </p>
              <noscript>
                <p className={styles.noScriptMessage}>
                  Add to Bag is unavailable without JavaScript. Product details
                  and MORPH Lab remain available.
                </p>
              </noscript>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="product-thesis-heading"
          className={styles.thesis}
          data-section="thesis"
        >
          <p className={styles.eyebrow}>02 / MEET THE INSTRUMENT</p>
          <h2 className={styles.statement} id="product-thesis-heading">
            {model.thesis.headline}
          </h2>
          <p className={styles.support}>{model.thesis.support}</p>
        </section>

        <section
          aria-labelledby="product-sonic-heading"
          className={styles.sonic}
          data-section="sonic"
        >
          <div className={styles.sonicInner}>
            <p className={styles.eyebrow}>03 / A DIFFERENT WAY TO SHAPE SOUND</p>
            <h2 className={styles.sectionHeading} id="product-sonic-heading">
              {model.sonic.headline}
            </h2>
            <p className={styles.sectionBody}>{model.sonic.body}</p>
          </div>
        </section>

        <section
          aria-labelledby="product-states-heading"
          className={styles.states}
          data-section="states"
        >
          <div className={styles.statesInner}>
            <div className={styles.statesHeading}>
              <p className={styles.eyebrow}>04 / THE SOUND ENGINE</p>
              <h2 className={styles.sectionHeading} id="product-states-heading">
                {model.states.headline}
              </h2>
            </div>
            <div className={styles.stateGrid}>
              <article className={styles.stateCard}>
                <ProductMedia
                  alt=""
                  className={`${styles.stateMedia} ${styles.stateMediaLight}`}
                  kind="hero"
                  sizes="(max-width: 767px) 100vw, 45vw"
                />
                <h3>A / SUB</h3>
                <p>{model.states.sub}</p>
              </article>
              <article className={styles.stateCard}>
                <ProductMedia
                  alt=""
                  className={styles.stateMedia}
                  kind="morph"
                  sizes="(max-width: 767px) 100vw, 45vw"
                />
                <h3>B / FRACTURE</h3>
                <p>{model.states.fracture}</p>
              </article>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="product-morph-heading"
          className={styles.morph}
          data-section="morph"
        >
          <ProductMedia
            alt="Close view of the MONOLITH MORPH encoder between SUB and FRACTURE."
            className={styles.splitMedia}
            kind="morph"
            sizes="(max-width: 767px) 100vw, 50vw"
          />
          <div className={styles.splitCopy}>
            <p className={styles.eyebrow}>05 / THE DEFINING GESTURE</p>
            <h2 className={styles.splitHeading} id="product-morph-heading">
              {model.morph.headline}
            </h2>
            <p className={styles.sectionBody}>{model.morph.body}</p>
          </div>
        </section>

        <section
          aria-labelledby="product-craft-heading"
          className={styles.craft}
          data-section="craft"
        >
          <ProductMedia
            alt=""
            className={`${styles.splitMedia} ${styles.craftMedia}`}
            kind="hero"
            sizes="(max-width: 767px) 100vw, 50vw"
          />
          <div className={`${styles.splitCopy} ${styles.craftCopy}`}>
            <p className={styles.eyebrow}>06 / MATERIALS + CRAFT</p>
            <h2 className={styles.splitHeading} id="product-craft-heading">
              {model.craft.headline}
            </h2>
            <p className={styles.sectionBody}>{model.craft.body}</p>
          </div>
        </section>

        <section
          aria-labelledby="product-specifications-heading"
          className={styles.specifications}
          data-section="specifications"
        >
          <div className={styles.specificationsInner}>
            <p className={styles.eyebrow}>07 / TECHNICAL SPECIFICATIONS</p>
            <h2 id="product-specifications-heading">Instrument architecture.</h2>
            <dl>
              {Object.entries(model.specifications.architecture).map(
                ([term, value]) => (
                  <div key={term}>
                    <dt>{specificationLabel(term)}</dt>
                    <dd>{value}</dd>
                  </div>
                ),
              )}
              <div>
                <dt>Dimensions</dt>
                <dd>{model.specifications.dimensions.display}</dd>
              </div>
              <div>
                <dt>Enclosure</dt>
                <dd>{model.specifications.enclosure}</dd>
              </div>
              <div>
                <dt>Display</dt>
                <dd>{model.specifications.display}</dd>
              </div>
              <div>
                <dt>Connections</dt>
                <dd>
                  <ul className={styles.specList}>
                    {model.specifications.connections.map((connection) => (
                      <li key={connection}>{connection}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Panel controls</dt>
                <dd>
                  <ul className={styles.specList}>
                    {model.specifications.panelControls.map((control) => (
                      <li key={control}>{control}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Display buttons</dt>
                <dd>
                  {model.specifications.displayButtons.count} —{" "}
                  {model.specifications.displayButtons.description}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          aria-labelledby="product-lab-heading"
          className={styles.labInvitation}
          data-section="lab-invitation"
        >
          <div className={styles.labInvitationInner}>
            <p className={styles.eyebrow}>08 / MORPH LAB</p>
            <h2 id="product-lab-heading">{model.labInvitation.headline}</h2>
            <p className={styles.labInvitationBody}>
              Shape one evolving MONOLITH voice directly between SUB and
              FRACTURE through six tactile controls.
            </p>
            <ProductRouteLink
              href={model.labInvitation.action.href}
              label={model.labInvitation.action.label}
            />
          </div>
        </section>

        <section
          aria-labelledby="product-final-action-heading"
          className={styles.finalAction}
          data-section="final-action"
        >
          <div className={styles.finalActionInner}>
            <div>
              <p className={styles.eyebrow}>09 / MONOLITH</p>
              <h2 id="product-final-action-heading">
                Eight voices. One continuum.
              </h2>
            </div>
            <div className={styles.finalCommerce}>
              <p className={styles.price}>{model.hero.price}</p>
              <BagTrigger
                ariaDescribedBy="product-final-bag-status"
                ariaLabel="Add MONOLITH to Bag"
                className={styles.finalActionButton}
                disabled={Boolean(preview)}
                operation="add"
              >
                {model.hero.addToBagLabel}
              </BagTrigger>
              <p className={styles.status} id="product-final-bag-status">
                {bagStatus}
              </p>
              <noscript>
                <p className={styles.noScriptMessage}>
                  Add to Bag is unavailable without JavaScript.
                </p>
              </noscript>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
