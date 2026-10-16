"use client";

import Link, { useLinkStatus } from "next/link";

import styles from "./product.module.css";

function NavigationStatus() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-live="polite"
      className={styles.navigationStatus}
      data-navigation-state={pending ? "pending" : "idle"}
    >
      {pending ? "Opening MORPH Lab…" : ""}
    </span>
  );
}

export function ProductRouteLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className={styles.labLink} href={href} prefetch={false}>
      <span>{label}</span>
      <span aria-hidden="true" className={styles.linkArrow}>
        ↗
      </span>
      <NavigationStatus />
    </Link>
  );
}
