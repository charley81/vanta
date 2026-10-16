"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useBag } from "./bag-provider";
import styles from "./shell-navigation.module.css";

function BagDestinations() {
  const pathname = usePathname();
  const { closeBag, consumeBagHistory } = useBag();

  return (
    <div className={styles.bagLinks}>
      {pathname === "/monolith" ? (
        <button data-bag-action onClick={closeBag} type="button">
          Return to Product
        </button>
      ) : (
        <Link href="/monolith" onNavigate={consumeBagHistory} replace>
          Return to Product
        </Link>
      )}
      <Link href="/synth" onNavigate={consumeBagHistory} replace>
        Open MORPH Lab
      </Link>
    </div>
  );
}

export function BagOverlayBoundary() {
  const { removeFromBag, retry, state, consumeBagHistory } = useBag();
  const confirmed = state.confirmed;
  const item = confirmed?.item ?? null;

  return (
    <div className={styles.bagBoundary}>
      {state.pending ? (
        <p className={styles.bagPending} role="status">
          {state.pending === "read"
            ? "Checking Bag…"
            : state.pending === "add"
              ? "Adding MONOLITH to Bag…"
              : "Removing MONOLITH…"}
        </p>
      ) : null}

      {state.error ? (
        <div className={styles.bagError} role="alert">
          <p>{state.error.message}</p>
          <button data-bag-action onClick={() => void retry()} type="button">
            Retry {state.error.operation}
          </button>
        </div>
      ) : null}

      {confirmed === null ? (
        <div className={styles.bagUnconfirmed}>
          <p>
            Bag contents will appear after the same-browser state is confirmed.
          </p>
          <button disabled type="button">
            Enter Checkout Preview
          </button>
          <BagDestinations />
        </div>
      ) : item === null ? (
        <div className={styles.emptyBag}>
          <p className={styles.emptyBagHeading}>Your Bag is empty.</p>
          <p>MONOLITH can be added from Product.</p>
          <BagDestinations />
        </div>
      ) : (
        <>
          <article className={styles.bagLineItem}>
            <div aria-hidden="true" className={styles.bagProductMark}>
              M
            </div>
            <div>
              <p>{item.name}</p>
              <p>
                {item.finish} / Quantity 1
              </p>
            </div>
            <p>{item.price.display}</p>
          </article>

          <button
            className={styles.removeAction}
            data-bag-action
            disabled={state.pending !== null}
            onClick={() => void removeFromBag()}
            type="button"
          >
            Remove MONOLITH
          </button>

          <dl className={styles.bagTotals}>
            <div>
              <dt>Subtotal</dt>
              <dd>{confirmed.subtotal?.display}</dd>
            </div>
          </dl>

          <div className={styles.bagDisclosure} role="note">
            <strong>Non-transactional preview</strong>
            <p>
              This path enters a non-transactional Checkout Preview. It uses
              synthetic details and cannot place an order or collect payment.
            </p>
          </div>

          <Link
            aria-disabled={state.pending !== null}
            className={styles.previewAction}
            href="/checkout-preview"
            onClick={(event) => {
              if (state.pending !== null) event.preventDefault();
            }}
            onNavigate={consumeBagHistory}
            replace
          >
            Enter Checkout Preview <span aria-hidden="true">→</span>
          </Link>

          <BagDestinations />
        </>
      )}
    </div>
  );
}
