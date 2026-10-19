"use client";

import { Fragment, type ReactNode, useId } from "react";

import {
  registerDeferredBagInvoker,
  useBag,
} from "./bag-provider";
import styles from "./shell-navigation.module.css";

type BagTriggerProps = {
  ariaDescribedBy?: string;
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  operation?: "add" | "open";
};

export function BagTrigger({
  ariaDescribedBy,
  ariaLabel,
  children,
  className,
  disabled = false,
  operation = "open",
}: BagTriggerProps) {
  const id = useId();
  const { activeInvokerId, addToBag, openBag, retry, state } = useBag();
  const count = state.confirmed?.item ? 1 : 0;
  const countKnown = state.confirmed !== null;
  const label =
    ariaLabel ??
    (countKnown
      ? `Open Bag, ${count} ${count === 1 ? "item" : "items"}`
      : "Open Bag, status unknown");
  const isActiveInvoker =
    activeInvokerId === id || activeInvokerId === "deferred";
  const adding = operation === "add" && state.pending === "add";
  const addError =
    operation === "add" &&
    isActiveInvoker &&
    state.error?.operation === "add"
      ? state.error
      : null;

  return (
    <Fragment>
      <button
        aria-controls="bag-dialog"
        aria-describedby={ariaDescribedBy}
        aria-expanded={state.open}
        aria-haspopup="dialog"
        aria-label={label}
        className={className}
        data-bag-action
        disabled={disabled || adding}
        onClick={(event) => {
          if (operation === "add") {
            void addToBag(event.currentTarget, id);
          } else {
            openBag(event.currentTarget, id);
          }
        }}
        ref={registerDeferredBagInvoker}
        type="button"
      >
        {adding ? (
          "Adding MONOLITH to Bag…"
        ) : (children ?? (
          <>
            Bag <span aria-hidden="true">/ {countKnown ? count : "—"}</span>
          </>
        ))}
      </button>
      {addError ? (
        <span className={styles.bagTriggerError} role="alert">
          {addError.message}{" "}
          <button data-bag-action onClick={() => void retry()} type="button">
            Retry
          </button>
        </span>
      ) : null}
    </Fragment>
  );
}

export function FooterBagTrigger() {
  return <BagTrigger />;
}
