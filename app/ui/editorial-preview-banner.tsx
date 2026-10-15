import type { EditorialPreviewSession } from "@/src/editorial/preview-policy";

import styles from "./editorial-preview-banner.module.css";

export function EditorialPreviewBanner({
  session,
}: {
  session: EditorialPreviewSession;
}) {
  const releases = session.perspective.slice(0, -1);
  const label = releases.length > 0
    ? `Release preview: ${releases.join(" → ")}`
    : "Draft preview";

  return (
    <aside className={styles.banner} data-editorial-preview role="status">
      <div>
        <strong>EDITORIAL PREVIEW</strong>
        <span>{label}</span>
        <span>Private · no-store · Bag disabled</span>
      </div>
      <form action="/api/editorial/preview/exit" method="post">
        <button type="submit">Exit preview</button>
      </form>
    </aside>
  );
}
