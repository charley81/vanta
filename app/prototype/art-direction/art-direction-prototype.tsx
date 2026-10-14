"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import styles from "./art-direction.module.css";

type VariantKey = "A" | "B" | "C";
type RouteKey = "home" | "product" | "synth";

type ArtDirectionPrototypeProps = {
  initialVariant: VariantKey;
  initialRoute: RouteKey;
};

const variants: Array<{ key: VariantKey; name: string; thesis: string }> = [
  {
    key: "A",
    name: "Signal Black",
    thesis: "The instrument as precision signal equipment",
  },
  {
    key: "B",
    name: "Warm Field",
    thesis: "The instrument as a tactile editorial object",
  },
  {
    key: "C",
    name: "Cut Plane",
    thesis: "The instrument as a force that reshapes space",
  },
];

const routes: Array<{ key: RouteKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "product", label: "Product" },
  { key: "synth", label: "Synth" },
];

const imageRoot = "/prototype/vanta-art-direction";

function updatePrototypeUrl(variant: VariantKey, route: RouteKey) {
  const params = new URLSearchParams(window.location.search);
  params.set("variant", variant);
  params.set("route", route);
  window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
}

function PrototypeRouteNav({
  activeRoute,
  onChange,
  tone = "dark",
}: {
  activeRoute: RouteKey;
  onChange: (route: RouteKey) => void;
  tone?: "dark" | "light";
}) {
  return (
    <nav
      className={`${styles.routeNav} ${tone === "light" ? styles.routeNavLight : ""}`}
      aria-label="VANTA route specimens"
    >
      {routes.map((route) => (
        <button
          className={activeRoute === route.key ? styles.routeActive : undefined}
          key={route.key}
          onClick={() => onChange(route.key)}
          type="button"
        >
          {route.label}
        </button>
      ))}
    </nav>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? styles.brandCompact : styles.brand}>
      VANTA
    </span>
  );
}

function SignalHeader({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <header className={styles.signalHeader}>
      <BrandMark />
      <PrototypeRouteNav activeRoute={route} onChange={onRouteChange} />
      <span className={styles.signalBag}>BAG / 0</span>
    </header>
  );
}

function SignalHome({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <main className={`${styles.screen} ${styles.signal} ${styles.signalHome}`}>
      <SignalHeader route={route} onRouteChange={onRouteChange} />
      <Image
        alt="MONOLITH synthesizer emerging from darkness"
        className={styles.signalHeroImage}
        fill
        priority
        sizes="100vw"
        src={`${imageRoot}/fracture.jpg`}
      />
      <div className={styles.signalGrid} aria-hidden="true" />
      <aside className={styles.signalRail}>
        <span>V / 001</span>
        <span>SCROLL TO TRANSMIT</span>
      </aside>
      <section className={styles.signalHomeCopy}>
        <p className={styles.signalKicker}>INSTRUMENT 001 / EIGHT VOICES</p>
        <h1>
          Sound,
          <br />
          given <em>mass.</em>
        </h1>
        <div className={styles.signalHomeFooter}>
          <p>
            A graphite desktop synthesizer built around one continuous gesture.
          </p>
          <button type="button" onClick={() => onRouteChange("product")}>
            Explore MONOLITH <span>↗</span>
          </button>
        </div>
      </section>
      <div className={styles.signalMeter} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}

function SignalProduct({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <main className={`${styles.screen} ${styles.signal} ${styles.signalProduct}`}>
      <SignalHeader route={route} onRouteChange={onRouteChange} />
      <section className={styles.signalProductVisual}>
        <Image
          alt="MONOLITH synthesizer product view"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 60vw"
          src={`${imageRoot}/product-hero.jpg`}
        />
        <p>GRAPHITE / 360 × 210 × 80 MM</p>
      </section>
      <section className={styles.signalProductInfo}>
        <p className={styles.signalKicker}>VANTA / INSTRUMENT 001</p>
        <h1>MONOLITH</h1>
        <p className={styles.signalDek}>Eight voices. One continuum.</p>
        <p className={styles.signalBody}>
          Dual digital oscillators, resonant analog filtering, and one defining
          MORPH control. Move from the weight of SUB to the harmonic edge of
          FRACTURE without leaving the moment.
        </p>
        <dl className={styles.signalSpecs}>
          <div>
            <dt>ENGINE</dt>
            <dd>8-VOICE HYBRID</dd>
          </div>
          <div>
            <dt>CONTROL</dt>
            <dd>CONTINUOUS MORPH</dd>
          </div>
          <div>
            <dt>FINISH</dt>
            <dd>GRAPHITE ALUMINUM</dd>
          </div>
        </dl>
        <div className={styles.signalPurchase}>
          <span>$2,499</span>
          <button type="button">ADD TO BAG</button>
        </div>
      </section>
    </main>
  );
}

function SignalSynth({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  const [morph, setMorph] = useState(50);
  return (
    <main className={`${styles.screen} ${styles.signal} ${styles.signalSynth}`}>
      <SignalHeader route={route} onRouteChange={onRouteChange} />
      <div className={styles.signalSynthImage}>
        <Image
          alt="MONOLITH in interactive MORPH Lab view"
          fill
          priority
          sizes="100vw"
          src={`${imageRoot}/fracture.jpg`}
        />
      </div>
      <section className={styles.signalSynthTitle}>
        <p className={styles.signalKicker}>MORPH LAB / LIVE SIGNAL</p>
        <h1>
          Shape the
          <br />
          continuum.
        </h1>
      </section>
      <section className={styles.signalConsole}>
        <div className={styles.consoleStatus}>
          <span className={styles.statusLight} />
          <div>
            <small>AUDIO ENGINE</small>
            <strong>READY</strong>
          </div>
        </div>
        <div className={styles.signalControl}>
          <label htmlFor="signal-morph">MORPH / {morph.toString().padStart(3, "0")}</label>
          <input
            id="signal-morph"
            max="100"
            min="0"
            onChange={(event) => setMorph(Number(event.target.value))}
            type="range"
            value={morph}
          />
          <div>
            <span>SUB / 000</span>
            <span>FRACTURE / 100</span>
          </div>
        </div>
        <button className={styles.signalPlay} type="button" aria-label="Enable sound">
          ▶
        </button>
      </section>
    </main>
  );
}

function SignalBlack({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  if (route === "product") {
    return <SignalProduct route={route} onRouteChange={onRouteChange} />;
  }
  if (route === "synth") {
    return <SignalSynth route={route} onRouteChange={onRouteChange} />;
  }
  return <SignalHome route={route} onRouteChange={onRouteChange} />;
}

function FieldHeader({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <header className={styles.fieldHeader}>
      <BrandMark compact />
      <PrototypeRouteNav
        activeRoute={route}
        onChange={onRouteChange}
        tone="light"
      />
      <button className={styles.fieldBag} type="button">
        Bag <span>0</span>
      </button>
    </header>
  );
}

function FieldHome({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <main className={`${styles.screen} ${styles.field} ${styles.fieldHome}`}>
      <FieldHeader route={route} onRouteChange={onRouteChange} />
      <div className={styles.fieldEdition}>VANTA / 001</div>
      <section className={styles.fieldHomeCopy}>
        <p>AN INSTRUMENT FOR MOVEMENT</p>
        <h1>
          Sound has
          <br />
          no fixed <i>shape.</i>
        </h1>
        <div className={styles.fieldIntro}>
          <span>01</span>
          <p>
            MONOLITH turns synthesis into a tactile continuum—from deep,
            rounded foundations to fractured harmonic light.
          </p>
        </div>
      </section>
      <figure className={styles.fieldHomeImage}>
        <Image
          alt="MONOLITH synthesizer on a warm editorial field"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 58vw"
          src={`${imageRoot}/product-hero.jpg`}
        />
        <figcaption>
          <span>MONOLITH</span>
          <span>GRAPHITE / EIGHT VOICES</span>
        </figcaption>
      </figure>
      <button
        className={styles.fieldRoundLink}
        onClick={() => onRouteChange("product")}
        type="button"
      >
        Explore
        <br />
        the object
        <span>↗</span>
      </button>
    </main>
  );
}

function FieldProduct({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <main className={`${styles.screen} ${styles.field} ${styles.fieldProduct}`}>
      <FieldHeader route={route} onRouteChange={onRouteChange} />
      <section className={styles.fieldGallery}>
        <div className={styles.fieldMainPhoto}>
          <Image
            alt="MONOLITH graphite synthesizer"
            fill
            priority
            sizes="(max-width: 800px) 100vw, 55vw"
            src={`${imageRoot}/product-hero.jpg`}
          />
        </div>
        <div className={styles.fieldThumbs}>
          <button aria-label="Full instrument view" className={styles.thumbActive} type="button">
            01
          </button>
          <button aria-label="MORPH control detail" type="button">
            02
          </button>
          <button aria-label="Material detail" type="button">
            03
          </button>
        </div>
      </section>
      <section className={styles.fieldProductInfo}>
        <p className={styles.fieldEyebrow}>DESKTOP SYNTHESIZER / GRAPHITE</p>
        <h1>MONOLITH</h1>
        <p className={styles.fieldProductSubhead}>Two states. One continuum.</p>
        <p className={styles.fieldProductBody}>
          Eight-voice hybrid synthesis centered on one expressive gesture. MORPH
          transforms a single sound continuously between SUB and FRACTURE.
        </p>
        <div className={styles.fieldPriceRow}>
          <strong>$2,499</strong>
          <span>USD</span>
        </div>
        <button className={styles.fieldAdd} type="button">
          Add MONOLITH to Bag <span>+</span>
        </button>
        <button
          className={styles.fieldTextLink}
          onClick={() => onRouteChange("synth")}
          type="button"
        >
          Try MORPH Lab ↗
        </button>
      </section>
    </main>
  );
}

function FieldSynth({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  const [morph, setMorph] = useState(36);
  return (
    <main className={`${styles.screen} ${styles.field} ${styles.fieldSynth}`}>
      <FieldHeader route={route} onRouteChange={onRouteChange} />
      <section className={styles.fieldSynthIntro}>
        <p>MORPH LAB</p>
        <h1>Made to be moved.</h1>
        <span>Drag the dial to move through the sound.</span>
      </section>
      <div className={styles.fieldSynthStage}>
        <Image
          alt="Close view of the MONOLITH MORPH control"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 65vw"
          src={`${imageRoot}/morph-detail.jpg`}
        />
        <div className={styles.fieldDial} style={{ "--turn": `${morph * 2.7 - 135}deg` } as React.CSSProperties}>
          <span />
          <strong>{morph}</strong>
        </div>
      </div>
      <section className={styles.fieldSynthControl}>
        <div>
          <span>SUB</span>
          <strong>{morph < 50 ? "DEEP / STABLE" : "TRANSITION"}</strong>
        </div>
        <input
          aria-label="MORPH position"
          max="100"
          min="0"
          onChange={(event) => setMorph(Number(event.target.value))}
          type="range"
          value={morph}
        />
        <div>
          <strong>{morph > 50 ? "TEXTURED / UNSTABLE" : "TRANSITION"}</strong>
          <span>FRACTURE</span>
        </div>
      </section>
      <button className={styles.fieldSound} type="button">
        Enable sound <span>↗</span>
      </button>
    </main>
  );
}

function WarmField({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  if (route === "product") {
    return <FieldProduct route={route} onRouteChange={onRouteChange} />;
  }
  if (route === "synth") {
    return <FieldSynth route={route} onRouteChange={onRouteChange} />;
  }
  return <FieldHome route={route} onRouteChange={onRouteChange} />;
}

function PlaneHeader({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <header className={styles.planeHeader}>
      <BrandMark />
      <PrototypeRouteNav activeRoute={route} onChange={onRouteChange} />
      <span className={styles.planeIndex}>001 — 2026</span>
      <button type="button">BAG [0]</button>
    </header>
  );
}

function PlaneHome({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <main className={`${styles.screen} ${styles.plane} ${styles.planeHome}`}>
      <PlaneHeader route={route} onRouteChange={onRouteChange} />
      <div className={styles.planeBand} aria-hidden="true">
        <span>SUB</span>
        <span>MORPH</span>
        <span>FRACTURE</span>
      </div>
      <div className={styles.planeHeroImage}>
        <Image
          alt="MONOLITH sliced by an expressive graphic plane"
          fill
          priority
          sizes="100vw"
          src={`${imageRoot}/sub.jpg`}
        />
      </div>
      <section className={styles.planeHeroCopy}>
        <p>THE SHAPE OF SOUND / 001</p>
        <h1>
          <span>SOUND</span>
          <span>GIVEN</span>
          <span>MASS</span>
        </h1>
        <button onClick={() => onRouteChange("product")} type="button">
          ENTER MONOLITH <span>→</span>
        </button>
      </section>
      <div className={styles.planeSideword} aria-hidden="true">
        CONTINUUM
      </div>
    </main>
  );
}

function PlaneProduct({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  return (
    <main className={`${styles.screen} ${styles.plane} ${styles.planeProduct}`}>
      <PlaneHeader route={route} onRouteChange={onRouteChange} />
      <section className={styles.planeProductTitle}>
        <p>VANTA / DESKTOP SYNTHESIZER</p>
        <h1>MONO—LITH</h1>
      </section>
      <div className={styles.planeProductImage}>
        <Image
          alt="MONOLITH product profile"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 62vw"
          src={`${imageRoot}/product-detail.jpg`}
        />
      </div>
      <section className={styles.planeProductCard}>
        <p>ONE OBJECT / TWO SONIC STATES</p>
        <h2>Eight voices shaped by one continuous move.</h2>
        <dl>
          <div>
            <dt>BODY</dt>
            <dd>GRAPHITE ALUMINUM</dd>
          </div>
          <div>
            <dt>VOICE</dt>
            <dd>HYBRID / × 8</dd>
          </div>
          <div>
            <dt>GESTURE</dt>
            <dd>SUB ↔ FRACTURE</dd>
          </div>
        </dl>
        <div className={styles.planeBuy}>
          <strong>$2,499</strong>
          <button type="button">ADD TO BAG +</button>
        </div>
      </section>
      <button
        className={styles.planeMorphLink}
        onClick={() => onRouteChange("synth")}
        type="button"
      >
        TRY THE CONTINUUM ↗
      </button>
    </main>
  );
}

function PlaneSynth({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  const [morph, setMorph] = useState(62);
  return (
    <main className={`${styles.screen} ${styles.plane} ${styles.planeSynth}`}>
      <PlaneHeader route={route} onRouteChange={onRouteChange} />
      <p className={styles.planeSynthKicker}>MORPH LAB / DIRECT SIGNAL</p>
      <div className={styles.planeSynthWords} aria-hidden="true">
        <span className={morph < 50 ? styles.wordActive : undefined}>SUB</span>
        <span className={morph >= 50 ? styles.wordActive : undefined}>FRACTURE</span>
      </div>
      <div className={styles.planeSynthImage} style={{ "--morph": `${morph}%` } as React.CSSProperties}>
        <Image
          alt="MONOLITH ready for direct interaction"
          fill
          priority
          sizes="100vw"
          src={`${imageRoot}/fracture.jpg`}
        />
      </div>
      <section className={styles.planeSynthPanel}>
        <div className={styles.planeReadout}>
          <small>MORPH POSITION</small>
          <strong>{morph.toString().padStart(2, "0")}</strong>
          <span>%</span>
        </div>
        <input
          aria-label="MORPH position"
          max="100"
          min="0"
          onChange={(event) => setMorph(Number(event.target.value))}
          type="range"
          value={morph}
        />
        <div className={styles.planeScale}>
          <span>00 / SUB</span>
          <span>ONE SOUND / CONTINUOUS CHANGE</span>
          <span>FRACTURE / 100</span>
        </div>
      </section>
      <button className={styles.planePlay} type="button">
        <span>▶</span> START SOUND
      </button>
    </main>
  );
}

function CutPlane({
  route,
  onRouteChange,
}: {
  route: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}) {
  if (route === "product") {
    return <PlaneProduct route={route} onRouteChange={onRouteChange} />;
  }
  if (route === "synth") {
    return <PlaneSynth route={route} onRouteChange={onRouteChange} />;
  }
  return <PlaneHome route={route} onRouteChange={onRouteChange} />;
}

function PrototypeSwitcher({
  variant,
  onChange,
}: {
  variant: VariantKey;
  onChange: (variant: VariantKey) => void;
}) {
  const index = variants.findIndex((item) => item.key === variant);
  const current = variants[index];
  const cycle = (offset: number) => {
    const nextIndex = (index + offset + variants.length) % variants.length;
    onChange(variants[nextIndex].key);
  };

  return (
    <aside className={styles.prototypeSwitcher} aria-label="Art direction variants">
      <span className={styles.prototypeLabel}>THROWAWAY PROTOTYPE</span>
      <button onClick={() => cycle(-1)} type="button" aria-label="Previous variant">
        ←
      </button>
      <div>
        <strong>
          {current.key} / {current.name}
        </strong>
        <span>{current.thesis}</span>
      </div>
      <button onClick={() => cycle(1)} type="button" aria-label="Next variant">
        →
      </button>
    </aside>
  );
}

export function ArtDirectionPrototype({
  initialVariant,
  initialRoute,
}: ArtDirectionPrototypeProps) {
  const [variant, setVariant] = useState(initialVariant);
  const [route, setRoute] = useState(initialRoute);

  const selectVariant = useCallback(
    (nextVariant: VariantKey) => {
      setVariant(nextVariant);
      updatePrototypeUrl(nextVariant, route);
    },
    [route],
  );

  const selectRoute = useCallback(
    (nextRoute: RouteKey) => {
      setRoute(nextRoute);
      updatePrototypeUrl(variant, nextRoute);
    },
    [variant],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      const index = variants.findIndex((item) => item.key === variant);
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + offset + variants.length) % variants.length;
      selectVariant(variants[nextIndex].key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectVariant, variant]);

  return (
    <div className={styles.prototypeShell}>
      {variant === "A" && (
        <SignalBlack route={route} onRouteChange={selectRoute} />
      )}
      {variant === "B" && (
        <WarmField route={route} onRouteChange={selectRoute} />
      )}
      {variant === "C" && (
        <CutPlane route={route} onRouteChange={selectRoute} />
      )}
      {process.env.NODE_ENV !== "production" && (
        <PrototypeSwitcher variant={variant} onChange={selectVariant} />
      )}
    </div>
  );
}
