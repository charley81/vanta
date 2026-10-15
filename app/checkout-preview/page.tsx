import type { Metadata } from "next";
import Link from "next/link";

import { composeCheckoutPreviewRouteViewModel } from "@/src/routes/view-models.server";

import styles from "../ui/core-route.module.css";

const model = composeCheckoutPreviewRouteViewModel();

export const metadata: Metadata = {
  title: { absolute: model.title },
  description: model.seoDescription,
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function CheckoutPreviewPage() {
  return (
    <main className={styles.routeMain} id="main-content" tabIndex={-1}>
      <p className={styles.banner}>{model.banner}</p>
      <section aria-labelledby="checkout-preview-heading" className={styles.unavailable}>
        <p className={styles.eyebrow}>SIGNAL LEDGER / UNAVAILABLE</p>
        <h1 id="checkout-preview-heading">{model.unavailable.heading}</h1>
        <p>{model.unavailable.body}</p>
        <ul aria-label="Checkout Preview boundaries" className={styles.boundaryList}>
          {model.boundaries.map((boundary) => (
            <li key={boundary}>{boundary}</li>
          ))}
        </ul>
        <div className={styles.actionRow}>
          <Link className={styles.action} href={model.unavailable.productAction.href}>
            {model.unavailable.productAction.label}
          </Link>
          <Link className={styles.secondaryAction} href={model.unavailable.synthAction.href}>
            {model.unavailable.synthAction.label}
          </Link>
        </div>
      </section>
    </main>
  );
}
