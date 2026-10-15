import type { Metadata } from "next";
import Link from "next/link";

import { EDITORIAL_FIXTURES } from "@/src/editorial/fixtures.server";
import { composeProductRouteViewModel } from "@/src/routes/view-models.server";

import styles from "../ui/core-route.module.css";
import { MediaPlaceholder } from "../ui/media-placeholder";
import { BagTrigger } from "../ui/shell-navigation";

const model = composeProductRouteViewModel(EDITORIAL_FIXTURES.productPage);

export const metadata: Metadata = {
  title: { absolute: model.title },
  description: model.seoDescription,
};

export default function ProductPage() {
  return (
    <main className={styles.routeMain} id="main-content" tabIndex={-1}>
      <section aria-labelledby="product-heading" className={styles.routeHeader} data-section="hero">
        <div className={styles.routeHeaderCopy}>
          <p className={styles.eyebrow}>{model.hero.identifier}</p>
          <h1 id="product-heading">{model.hero.name}</h1>
          <p className={styles.lede}>{model.hero.subtitle}</p>
          <p className={styles.body}>{model.hero.body}</p>
          <p className={styles.price}>{model.hero.price}</p>
          <div className={styles.actionRow}>
            <BagTrigger
              ariaDescribedBy="bag-core-status"
              ariaLabel="Add MONOLITH to Bag"
              className={styles.actionButton}
            >
              {model.hero.addToBagLabel}
            </BagTrigger>
          </div>
          <p className={styles.status} id="bag-core-status">
            Bag storage is not enabled in this Core build. The Bag overlay
            explains the available routes without changing product state.
          </p>
        </div>
        <MediaPlaceholder label="MONOLITH / GRAPHITE" detail="AUTHORED STILL PENDING" />
      </section>

      <section aria-labelledby="product-thesis-heading" className={styles.section} data-section="thesis">
        <p className={styles.index}>02 / THESIS</p>
        <h2 id="product-thesis-heading">{model.thesis.headline}</h2>
        <p>{model.thesis.support}</p>
      </section>

      <section aria-labelledby="product-sonic-heading" className={styles.splitSection} data-section="sonic">
        <div>
          <p className={styles.eyebrow}>03 / SONIC PHILOSOPHY</p>
          <h2 id="product-sonic-heading">{model.sonic.headline}</h2>
          <p>{model.sonic.body}</p>
        </div>
        <MediaPlaceholder label="SIGNAL STUDY" detail="NO REALTIME RUNTIME" />
      </section>

      <section aria-labelledby="product-states-heading" className={styles.section} data-section="states">
        <p className={styles.index}>04 / CONTINUUM</p>
        <div>
          <h2 id="product-states-heading">{model.states.headline}</h2>
          <div className={styles.stateGrid}>
            <article className={styles.stateCard}>
              <h3>SUB</h3>
              <p>{model.states.sub}</p>
            </article>
            <article className={styles.stateCard}>
              <h3>FRACTURE</h3>
              <p>{model.states.fracture}</p>
            </article>
          </div>
        </div>
        <p>One continuous gesture connects both states.</p>
      </section>

      <section aria-labelledby="product-morph-heading" className={styles.splitSection} data-section="morph">
        <MediaPlaceholder label="MORPH CONTROL" detail="TACTILE STUDY" />
        <div>
          <p className={styles.eyebrow}>05 / DEFINING CONTROL</p>
          <h2 id="product-morph-heading">{model.morph.headline}</h2>
          <p>{model.morph.body}</p>
        </div>
      </section>

      <section aria-labelledby="product-craft-heading" className={styles.section} data-section="craft">
        <p className={styles.index}>06 / CRAFT</p>
        <h2 id="product-craft-heading">{model.craft.headline}</h2>
        <p>{model.craft.body}</p>
      </section>

      <section aria-labelledby="product-specifications-heading" className={styles.specifications} data-section="specifications">
        <p className={styles.eyebrow}>07 / TECHNICAL SPECIFICATIONS</p>
        <h2 id="product-specifications-heading">Instrument architecture.</h2>
        <dl>
          {Object.entries(model.specifications.architecture).map(([term, value]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
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
              {model.specifications.displayButtons.count} — {model.specifications.displayButtons.description}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="product-lab-heading" className={styles.invitation} data-section="lab-invitation">
        <p className={styles.eyebrow}>08 / MORPH LAB</p>
        <h2 id="product-lab-heading">{model.labInvitation.headline}</h2>
        <p>Explore the six-control Core shell and the space between SUB and FRACTURE.</p>
        <Link className={styles.action} href={model.labInvitation.action.href}>
          {model.labInvitation.action.label}
        </Link>
      </section>

      <section aria-labelledby="product-final-action-heading" className={styles.section} data-section="final-action">
        <p className={styles.index}>09 / MONOLITH</p>
        <h2 id="product-final-action-heading">Eight voices. One continuum.</h2>
        <div>
          <p>{model.hero.price}</p>
          <BagTrigger ariaLabel="Add MONOLITH to Bag" className={styles.secondaryAction}>
            {model.hero.addToBagLabel}
          </BagTrigger>
        </div>
      </section>
    </main>
  );
}
