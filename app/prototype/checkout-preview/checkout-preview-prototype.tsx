"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./checkout-preview.css";

export type VariantKey = "A" | "B" | "C";
export type PreviewStep =
  | "product"
  | "bag"
  | "contact"
  | "delivery"
  | "review"
  | "terminal";

type CheckoutPreviewPrototypeProps = {
  initialVariant: VariantKey;
  initialStep: PreviewStep;
};

type PreviewStage = Exclude<PreviewStep, "product" | "bag" | "terminal">;

const variants: Array<{
  key: VariantKey;
  name: string;
  thesis: string;
}> = [
  {
    key: "A",
    name: "Signal Ledger",
    thesis: "One deliberate step beside a persistent order ledger",
  },
  {
    key: "B",
    name: "Open Manifest",
    thesis: "The whole synthetic preview remains visible at once",
  },
  {
    key: "C",
    name: "Dispatch Console",
    thesis: "Milestones orbit a persistent shipment brief",
  },
];

const previewStages: Array<{
  key: PreviewStage;
  index: string;
  label: string;
  description: string;
}> = [
  {
    key: "contact",
    index: "01",
    label: "Contact",
    description: "Inspect the predefined recipient profile.",
  },
  {
    key: "delivery",
    index: "02",
    label: "Delivery",
    description: "Inspect the fictional destination and service.",
  },
  {
    key: "review",
    index: "03",
    label: "Review",
    description: "Confirm what this preview will—and will not—do.",
  },
];

const stageOrder: PreviewStep[] = [
  "bag",
  "contact",
  "delivery",
  "review",
  "terminal",
];

const variantClasses: Record<VariantKey, string> = {
  A: "variantA",
  B: "variantB",
  C: "variantC",
};

function updatePrototypeUrl(variant: VariantKey, step: PreviewStep) {
  const params = new URLSearchParams(window.location.search);
  params.set("variant", variant);
  params.set("step", step);
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}?${params.toString()}`,
  );
}

function VantaHeader({
  bagOpen,
  onBag,
}: {
  bagOpen: boolean;
  onBag: () => void;
}) {
  return (
    <header className={"siteHeader"}>
      <span className={"wordmark"}>VANTA</span>
      <nav aria-label="Primary">
        <a href="#prototype-main">Home</a>
        <a aria-current="page" href="#prototype-main">
          Product
        </a>
        <a href="#prototype-main">Synth</a>
      </nav>
      <button
        aria-expanded={bagOpen}
        className={"bagAction"}
        onClick={onBag}
        type="button"
      >
        Bag <span aria-hidden="true">/</span> 1
      </button>
    </header>
  );
}

function ProductContext({ onBag }: { onBag: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className={"productContext"} id="prototype-main">
      <section className={"productImage"}>
        <Image
          alt="MONOLITH graphite desktop synthesizer"
          fill
          priority
          sizes="(max-width: 820px) 100vw, 52vw"
          src="/prototype/vanta-checkout-preview/monolith.jpg"
        />
        <span>GRAPHITE / INSTRUMENT 001</span>
      </section>
      <section className={"productCopy"}>
        <p className={"eyebrow"}>VANTA / EIGHT-VOICE HYBRID</p>
        <h1 ref={headingRef} tabIndex={-1}>
          MONOLITH
        </h1>
        <p className={"dek"}>Eight voices. One continuum.</p>
        <p>
          Product context remains exactly where the visitor left it. Closing the
          Bag or leaving Checkout Preview returns here with MONOLITH still held
          in the same-browser Bag.
        </p>
        <div className={"productPurchase"}>
          <strong>$2,499</strong>
          <button onClick={onBag} type="button">
            Open Bag <span aria-hidden="true">↗</span>
          </button>
        </div>
        <p className={"conceptNote"}>
          CONCEPT INSTRUMENT / NOT AVAILABLE FOR SALE
        </p>
      </section>
    </main>
  );
}

function ProductMiniature() {
  return (
    <div className={"productMiniature"}>
      <div className={"miniatureImage"}>
        <Image
          alt=""
          fill
          sizes="160px"
          src="/prototype/vanta-checkout-preview/monolith.jpg"
        />
      </div>
      <div>
        <p>MONOLITH</p>
        <span>Graphite / Quantity 1</span>
      </div>
      <strong>$2,499</strong>
    </div>
  );
}

function PreviewBoundary() {
  return (
    <div className={"previewBoundary"} role="note">
      <span>PREVIEW</span>
      <p>
        Synthetic details only. Nothing is entered, submitted, stored, or sent
        to Shopify.
      </p>
    </div>
  );
}

function OrderLedger({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      aria-label="Preview order summary"
      className={`${"orderLedger"} ${compact ? "orderLedgerCompact" : ""}`}
    >
      <p className={"eyebrow"}>ORDER LEDGER / SYNTHETIC</p>
      <ProductMiniature />
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>$2,499.00</dd>
        </div>
        <div>
          <dt>Preview delivery</dt>
          <dd>$0.00</dd>
        </div>
        <div>
          <dt>Tax</dt>
          <dd>Not calculated</dd>
        </div>
        <div className={"ledgerTotal"}>
          <dt>Preview total</dt>
          <dd>$2,499 USD</dd>
        </div>
      </dl>
      <p className={"ledgerFootnote"}>
        No charge, authorization, order, reservation, or price commitment.
      </p>
    </aside>
  );
}

function SyntheticPanel({ stage }: { stage: PreviewStage }) {
  if (stage === "contact") {
    return (
      <section className={"syntheticPanel"} aria-labelledby="contact-data">
        <div className={"panelTopline"}>
          <p id="contact-data">PREVIEW RECIPIENT</p>
          <span>PREDEFINED / FICTIONAL</span>
        </div>
        <dl className={"syntheticDetails"}>
          <div>
            <dt>Name</dt>
            <dd>Mara Vale</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>mara.vale@example.invalid</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>Not collected</dd>
          </div>
        </dl>
        <p className={"panelExplanation"}>
          This fixed profile demonstrates hierarchy without asking the visitor
          to identify themselves. There are no editable fields.
        </p>
      </section>
    );
  }

  if (stage === "delivery") {
    return (
      <section className={"syntheticPanel"} aria-labelledby="delivery-data">
        <div className={"panelTopline"}>
          <p id="delivery-data">PREVIEW DESTINATION</p>
          <span>PREDEFINED / FICTIONAL</span>
        </div>
        <address className={"previewAddress"}>
          VANTA Preview Studio
          <br />
          101 Signal Way
          <br />
          Portland, OR 97205
          <br />
          United States
        </address>
        <dl className={"deliveryService"}>
          <div>
            <dt>Service</dt>
            <dd>Studio courier</dd>
          </div>
          <div>
            <dt>Window</dt>
            <dd>3–5 preview days</dd>
          </div>
          <div>
            <dt>Cost</dt>
            <dd>$0.00 preview</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className={"syntheticPanel"} aria-labelledby="review-data">
      <div className={"panelTopline"}>
        <p id="review-data">PREVIEW REVIEW</p>
        <span>NO TRANSACTION</span>
      </div>
      <ul className={"reviewChecks"}>
        <li>
          <span aria-hidden="true">✓</span>
          One MONOLITH at the canonical $2,499 USD price
        </li>
        <li>
          <span aria-hidden="true">✓</span>
          Predefined recipient and delivery information only
        </li>
        <li>
          <span aria-hidden="true">—</span>
          No payment, discount, gift card, tax quote, or buyer input
        </li>
        <li>
          <span aria-hidden="true">—</span>
          No Shopify checkout, order, fulfillment, or notification
        </li>
      </ul>
      <p className={"panelExplanation"}>
        Continue to finish the product demonstration. The next screen is an
        explicit unavailable state—not a payment step.
      </p>
    </section>
  );
}

function PreviewProgress({
  step,
  onStep,
}: {
  step: PreviewStep;
  onStep: (step: PreviewStage) => void;
}) {
  const currentIndex = stageOrder.indexOf(step);

  return (
    <ol className={"progress"} aria-label="Checkout Preview progress">
      {previewStages.map((stage) => {
        const stageIndex = stageOrder.indexOf(stage.key);
        const isCurrent = stage.key === step;
        const isAvailable = stageIndex <= currentIndex;
        return (
          <li key={stage.key}>
            <button
              aria-current={isCurrent ? "step" : undefined}
              disabled={!isAvailable}
              onClick={() => onStep(stage.key)}
              type="button"
            >
              <span>{stage.index}</span>
              <strong>{stage.label}</strong>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepActions({
  stage,
  onBack,
  onContinue,
}: {
  stage: PreviewStage;
  onBack: () => void;
  onContinue: () => void;
}) {
  const continueLabel =
    stage === "review"
      ? "Complete preview"
      : stage === "contact"
        ? "Continue to delivery"
        : "Continue to review";

  return (
    <div className={"stepActions"}>
      <button className={"secondaryAction"} onClick={onBack} type="button">
        <span aria-hidden="true">←</span> Back
      </button>
      <button className={"primaryAction"} onClick={onContinue} type="button">
        {continueLabel} <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function SignalLedger({
  stage,
  onBack,
  onContinue,
  onStep,
}: {
  stage: PreviewStage;
  onBack: () => void;
  onContinue: () => void;
  onStep: (step: PreviewStage) => void;
}) {
  const stageMeta = previewStages.find((item) => item.key === stage)!;
  return (
    <div className={"ledgerLayout"}>
      <section className={"ledgerStage"}>
        <PreviewProgress step={stage} onStep={onStep} />
        <div className={"stepHeading"}>
          <p className={"eyebrow"}>
            {stageMeta.index} / CHECKOUT PREVIEW
          </p>
          <h1>{stageMeta.label}</h1>
          <p>{stageMeta.description}</p>
        </div>
        <SyntheticPanel stage={stage} />
        <StepActions
          onBack={onBack}
          onContinue={onContinue}
          stage={stage}
        />
      </section>
      <OrderLedger />
    </div>
  );
}

function OpenManifest({
  stage,
  onContinue,
  onStep,
}: {
  stage: PreviewStage;
  onContinue: () => void;
  onStep: (step: PreviewStage) => void;
}) {
  const currentIndex = previewStages.findIndex((item) => item.key === stage);
  return (
    <div className={"manifestLayout"}>
      <header className={"manifestIntro"}>
        <p className={"eyebrow"}>CHECKOUT PREVIEW / OPEN MANIFEST</p>
        <h1>Everything visible. Nothing collected.</h1>
        <p>
          Read the complete fictional checkout brief as one document. The
          active section supplies the only forward action.
        </p>
      </header>
      <div className={"manifestBody"}>
        <div className={"manifestSections"}>
          {previewStages.map((item, index) => {
            const available = index <= currentIndex;
            return (
              <section
                className={item.key === stage ? "manifestActive" : undefined}
                key={item.key}
              >
                <button
                  aria-expanded={item.key === stage}
                  disabled={!available}
                  onClick={() => onStep(item.key)}
                  type="button"
                >
                  <span>{item.index}</span>
                  <strong>{item.label}</strong>
                  <small>
                    {item.key === stage
                      ? "ACTIVE"
                      : available
                        ? "COMPLETE"
                        : "UP NEXT"}
                  </small>
                </button>
                <div
                  aria-hidden={item.key !== stage}
                  className={"manifestPanel"}
                  hidden={item.key !== stage}
                >
                  <SyntheticPanel stage={item.key} />
                </div>
              </section>
            );
          })}
        </div>
        <OrderLedger compact />
      </div>
      <div className={"manifestContinue"}>
        <p>{previewStages[currentIndex].description}</p>
        <button className={"primaryAction"} onClick={onContinue} type="button">
          {stage === "review" ? "Complete preview" : "Continue"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

function DispatchConsole({
  stage,
  onBack,
  onContinue,
  onStep,
}: {
  stage: PreviewStage;
  onBack: () => void;
  onContinue: () => void;
  onStep: (step: PreviewStage) => void;
}) {
  const meta = previewStages.find((item) => item.key === stage)!;
  const stageIndex = previewStages.findIndex((item) => item.key === stage);
  return (
    <div className={"consoleLayout"}>
      <aside className={"consoleRail"}>
        <p>PREVIEW SEQUENCE</p>
        <ol>
          {previewStages.map((item, index) => (
            <li key={item.key}>
              <button
                aria-current={item.key === stage ? "step" : undefined}
                disabled={index > stageIndex}
                onClick={() => onStep(item.key)}
                type="button"
              >
                <span>{item.index}</span>
                <strong>{item.label}</strong>
                <i aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </aside>
      <section className={"consoleStage"}>
        <div className={"consoleHeading"}>
          <span>{meta.index}</span>
          <div>
            <p className={"eyebrow"}>ACTIVE MILESTONE</p>
            <h1>{meta.label}</h1>
          </div>
        </div>
        <SyntheticPanel stage={stage} />
        <StepActions
          onBack={onBack}
          onContinue={onContinue}
          stage={stage}
        />
      </section>
      <OrderLedger compact />
    </div>
  );
}

function TerminalState({
  onAgain,
  onReturn,
}: {
  onAgain: () => void;
  onReturn: () => void;
}) {
  return (
    <main className={"terminal"} id="prototype-main">
      <div className={"terminalSignal"} aria-hidden="true">
        <span />
      </div>
      <section>
        <p className={"eyebrow"}>CHECKOUT PREVIEW / COMPLETE</p>
        <h1>Ordering offline</h1>
        <p className={"terminalStatement"}>
          Checkout Preview complete. No order was placed and no payment
          information was collected.
        </p>
        <dl className={"terminalFacts"}>
          <div>
            <dt>Payment</dt>
            <dd>Not requested</dd>
          </div>
          <div>
            <dt>Order</dt>
            <dd>Not created</dd>
          </div>
          <div>
            <dt>Visitor data</dt>
            <dd>Not collected</dd>
          </div>
          <div>
            <dt>Bag</dt>
            <dd>MONOLITH retained</dd>
          </div>
        </dl>
        <div className={"terminalActions"}>
          <button className={"primaryAction"} onClick={onReturn} type="button">
            Return to MONOLITH <span aria-hidden="true">→</span>
          </button>
          <button className={"secondaryAction"} onClick={onAgain} type="button">
            Preview again
          </button>
        </div>
      </section>
      <OrderLedger compact />
    </main>
  );
}

function BagDialog({
  onClose,
  onPreview,
  removed,
  onRemovedChange,
}: {
  onClose: () => void;
  onPreview: () => void;
  removed: boolean;
  onRemovedChange: (removed: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleRef.current?.focus();
    const dialog = dialogRef.current;
    if (!dialog) {
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className={"bagBackdrop"}>
      <button
        aria-label="Close Bag"
        className={"backdropDismiss"}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-labelledby="bag-title"
        aria-modal="true"
        className={"bagDialog"}
        ref={dialogRef}
        role="dialog"
      >
        <header>
          <div>
            <p className={"eyebrow"}>SAME-BROWSER BAG / 30 DAYS</p>
            <h1 id="bag-title" ref={titleRef} tabIndex={-1}>
              Bag
            </h1>
          </div>
          <button aria-label="Close Bag" onClick={onClose} type="button">
            Close <span aria-hidden="true">×</span>
          </button>
        </header>

        {removed ? (
          <section className={"emptyBag"}>
            <p>MONOLITH was removed.</p>
            <span>The Bag now contains no items.</span>
            <button onClick={() => onRemovedChange(false)} type="button">
              Restore prototype item
            </button>
          </section>
        ) : (
          <>
            <ProductMiniature />
            <button
              className={"removeAction"}
              onClick={() => onRemovedChange(true)}
              type="button"
            >
              Remove MONOLITH
            </button>
            <dl className={"bagTotals"}>
              <div>
                <dt>Subtotal</dt>
                <dd>$2,499 USD</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>1 / fixed</dd>
              </div>
            </dl>
            <div className={"bagDisclosure"}>
              <strong>This is a concept experience.</strong>
              <p>
                Checkout Preview uses fictional details and cannot place an
                order or collect payment.
              </p>
            </div>
            <button
              className={"checkoutAction"}
              onClick={onPreview}
              type="button"
            >
              Enter Checkout Preview <span aria-hidden="true">→</span>
            </button>
            <div className={"bagLinks"}>
              <button onClick={onClose} type="button">
                Return to Product
              </button>
              <a href="#bag-title">Open MORPH Lab</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RecoveryDialog({
  stage,
  onRestart,
  onResume,
}: {
  stage: PreviewStage;
  onRestart: () => void;
  onResume: () => void;
}) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  const label = previewStages.find((item) => item.key === stage)!.label;

  useEffect(() => {
    resumeRef.current?.focus();
  }, []);

  return (
    <div className={"recoveryBackdrop"}>
      <section
        aria-labelledby="recovery-title"
        aria-modal="true"
        className={"recoveryDialog"}
        role="alertdialog"
      >
        <p className={"eyebrow"}>PREVIEW INTERRUPTED</p>
        <h2 id="recovery-title">Continue from {label}?</h2>
        <p>
          Only this ephemeral preview position is available. No visitor data was
          saved because none was requested. MONOLITH remains in the Bag.
        </p>
        <div>
          <button
            className={"primaryAction"}
            onClick={onResume}
            ref={resumeRef}
            type="button"
          >
            Resume {label}
          </button>
          <button
            className={"secondaryAction"}
            onClick={onRestart}
            type="button"
          >
            Start preview again
          </button>
        </div>
      </section>
    </div>
  );
}

function PrototypeSwitcher({
  onChange,
  variant,
}: {
  onChange: (variant: VariantKey) => void;
  variant: VariantKey;
}) {
  const index = variants.findIndex((item) => item.key === variant);
  const current = variants[index];
  const cycle = (offset: number) => {
    const nextIndex = (index + offset + variants.length) % variants.length;
    onChange(variants[nextIndex].key);
  };

  return (
    <aside
      aria-label="Checkout Preview prototype variants"
      className={"prototypeSwitcher"}
    >
      <span className={"prototypeFlag"}>THROWAWAY PROTOTYPE</span>
      <button
        aria-label="Previous variant"
        onClick={() => cycle(-1)}
        type="button"
      >
        ←
      </button>
      <div>
        <strong>
          {current.key} / {current.name}
        </strong>
        <span>{current.thesis}</span>
      </div>
      <button
        aria-label="Next variant"
        onClick={() => cycle(1)}
        type="button"
      >
        →
      </button>
    </aside>
  );
}

function StateReadout({
  interrupted,
  removed,
  step,
}: {
  interrupted: boolean;
  removed: boolean;
  step: PreviewStep;
}) {
  return (
    <aside className={"stateReadout"} aria-label="Prototype state">
      <span>STATE / {step.toUpperCase()}</span>
      <span>BAG / {removed ? "EMPTY" : "MONOLITH × 1"}</span>
      <span>VISITOR FIELDS / 0</span>
      <span>NETWORK CALLS / 0</span>
      {interrupted && <span>RECOVERY / OFFERED</span>}
    </aside>
  );
}

export function CheckoutPreviewPrototype({
  initialStep,
  initialVariant,
}: CheckoutPreviewPrototypeProps) {
  const [variant, setVariant] = useState(initialVariant);
  const [step, setStep] = useState(initialStep);
  const [removed, setRemoved] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const activePreviewStage = useMemo<PreviewStage>(() => {
    if (step === "delivery" || step === "review") return step;
    return "contact";
  }, [step]);

  const moveTo = useCallback(
    (nextStep: PreviewStep) => {
      setStep(nextStep);
      setInterrupted(false);
      updatePrototypeUrl(variant, nextStep);
    },
    [variant],
  );

  const selectVariant = useCallback(
    (nextVariant: VariantKey) => {
      setVariant(nextVariant);
      updatePrototypeUrl(nextVariant, step);
    },
    [step],
  );

  useEffect(() => {
    if (step === "contact" || step === "delivery" || step === "review") {
      headingRef.current?.focus();
    }
  }, [step, variant]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches(
          "input, textarea, select, button, a, [contenteditable='true']",
        )
      ) {
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const index = variants.findIndex((item) => item.key === variant);
      const offset = event.key === "ArrowRight" ? 1 : -1;
      selectVariant(
        variants[(index + offset + variants.length) % variants.length].key,
      );
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectVariant, variant]);

  const back = () => {
    if (step === "contact") moveTo("bag");
    else if (step === "delivery") moveTo("contact");
    else moveTo("delivery");
  };

  const continueForward = () => {
    if (step === "contact") moveTo("delivery");
    else if (step === "delivery") moveTo("review");
    else moveTo("terminal");
  };

  const inPreview =
    step === "contact" || step === "delivery" || step === "review";

  return (
    <div
      className={`${"prototypeShell"} ${variantClasses[variant]}`}
      data-variant={variant}
    >
      <a className={"skipLink"} href="#prototype-main">
        Skip to main content
      </a>
      <VantaHeader bagOpen={step === "bag"} onBag={() => moveTo("bag")} />

      {step === "product" && <ProductContext onBag={() => moveTo("bag")} />}

      {step === "bag" && (
        <>
          <div inert>
            <ProductContext onBag={() => moveTo("bag")} />
          </div>
          <BagDialog
            onClose={() => moveTo("product")}
            onPreview={() => moveTo("contact")}
            onRemovedChange={setRemoved}
            removed={removed}
          />
        </>
      )}

      {inPreview && (
        <main className={"previewMain"} id="prototype-main">
          <header className={"previewHeader"}>
            <div>
              <span>VANTA / PUBLIC EXPERIENCE</span>
              <strong>Checkout Preview</strong>
            </div>
            <button onClick={() => moveTo("product")} type="button">
              Exit preview
            </button>
          </header>
          <PreviewBoundary />
          <h1 className={"srOnly"} ref={headingRef} tabIndex={-1}>
            Checkout Preview: {activePreviewStage}
          </h1>
          {variant === "A" && (
            <SignalLedger
              onBack={back}
              onContinue={continueForward}
              onStep={moveTo}
              stage={activePreviewStage}
            />
          )}
          {variant === "B" && (
            <OpenManifest
              onContinue={continueForward}
              onStep={moveTo}
              stage={activePreviewStage}
            />
          )}
          {variant === "C" && (
            <DispatchConsole
              onBack={back}
              onContinue={continueForward}
              onStep={moveTo}
              stage={activePreviewStage}
            />
          )}
          <button
            className={"interruptAction"}
            onClick={() => setInterrupted(true)}
            type="button"
          >
            Simulate interruption
          </button>
        </main>
      )}

      {step === "terminal" && (
        <TerminalState
          onAgain={() => moveTo("contact")}
          onReturn={() => moveTo("product")}
        />
      )}

      {interrupted && (
        <RecoveryDialog
          onRestart={() => moveTo("contact")}
          onResume={() => setInterrupted(false)}
          stage={activePreviewStage}
        />
      )}

      <StateReadout
        interrupted={interrupted}
        removed={removed}
        step={step}
      />
      {process.env.NODE_ENV !== "production" && (
        <PrototypeSwitcher onChange={selectVariant} variant={variant} />
      )}
    </div>
  );
}
