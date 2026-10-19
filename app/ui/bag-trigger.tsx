"use client";

import { lazy, type ReactNode, Suspense, useState } from "react";

const InteractiveBagTrigger = lazy(() =>
  import("./bag-trigger-runtime").then((module) => ({
    default: module.BagTrigger,
  })),
);

type BagActivationGlobal = typeof globalThis & {
  __vantaBagActivation?: Promise<void>;
};

type BagTriggerProps = {
  ariaDescribedBy?: string;
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  operation?: "add" | "open";
};

export function BagTrigger(props: BagTriggerProps) {
  const [active, setActive] = useState(false);
  const countLabel = props.ariaLabel ?? "Open Bag, status unknown";
  const fallback = (
    <button
      aria-controls="bag-dialog"
      aria-describedby={props.ariaDescribedBy}
      aria-expanded="false"
      aria-haspopup="dialog"
      aria-label={countLabel}
      className={props.className}
      data-bag-action
      disabled={props.disabled}
      onClick={(event) => {
        const invoker = event.currentTarget;
        setActive(true);
        const scope = globalThis as BagActivationGlobal;
        const activation = import("./bag-provider").then(
          ({ activateDeferredBag }) => {
            activateDeferredBag(props.operation ?? "open", invoker);
          },
        );
        scope.__vantaBagActivation = activation;
        void activation.then(() => delete scope.__vantaBagActivation);
      }}
      type="button"
    >
      {props.children ?? (
        <>
          Bag <span aria-hidden="true">/ —</span>
        </>
      )}
    </button>
  );

  return active ? (
    <Suspense fallback={fallback}>
      <InteractiveBagTrigger {...props} />
    </Suspense>
  ) : fallback;
}

export function FooterBagTrigger() {
  return <BagTrigger />;
}
