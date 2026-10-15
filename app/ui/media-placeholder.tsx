import styles from "./core-route.module.css";

type MediaPlaceholderProps = {
  label: string;
  detail: string;
};

export function MediaPlaceholder({ label, detail }: MediaPlaceholderProps) {
  return (
    <figure className={styles.mediaPlaceholder}>
      <figcaption className={styles.mediaPlaceholderLabel}>
        <span>{label}</span>
        <span>{detail}</span>
      </figcaption>
    </figure>
  );
}
