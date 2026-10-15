import Link from "next/link";

import { CATALOG } from "@/src/catalog/catalog";

import styles from "./shell-navigation.module.css";

export function BagOverlayBoundary() {
  return (
    <div className={styles.bagBoundary}>
      <p className={styles.dialogStatus}>Bag service unavailable</p>
      <p>
        This Core build does not store Bag contents. MONOLITH remains available
        to review at {CATALOG.price.display}.
      </p>
      <div className={styles.bagActions}>
        <Link href="/monolith">Return to Product</Link>
        <Link href="/synth">Open MORPH Lab</Link>
      </div>
    </div>
  );
}
