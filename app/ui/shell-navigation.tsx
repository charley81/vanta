"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  lazy,
  type MouseEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import { BagTrigger } from "./bag-trigger-runtime";
import { useBag } from "./bag-provider";
import styles from "./shell-navigation.module.css";

const BagOverlayBoundary = lazy(() =>
  import("./bag-overlay-boundary").then((module) => ({
    default: module.BagOverlayBoundary,
  })),
);

const destinations = [
  { href: "/", label: "Home" },
  { href: "/monolith", label: "Product" },
  { href: "/synth", label: "Synth" },
] as const;

function isPrimaryNavigationClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

type BagActivationGlobal = typeof globalThis & {
  __vantaBagActivation?: Promise<void>;
};

function NavigationLinks({ onRouteIntent }: { onRouteIntent?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return destinations.map(({ href, label }) => (
    <Link
      aria-current={pathname === href ? "page" : undefined}
      href={href}
      key={href}
      onClick={(event) => {
        if (!isPrimaryNavigationClick(event)) return;
        onRouteIntent?.();
        const activation = (globalThis as BagActivationGlobal)
          .__vantaBagActivation;
        if (activation) {
          event.preventDefault();
          void activation.then(() => router.push(href));
        }
      }}
    >
      {label}
    </Link>
  ));
}

export function ShellNavigation() {
  const pathname = usePathname();
  const { closeBag, state } = useBag();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
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
      setMenuPath(null);
      dialog.showModal();
      requestAnimationFrame(() => bagHeadingRef.current?.focus());
    }
    if (!state.open && dialog?.open) dialog.close();
  }, [state.open]);

  function openMenu(invoker: HTMLButtonElement) {
    menuInvokerRef.current = invoker;
    setMenuPath(pathname);
    document.dispatchEvent(new CustomEvent("vanta:menu-opened"));
  }

  function closeMenu() {
    setMenuPath(null);
    requestAnimationFrame(() => menuInvokerRef.current?.focus());
  }

  function dismissMenuForNavigation() {
    setMenuPath(null);
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
            <NavigationLinks onRouteIntent={dismissMenuForNavigation} />
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
          {state.open ? (
            <Suspense fallback={<p role="status">Checking Bag…</p>}>
              <BagOverlayBoundary />
            </Suspense>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
