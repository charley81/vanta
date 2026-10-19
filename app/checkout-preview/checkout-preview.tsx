"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  PREVIEW_HISTORY_KEY,
  PREVIEW_INACTIVITY_MS,
  advancePreviewSession,
  createDefaultPreviewSession,
  createPreviewSessionRecord,
  parsePreviewHistoryEntry,
  type PreviewSession,
  type PreviewSessionRecord,
  type PreviewStage,
  type PreviewVisibleStage,
} from "@/src/continuity";
import type { CheckoutPreviewRouteViewModel } from "@/src/checkout-preview/model";
import { ROUTE_INTENT_EVENT } from "@/src/continuity/composition";

import { useBag } from "../ui/bag-provider";
import styles from "./checkout-preview.module.css";

function historyStateWithPreview(
  state: unknown,
  stage: PreviewVisibleStage,
  depth: number,
) {
  const next = state && typeof state === "object" ? { ...state } : {};
  return {
    ...next,
    [PREVIEW_HISTORY_KEY]: { version: 1, stage, depth },
  };
}

function historyMarker(state: unknown): unknown {
  return state && typeof state === "object"
    ? (state as Record<string, unknown>)[PREVIEW_HISTORY_KEY]
    : undefined;
}

function historyStateWithoutPreview(state: unknown) {
  const next = state && typeof state === "object"
    ? { ...state } as Record<string, unknown>
    : {};
  delete next[PREVIEW_HISTORY_KEY];
  return next;
}

type PendingHistoryAction =
  | { kind: "navigate"; target: "/" | "/monolith" | "/synth" }
  | { kind: "external"; target: string }
  | { kind: "restart" };

function OrderLedger({ model }: { model: CheckoutPreviewRouteViewModel }) {
  return (
    <aside aria-label="Preview order summary" className={styles.orderLedger}>
      <p className={styles.eyebrow}>{model.ledger.label}</p>
      <div className={styles.lineItem}>
        <span aria-hidden="true" className={styles.productMark}>M</span>
        <div>
          <strong>{model.ledger.item}</strong>
          <span>{model.ledger.detail}</span>
        </div>
      </div>
      <dl>
        {model.ledger.rows.map((row) => (
          <div className={row.label === "Preview total" ? styles.total : undefined} key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.ledgerBoundary}>{model.ledger.boundary}</p>
    </aside>
  );
}

function Unavailable({ model }: { model: CheckoutPreviewRouteViewModel }) {
  return (
    <section aria-labelledby="checkout-preview-heading" className={styles.unavailable}>
      <p className={styles.eyebrow}>Signal Ledger / unavailable</p>
      <h1 id="checkout-preview-heading" tabIndex={-1}>{model.unavailable.heading}</h1>
      <p>{model.unavailable.body}</p>
      <Link className={styles.primaryAction} href={model.unavailable.productAction.href} replace>
        {model.unavailable.productAction.label}
      </Link>
    </section>
  );
}

function SyntheticPanel({
  model,
  stage,
}: {
  model: CheckoutPreviewRouteViewModel;
  stage: PreviewStage;
}) {
  if (stage === "contact") {
    return (
      <section aria-labelledby="contact-data" className={styles.syntheticPanel}>
        <div className={styles.panelTopline}>
          <p id="contact-data">{model.contact.label}</p>
          <span>{model.contact.status}</span>
        </div>
        <dl className={styles.syntheticDetails}>
          {model.contact.values.map((value) => (
            <div key={value.label}>
              <dt>{value.label}</dt>
              <dd>{value.value}</dd>
            </div>
          ))}
        </dl>
        <p className={styles.panelExplanation}>{model.contact.explanation}</p>
      </section>
    );
  }

  if (stage === "delivery") {
    return (
      <section aria-labelledby="delivery-data" className={styles.syntheticPanel}>
        <div className={styles.panelTopline}>
          <p id="delivery-data">{model.delivery.label}</p>
          <span>{model.delivery.status}</span>
        </div>
        <address className={styles.address}>{model.delivery.destination}</address>
        <dl className={styles.syntheticDetails}>
          {model.delivery.values.map((value) => (
            <div key={value.label}>
              <dt>{value.label}</dt>
              <dd>{value.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  return (
    <section aria-labelledby="review-data" className={styles.syntheticPanel}>
      <div className={styles.panelTopline}>
        <p id="review-data">{model.review.label}</p>
        <span>{model.review.status}</span>
      </div>
      <ul className={styles.reviewList}>
        {model.review.statements.map((statement) => <li key={statement}>{statement}</li>)}
      </ul>
      <p className={styles.panelExplanation}>{model.review.explanation}</p>
    </section>
  );
}

function RecoveryDialog({
  onRestart,
  onResume,
  session,
}: {
  onRestart(): void;
  onResume(): void;
  session: PreviewSession;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const label = session.completed
    ? "completed preview"
    : session.activeStage[0].toUpperCase() + session.activeStage.slice(1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => resumeRef.current?.focus());
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-labelledby="preview-recovery-heading"
      className={styles.recoveryDialog}
      onCancel={(event) => event.preventDefault()}
      ref={dialogRef}
      role="alertdialog"
    >
      <p className={styles.eyebrow}>Preview interrupted</p>
      <h2 id="preview-recovery-heading">Continue Checkout Preview?</h2>
      <p>
        Only this ephemeral preview position is available. No visitor data was saved because none was requested. MONOLITH remains in the Bag.
      </p>
      <div className={styles.recoveryActions}>
        <button className={styles.primaryAction} onClick={onResume} ref={resumeRef} type="button">
          Resume {label}
        </button>
        <button className={styles.secondaryAction} onClick={onRestart} type="button">
          Start again
        </button>
      </div>
    </dialog>
  );
}

function Terminal({
  headingRef,
  model,
  onRestart,
  onReturn,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  model: CheckoutPreviewRouteViewModel;
  onRestart(): void;
  onReturn(): void;
}) {
  return (
    <div className={styles.terminalLayout}>
      <section className={styles.terminal}>
        <p className={styles.eyebrow}>{model.terminal.eyebrow}</p>
        <h1 ref={headingRef} tabIndex={-1}>{model.terminal.heading}</h1>
        <p className={styles.terminalStatement}>{model.terminal.statement}</p>
        <dl className={styles.terminalFacts}>
          {model.terminal.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.actions}>
          <button className={styles.primaryAction} onClick={onReturn} type="button">Return to MONOLITH</button>
          <button className={styles.secondaryAction} onClick={onRestart} type="button">Preview again</button>
        </div>
      </section>
      <OrderLedger model={model} />
    </div>
  );
}

export function CheckoutPreview({ model }: { model: CheckoutPreviewRouteViewModel }) {
  const router = useRouter();
  const { confirmBag, retry, state } = useBag();
  const [session, setSession] = useState<PreviewSession | null>(null);
  const [visibleStage, setVisibleStage] = useState<PreviewVisibleStage>("contact");
  const [recovery, setRecovery] = useState<PreviewSession | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const recordRef = useRef<PreviewSessionRecord | null>(null);
  const sessionRef = useRef<PreviewSession | null>(null);
  const depthRef = useRef(0);
  const pendingHistoryActionRef = useRef<PendingHistoryAction | null>(null);

  const publishSession = useCallback((next: PreviewSession) => {
    if (!recordRef.current?.write(next)) return false;
    sessionRef.current = next;
    setSession(next);
    return true;
  }, []);

  const replaceHistory = useCallback((stage: PreviewVisibleStage, depth: number) => {
    depthRef.current = depth;
    window.history.replaceState(
      historyStateWithPreview(window.history.state, stage, depth),
      "",
      window.location.href,
    );
  }, []);

  const startAgain = useCallback(() => {
    const fresh = createDefaultPreviewSession();
    if (!publishSession(fresh)) return;
    setVisibleStage("contact");
    replaceHistory("contact", 0);
    setRecovery(null);
  }, [publishSession, replaceHistory]);

  const clearPreviewConcern = useCallback(() => {
    recordRef.current?.clear();
    recordRef.current = null;
    sessionRef.current = null;
    setSession(null);
    setRecovery(null);
    window.history.replaceState(
      historyStateWithoutPreview(window.history.state),
      "",
      window.location.href,
    );
  }, []);

  const leavePreviewNow = useCallback((target: "/" | "/monolith" | "/synth") => {
    document.dispatchEvent(new Event(ROUTE_INTENT_EVENT));
    clearPreviewConcern();
    router.replace(target);
  }, [clearPreviewConcern, router]);

  const runHistoryAction = useCallback((action: PendingHistoryAction) => {
    if (action.kind === "restart") {
      startAgain();
    } else if (action.kind === "external") {
      clearPreviewConcern();
      window.location.replace(action.target);
    } else {
      leavePreviewNow(action.target);
    }
  }, [clearPreviewConcern, leavePreviewNow, startAgain]);

  const consumePreviewHistory = useCallback((action: PendingHistoryAction) => {
    const stateValue = window.history.state as Record<string, unknown> | null;
    const bagDepth = stateValue?.__vantaBagDisclosure ? 1 : 0;
    const steps = depthRef.current + bagDepth;
    if (steps === 0) {
      runHistoryAction(action);
      return;
    }
    pendingHistoryActionRef.current = action;
    window.history.go(-steps);
  }, [runHistoryAction]);

  const resumePreview = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    const transition = advancePreviewSession(current, visibleStage);
    if (!transition.ok || !publishSession(transition.value)) return;
    setRecovery(null);
  }, [publishSession, visibleStage]);

  const moveTo = useCallback((stage: PreviewVisibleStage) => {
    const current = sessionRef.current;
    if (!current) return;
    const transition = advancePreviewSession(current, stage);
    if (!transition.ok || !publishSession(transition.value)) return;

    const nextDepth = depthRef.current + 1;
    if (nextDepth > 64) {
      replaceHistory(stage, 64);
    } else {
      depthRef.current = nextDepth;
      window.history.pushState(
        historyStateWithPreview(window.history.state, stage, nextDepth),
        "",
        window.location.href,
      );
    }
    setVisibleStage(stage);
  }, [publishSession, replaceHistory]);

  useEffect(() => {
    void confirmBag();
    const revalidate = () => void confirmBag();
    const revalidateWhenVisible = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidateWhenVisible);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidateWhenVisible);
    };
  }, [confirmBag]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || !state.confirmed?.item || sessionRef.current) return;
      const record = createPreviewSessionRecord(window.sessionStorage);
      recordRef.current = record;
      const existing = record.read();
      if (existing) {
        sessionRef.current = existing;
        setSession(existing);
        const parsed = parsePreviewHistoryEntry(
          historyMarker(window.history.state),
          existing,
        );
        if (parsed.ok) {
          depthRef.current = parsed.value.depth;
          setVisibleStage(parsed.value.stage);
        } else {
          const resumeStage = existing.completed ? "terminal" : existing.activeStage;
          setVisibleStage(resumeStage);
          replaceHistory(resumeStage, 0);
        }
        setRecovery(existing);
        return;
      }

      const fresh = createDefaultPreviewSession();
      if (!record.write(fresh)) return;
      sessionRef.current = fresh;
      setSession(fresh);
      setVisibleStage("contact");
      replaceHistory("contact", 0);
    });
    return () => {
      cancelled = true;
    };
  }, [replaceHistory, state.confirmed?.item]);

  useEffect(() => {
    const expiresAt = state.confirmed?.expiresAt;
    if (!state.confirmed?.item || !expiresAt) return;
    const remaining = Math.max(0, Date.parse(expiresAt) - Date.now());
    const timeout = window.setTimeout(
      () => void confirmBag(),
      Math.min(remaining, 2_147_000_000),
    );
    return () => window.clearTimeout(timeout);
  }, [confirmBag, state.confirmed]);

  useEffect(() => {
    if (state.confirmed === null || state.confirmed.item || !sessionRef.current) return;
    queueMicrotask(() => {
      recordRef.current?.clear();
      recordRef.current = null;
      sessionRef.current = null;
      setSession(null);
      setRecovery(null);
      window.history.replaceState(
        historyStateWithoutPreview(window.history.state),
        "",
        window.location.href,
      );
    });
  }, [state.confirmed]);

  useEffect(() => {
    if (!state.confirmed?.item) return;

    function handlePopState() {
      const pendingAction = pendingHistoryActionRef.current;
      if (pendingAction) {
        pendingHistoryActionRef.current = null;
        runHistoryAction(pendingAction);
        return;
      }

      const current = recordRef.current?.read();
      if (!current) return;
      const parsed = parsePreviewHistoryEntry(historyMarker(window.history.state), current);
      if (!parsed.ok) {
        const fresh = createDefaultPreviewSession();
        if (publishSession(fresh)) {
          setVisibleStage("contact");
          replaceHistory("contact", 0);
        }
        return;
      }

      depthRef.current = parsed.value.depth;
      if (parsed.value.stage === "terminal") {
        sessionRef.current = current;
        setSession(current);
        setVisibleStage("terminal");
        return;
      }
      const transition = advancePreviewSession(current, parsed.value.stage);
      if (!transition.ok || !publishSession(transition.value)) return;
      setVisibleStage(parsed.value.stage);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [publishSession, replaceHistory, runHistoryAction, state.confirmed?.item]);

  useEffect(() => {
    function handleGlobalNavigation(event: MouseEvent) {
      if (!sessionRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      const anchor = target instanceof Element
        ? target.closest<HTMLAnchorElement>("a[href]")
        : null;
      if (!anchor || anchor.target || anchor.download) return;
      const destination = new URL(anchor.href, window.location.href);
      const internalTarget =
        destination.origin === window.location.origin &&
        (destination.pathname === "/" ||
          destination.pathname === "/monolith" ||
          destination.pathname === "/synth")
          ? destination.pathname
          : null;

      event.preventDefault();
      event.stopImmediatePropagation();
      consumePreviewHistory(
        internalTarget
          ? { kind: "navigate", target: internalTarget }
          : { kind: "external", target: destination.href },
      );
    }

    document.addEventListener("click", handleGlobalNavigation, true);
    return () => document.removeEventListener("click", handleGlobalNavigation, true);
  }, [consumePreviewHistory]);

  useEffect(() => {
    if (!session || recovery) return;
    const frame = requestAnimationFrame(() => headingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [recovery, session, visibleStage]);

  useEffect(() => {
    if (!session) return;
    const remaining = Math.max(
      0,
      session.lastMeaningfulActivityAt + PREVIEW_INACTIVITY_MS - Date.now(),
    );
    const timeout = window.setTimeout(
      () => consumePreviewHistory({ kind: "restart" }),
      remaining,
    );
    return () => window.clearTimeout(timeout);
  }, [consumePreviewHistory, session]);

  const checking = state.confirmed === null && !state.error;
  const activeStage = visibleStage === "terminal" ? null : visibleStage;
  const activeMeta = activeStage
    ? model.stages.find((stage) => stage.key === activeStage)
    : null;
  const reachedIndex = session
    ? model.stages.findIndex((stage) => stage.key === session.reachedStage)
    : 0;

  function continueForward() {
    if (activeStage === "contact") moveTo("delivery");
    else if (activeStage === "delivery") moveTo("review");
    else if (activeStage === "review") moveTo("terminal");
  }

  return (
    <main className={styles.previewMain} id="main-content" tabIndex={-1}>
      <p className={styles.banner}>{model.banner}</p>
      {state.confirmed?.item && session ? (
        <header className={styles.previewHeader}>
          <div>
            <span>VANTA / public experience</span>
            <strong>Checkout Preview</strong>
          </div>
          <button
            onClick={() => consumePreviewHistory({ kind: "navigate", target: "/monolith" })}
            type="button"
          >
            Exit preview
          </button>
        </header>
      ) : null}
      {checking ? (
        <section className={styles.unavailable} role="status">
          <p className={styles.eyebrow}>Signal Ledger</p>
          <h1>Confirming Bag…</h1>
          <p>Checking same-browser MONOLITH membership.</p>
        </section>
      ) : state.error && state.confirmed === null ? (
        <section className={styles.unavailable}>
          <p className={styles.eyebrow}>Signal Ledger / unavailable</p>
          <h1>{model.unavailable.heading}</h1>
          <p>{state.error.message}</p>
          <button className={styles.primaryAction} onClick={() => void retry()} type="button">
            Retry Bag confirmation
          </button>
        </section>
      ) : !state.confirmed?.item ? (
        <Unavailable model={model} />
      ) : session && visibleStage === "terminal" ? (
        <Terminal
          headingRef={headingRef}
          model={model}
          onRestart={() => consumePreviewHistory({ kind: "restart" })}
          onReturn={() => consumePreviewHistory({ kind: "navigate", target: "/monolith" })}
        />
      ) : session && activeStage && activeMeta ? (
        <div className={styles.ledgerLayout}>
          <section className={styles.stage}>
            <ol aria-label="Checkout Preview progress" className={styles.progress}>
              {model.stages.map((stage, index) => (
                <li key={stage.key}>
                  <button
                    aria-current={stage.key === activeStage ? "step" : undefined}
                    aria-label={stage.label}
                    disabled={index > reachedIndex}
                    onClick={() => moveTo(stage.key)}
                    type="button"
                  >
                    <span>{stage.index}</span>
                    <strong>{stage.label}</strong>
                  </button>
                </li>
              ))}
            </ol>
            <header className={styles.stageHeading}>
              <p className={styles.eyebrow}>{activeMeta.index} / Checkout Preview</p>
              <h1 ref={headingRef} tabIndex={-1}>{activeMeta.label}</h1>
              <p>{activeMeta.description}</p>
            </header>
            <SyntheticPanel model={model} stage={activeStage} />
            <div className={styles.actions}>
              <button className={styles.secondaryAction} onClick={() => window.history.back()} type="button">Back</button>
              <button className={styles.primaryAction} onClick={continueForward} type="button">
                {activeStage === "contact"
                  ? "Continue to delivery"
                  : activeStage === "delivery"
                    ? "Continue to review"
                    : "Complete preview"}
              </button>
            </div>
          </section>
          <OrderLedger model={model} />
        </div>
      ) : null}
      <p aria-live="polite" className={styles.srOnly}>
        {visibleStage === "terminal" ? model.terminal.heading : `${activeMeta?.label ?? ""} stage`}
      </p>
      {recovery ? (
        <RecoveryDialog
          onRestart={() => consumePreviewHistory({ kind: "restart" })}
          onResume={resumePreview}
          session={recovery}
        />
      ) : null}
    </main>
  );
}
