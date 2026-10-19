import type { Metadata } from "next";

import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: { absolute: "Privacy notice | VANTA" },
  description:
    "How the VANTA portfolio site handles essential Bag state, temporary browser state, provider request data, and Editorial media.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function PrivacyPage() {
  return (
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>PRIVACY / OPERATING NOTICE</p>
        <h1>Privacy at VANTA.</h1>
        <p className={styles.lede}>
          VANTA is a portfolio demonstration. It does not operate a store,
          process orders, or collect buyer details. This notice describes the
          limited technical data involved when the site works.
        </p>
        <p className={styles.effective}>Effective 19 October 2026</p>
      </header>

      <section aria-labelledby="collection-heading" className={styles.section}>
        <p className={styles.index}>01</p>
        <div>
          <h2 id="collection-heading">No visitor profile</h2>
          <p>
            VANTA uses no custom analytics, advertising, fingerprinting,
            session replay, journey telemetry, marketing cookies, or
            cross-page visitor identifier. Checkout Preview uses only fixed
            fictional details and does not accept a name, address, contact,
            payment, or order.
          </p>
        </div>
      </section>

      <section aria-labelledby="storage-heading" className={styles.section}>
        <p className={styles.index}>02</p>
        <div>
          <h2 id="storage-heading">State on your device</h2>
          <p>
            If you add MONOLITH to Bag, VANTA sets one strictly necessary,
            signed <code>__Host-vanta_bag</code> cookie. It contains only a
            schema version, whether MONOLITH is present, and an expiry no more
            than 30 days away. It is secure, HttpOnly, host-only, and
            SameSite=Strict; it contains no identity, address, quantity, price,
            or payment data.
          </p>
          <p>
            MORPH Lab and Checkout Preview keep bounded state only for the
            current browser tab. Checkout Preview state expires after 30
            minutes of inactivity. You can remove the Bag item or clear site
            data in your browser at any time.
          </p>
        </div>
      </section>

      <section aria-labelledby="providers-heading" className={styles.section}>
        <p className={styles.index}>03</p>
        <div>
          <h2 id="providers-heading">Infrastructure providers</h2>
          <p>
            Netlify hosts the application and necessarily receives ordinary
            request information such as network address, requested URL, time,
            and browser headers. The owner uses privacy-minimal provider status
            and error logs only when operational diagnosis requires them.
          </p>
          <p>
            Sanity supplies published Editorial content and media. Requests for
            media from Sanity&apos;s content delivery network necessarily include
            ordinary request information. VANTA does not combine provider data
            into a visitor profile or export it to a custom telemetry service.
          </p>
        </div>
      </section>

      <section aria-labelledby="questions-heading" className={styles.section}>
        <p className={styles.index}>04</p>
        <div>
          <h2 id="questions-heading">Questions</h2>
          <p>
            Contact the site owner through the public VANTA repository. Do not
            include sensitive or personal information in a public issue.
          </p>
          <a
            className={styles.action}
            href="https://github.com/charley81/vanta/issues"
          >
            VANTA ISSUE TRACKER
          </a>
        </div>
      </section>
    </main>
  );
}
