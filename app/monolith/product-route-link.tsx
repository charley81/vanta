import { NavigationProgressLink } from "../ui/navigation-progress-link";
import styles from "./product.module.css";

export function ProductRouteLink({ href, label }: { href: string; label: string }) {
  return (
    <NavigationProgressLink
      className={styles.labLink}
      href={href}
      pendingLabel="Opening MORPH Lab…"
      statusClassName={styles.navigationStatus}
    >
      <span>{label}</span>
      <span aria-hidden="true" className={styles.linkArrow}>
        ↗
      </span>
    </NavigationProgressLink>
  );
}
