"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { BagOverlayBoundary } from "./bag-overlay-boundary";
import { useBag } from "./bag-provider";
import styles from "./shell-navigation.module.css";

const destinations = [
  { href: "/", label: "Home" },
  { href: "/monolith", label: "Product" },
  { href: "/synth", label: "Synth" },
] as const;

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return destinations.map(({ href, label }) => (
    <Link
      aria-current={pathname === href ? "page" : undefined}
      href={href}
      key={href}
      onNavigate={onNavigate}
    >
      {label}
    </Link>
  ));
}

export function ShellNavigation() {
  const { closeBag, state } = useBag();
  const [menuOpen, setMenuOpen] = useState(false);
  const bagDialogRef = useRef<HTMLDialogElement>(null);
  const bagHeadingRef = useRef<HTMLHeadingElement>(null);
  const menuDialogRef = useRef<HTMLDialogElement>(null);
  const menuInvokerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = menuDialogRef.current;
    if (menuOpen && dialog && !dialog.open) dialog.showModal();
    if (!menuOpen && dialog?.open) dialog.close();
  }, [menuOpen]);

  useEffect(() => {
    const dialog = bagDialogRef.current;
    if (state.open && dialog && !dialog.open) {
      setMenuOpen(false);
      dialog.showModal();
      requestAnimationFrame(() => bagHeadingRef.current?.focus());
    }
    if (!state.open && dialog?.open) dialog.close();
  }, [state.open]);

  function openMenu(invoker: HTMLButtonElement) {
    menuInvokerRef.current = invoker;
    setMenuOpen(true);
  }

  function closeMenu() {
    setMenuOpen(false);
    requestAnimationFrame(() => menuInvokerRef.current?.focus());
  }

  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable.at(0);
    const last = focusable.at(-1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className={styles.navigation}>
      <nav
        aria-label="Primary navigation"
        className={`${styles.links} ${styles.wide}`}
      >
        <NavigationLinks />
      </nav>

      <button
        aria-controls="navigation-dialog"
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        aria-label="Open menu"
        className={styles.menuTrigger}
        onClick={(event) => openMenu(event.currentTarget)}
        type="button"
      >
        Menu
      </button>

      <BagTrigger />

      <dialog
        aria-labelledby="navigation-dialog-title"
        className={styles.dialog}
        id="navigation-dialog"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        onKeyDown={containFocus}
        ref={menuDialogRef}
      >
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHeading}>
            <h2 id="navigation-dialog-title">Navigation</h2>
            <button autoFocus onClick={closeMenu} type="button">
              Close menu
            </button>
          </div>
          <nav aria-label="Menu navigation" className={styles.dialogLinks}>
            <NavigationLinks onNavigate={closeMenu} />
          </nav>
        </div>
      </dialog>

      <dialog
        aria-labelledby="bag-dialog-title"
        className={`${styles.dialog} ${styles.bagDialog}`}
        id="bag-dialog"
        onCancel={(event) => {
          event.preventDefault();
          closeBag();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeBag();
        }}
        onKeyDown={containFocus}
        ref={bagDialogRef}
      >
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHeading}>
            <div>
              <p className={styles.dialogStatus}>Same-browser Bag / 30 days</p>
              <h2 id="bag-dialog-title" ref={bagHeadingRef} tabIndex={-1}>
                Bag
              </h2>
            </div>
            <button onClick={closeBag} type="button">
              Close Bag
            </button>
          </div>
          <BagOverlayBoundary />
        </div>
      </dialog>
    </div>
  );
}

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
  const isActiveInvoker = activeInvokerId === id;
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
