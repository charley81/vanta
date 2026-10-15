"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./shell-navigation.module.css";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

const destinations = [
  { href: "/", label: "Home" },
  { href: "/monolith", label: "Product" },
  { href: "/synth", label: "Synth" },
] as const;

type Disclosure = "bag" | "menu";

const OPEN_BAG_EVENT = "vanta:open-bag";

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

export function ShellNavigation({ bagContent }: { bagContent: ReactNode }) {
  const [activeDisclosure, setActiveDisclosure] =
    useState<Disclosure | null>(null);
  const bagDialogRef = useRef<HTMLDialogElement>(null);
  const menuDialogRef = useRef<HTMLDialogElement>(null);
  const invokerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function openBagFromShell(event: Event) {
      const invoker = (event as CustomEvent<HTMLButtonElement>).detail;
      if (invoker instanceof HTMLButtonElement) {
        invokerRef.current = invoker;
        setActiveDisclosure("bag");
      }
    }

    window.addEventListener(OPEN_BAG_EVENT, openBagFromShell);
    return () => window.removeEventListener(OPEN_BAG_EVENT, openBagFromShell);
  }, []);

  useEffect(() => {
    const dialogs = {
      bag: bagDialogRef.current,
      menu: menuDialogRef.current,
    };

    for (const [name, dialog] of Object.entries(dialogs)) {
      if (dialog?.open && name !== activeDisclosure) dialog.close();
    }

    const activeDialog = activeDisclosure
      ? dialogs[activeDisclosure]
      : undefined;
    if (activeDialog && !activeDialog.open) activeDialog.showModal();
  }, [activeDisclosure]);

  function openDisclosure(
    disclosure: Disclosure,
    invoker: HTMLButtonElement,
  ) {
    invokerRef.current = invoker;
    setActiveDisclosure(disclosure);
  }

  function closeDisclosure() {
    setActiveDisclosure(null);
    requestAnimationFrame(() => invokerRef.current?.focus());
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
        aria-expanded={activeDisclosure === "menu"}
        aria-haspopup="dialog"
        aria-label="Open menu"
        className={styles.menuTrigger}
        onClick={(event) => openDisclosure("menu", event.currentTarget)}
        type="button"
      >
        Menu
      </button>

      <button
        aria-controls="bag-dialog"
        aria-expanded={activeDisclosure === "bag"}
        aria-haspopup="dialog"
        aria-label="Open Bag, 0 items"
        onClick={(event) => openDisclosure("bag", event.currentTarget)}
        type="button"
      >
        Bag <span aria-hidden="true">/ 0</span>
      </button>

      <dialog
        aria-labelledby="navigation-dialog-title"
        className={styles.dialog}
        id="navigation-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDisclosure();
        }}
        onClose={closeDisclosure}
        onKeyDown={containFocus}
        ref={menuDialogRef}
      >
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHeading}>
            <h2 id="navigation-dialog-title">Navigation</h2>
            <button autoFocus onClick={closeDisclosure} type="button">
              Close menu
            </button>
          </div>
          <nav aria-label="Menu navigation" className={styles.dialogLinks}>
            <NavigationLinks onNavigate={closeDisclosure} />
          </nav>
        </div>
      </dialog>

      <dialog
        aria-labelledby="bag-dialog-title"
        className={styles.dialog}
        id="bag-dialog"
        onClick={(event) => {
          if (
            event.target === event.currentTarget ||
            (event.target instanceof Element && event.target.closest("a[href]"))
          ) {
            closeDisclosure();
          }
        }}
        onClose={closeDisclosure}
        onKeyDown={containFocus}
        ref={bagDialogRef}
      >
        <div className={styles.dialogPanel}>
          <div className={styles.dialogHeading}>
            <h2 id="bag-dialog-title">Bag</h2>
            <button autoFocus onClick={closeDisclosure} type="button">
              Close Bag
            </button>
          </div>
          {bagContent}
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
};

export function BagTrigger({
  ariaDescribedBy,
  ariaLabel = "Open Bag, 0 items",
  children = (
    <>
      Bag <span aria-hidden="true">/ 0</span>
    </>
  ),
  className,
}: BagTriggerProps) {
  return (
    <button
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      className={className}
      onClick={(event) =>
        window.dispatchEvent(
          new CustomEvent(OPEN_BAG_EVENT, { detail: event.currentTarget }),
        )
      }
      type="button"
    >
      {children}
    </button>
  );
}

export function FooterBagTrigger() {
  return <BagTrigger />;
}
