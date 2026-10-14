"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import "./prototype.css";

const Viewer = dynamic(() => import("./viewer").then((module) => module.Viewer), {
  ssr: false,
  loading: () => <div className={"loading"}>Loading 3D runtime…</div>,
});

type Route = "home" | "product" | "synth";
type CandidateId = "A" | "B" | "C";
type MediaMode = "realtime" | "still" | "video" | "deferred";

type Candidate = {
  id: CandidateId;
  name: string;
  thesis: string;
  asset: "source" | "runtime";
  routeModes: Record<Route, MediaMode>;
  transfer: Record<Route, string>;
  pipeline: string[];
  strengths: string[];
  costs: string[];
  scores: { quality: number; startup: number; resilience: number; simplicity: number };
};

const ROUTES: { id: Route; label: string; role: string }[] = [
  { id: "home", label: "Home", role: "cinematic reveal" },
  { id: "product", label: "Product", role: "evaluation media" },
  { id: "synth", label: "Synth", role: "instrument interaction" },
];

const CANDIDATES: Candidate[] = [
  {
    id: "A",
    name: "Realtime everywhere",
    thesis: "One untouched GLB and one WebGL treatment across every route.",
    asset: "source",
    routeModes: { home: "realtime", product: "realtime", synth: "realtime" },
    transfer: { home: "3.78 MB GLB", product: "3.78 MB GLB", synth: "3.78 MB GLB" },
    pipeline: [
      "Approved GLB",
      "Checksum + hierarchy validation",
      "Copy without derivation",
      "Three.js on Home, Product, Synth",
    ],
    strengths: ["Maximum camera freedom", "Single visual implementation", "No offline render drift"],
    costs: ["WebGL and 3D JavaScript on every direct entry", "131 model draw calls everywhere", "Product gains cost without useful interaction"],
    scores: { quality: 5, startup: 2, resilience: 2, simplicity: 4 },
  },
  {
    id: "B",
    name: "Route-fit hybrid",
    thesis: "Realtime only where motion or direct control earns it; authored media everywhere else.",
    asset: "runtime",
    routeModes: { home: "realtime", product: "still", synth: "deferred" },
    transfer: { home: "2.57 MB GLB", product: "12–23 KB AVIF", synth: "2.57 MB GLB after intent" },
    pipeline: [
      "Immutable approved GLB",
      "Validate names, bounds, materials, control hierarchy",
      "Derive Meshopt runtime GLB (−32% transfer; hierarchy retained)",
      "Render color-managed still masters from the same source",
      "Emit responsive AVIF/WebP + route media manifest",
      "Load WebGL on Home; defer on Synth; omit on Product",
    ],
    strengths: ["Visual fidelity matches each route’s job", "Fast Product direct entry", "Interactive hierarchy survives optimization"],
    costs: ["Lighting/camera manifest must govern two outputs", "Still-render QA joins runtime QA", "Home still needs a capability fallback"],
    scores: { quality: 5, startup: 4, resilience: 4, simplicity: 3 },
  },
  {
    id: "C",
    name: "Media-first",
    thesis: "Pre-render Home and Product; reserve realtime rendering for MORPH Lab.",
    asset: "runtime",
    routeModes: { home: "video", product: "still", synth: "deferred" },
    transfer: { home: "5.0 MB donor WebM", product: "12–23 KB AVIF", synth: "2.57 MB GLB after intent" },
    pipeline: [
      "Immutable approved GLB",
      "Offline camera + lighting render",
      "Encode poster and motion bitrate ladder",
      "Emit responsive stills",
      "Derive runtime GLB only for Synth",
    ],
    strengths: ["No WebGL dependency on Home or Product", "Predictable authored frames", "Strongest rendering compatibility"],
    costs: ["Current motion sample outweighs the optimized GLB", "Scroll reversal becomes media seeking", "Separate media and runtime choreography can drift"],
    scores: { quality: 4, startup: 3, resilience: 5, simplicity: 2 },
  },
];

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className={"score"}>
      <span>{label}</span>
      <span className={"scoreTicks"} aria-label={`${value} out of 5`}>
        {Array.from({ length: 5 }, (_, index) => (
          <i key={index} data-on={index < value} />
        ))}
      </span>
    </div>
  );
}

function StaticMedia({ route }: { route: Route }) {
  const image = route === "product" ? "reveal" : "morph";
  return (
    <picture className={"picture"}>
      <source
        type="image/avif"
        srcSet={`/prototype/asset-pipeline/media/${image}-720.avif 720w, /prototype/asset-pipeline/media/${image}-1440.avif 1440w`}
        sizes="(max-width: 760px) 100vw, 70vw"
      />
      <source
        type="image/webp"
        srcSet={`/prototype/asset-pipeline/media/${image}-720.webp 720w, /prototype/asset-pipeline/media/${image}-1440.webp 1440w`}
        sizes="(max-width: 760px) 100vw, 70vw"
      />
      <img
        src={`/prototype/asset-pipeline/media/${image}-1440.webp`}
        alt={`MONOLITH ${route} render prototype`}
      />
    </picture>
  );
}

export function AssetPipelinePrototype({
  initialCandidate,
  initialRoute,
}: {
  initialCandidate: CandidateId;
  initialRoute: Route;
}) {
  const [candidateId, setCandidateId] = useState<CandidateId>(initialCandidate);
  const [route, setRoute] = useState<Route>(initialRoute);
  const [morph, setMorph] = useState(0.42);
  const [rotation, setRotation] = useState(0);
  const [activated, setActivated] = useState(false);
  const [modelStats, setModelStats] = useState({ drawCalls: 0, triangles: 0 });

  const candidate = CANDIDATES.find((item) => item.id === candidateId) ?? CANDIDATES[1];
  const mode = candidate.routeModes[route];
  const live = mode === "realtime" || (mode === "deferred" && activated);

  const changeView = useCallback((nextCandidate: CandidateId, nextRoute: Route) => {
    setCandidateId(nextCandidate);
    setRoute(nextRoute);
    setActivated(false);
    const url = new URL(window.location.href);
    url.searchParams.set("candidate", nextCandidate);
    url.searchParams.set("route", nextRoute);
    window.history.replaceState(null, "", url);
  }, []);

  const state = useMemo(
    () => ({
      candidate: `${candidate.id} / ${candidate.name}`,
      route,
      mode: live && mode === "deferred" ? "realtime (activated)" : mode,
      model: live ? candidate.asset : "not requested",
      transfer: candidate.transfer[route],
      sourceBytes: 3_778_588,
      runtimeBytes: 2_568_220,
      hierarchyPreserved: true,
      namedControl: "MORPH_ROTATING_ENCODER",
      measuredDrawCalls: modelStats.drawCalls || "awaiting runtime",
      measuredTriangles: modelStats.triangles || "awaiting runtime",
      renderLoop: live ? "demand" : "none",
      morph: Number(morph.toFixed(2)),
    }),
    [candidate, live, mode, modelStats, morph, route],
  );

  return (
    <main className={"shell"}>
      <header className={"header"}>
        <a className={"brand"} href="#top" aria-label="VANTA asset pipeline prototype">
          VANTA<span>®</span>
        </a>
        <div className={"prototypeMark"}>Throwaway prototype · pipeline decision</div>
        <nav aria-label="Route specimen">
          {ROUTES.map((item) => (
            <button
              key={item.id}
              type="button"
              data-active={route === item.id}
              onClick={() => changeView(candidateId, item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <section className={"intro"} id="top">
        <div>
          <p className={"eyebrow"}>3D asset + rendering pipeline / decision specimen</p>
          <h1>Where does realtime<br />rendering earn its weight?</h1>
        </div>
        <p className={"lede"}>
          Three source-to-runtime compositions use the approved MONOLITH geometry.
          Switch candidate and route; compare what loads, what stays interactive, and
          what fails cleanly.
        </p>
      </section>

      <section className={"stage"}>
        <div
          className={"media"}
          onPointerMove={(event) => {
            if (!live) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setRotation(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
          }}
          onPointerLeave={() => setRotation(0)}
        >
          <div className={"mediaRail"}>
            <span>{candidate.id}.0{ROUTES.findIndex((item) => item.id === route) + 1}</span>
            <span>{route.toUpperCase()} / {mode.toUpperCase()}</span>
          </div>

          {live && (
            <Viewer
              key={`${candidate.asset}-${route}`}
              asset={candidate.asset}
              route={route}
              morph={morph}
              rotation={rotation}
              onLoaded={setModelStats}
            />
          )}
          {mode === "still" && <StaticMedia route={route} />}
          {mode === "video" && (
            <video
              className={"video"}
              src="/prototype/asset-pipeline/media/home-sequence.webm"
              autoPlay
              muted
              loop
              playsInline
              controls
            />
          )}
          {mode === "deferred" && !activated && (
            <div className={"deferred"}>
              <StaticMedia route="synth" />
              <div className={"deferredScrim"}>
                <p>Runtime withheld</p>
                <h2>MONOLITH is visible.<br />WebGL waits for intent.</h2>
                <button type="button" onClick={() => setActivated(true)}>
                  Activate 3D <span>2.57 MB</span>
                </button>
              </div>
            </div>
          )}

          {live && (
            <label className={"morphControl"}>
              <span>MORPH</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={morph}
                onChange={(event) => setMorph(Number(event.target.value))}
              />
              <output>{Math.round(morph * 100)}</output>
            </label>
          )}
        </div>

        <aside className={"specification"}>
          <div className={"candidateTitle"}>
            <span>{candidate.id}</span>
            <div>
              <p>Candidate</p>
              <h2>{candidate.name}</h2>
            </div>
          </div>
          <p className={"thesis"}>{candidate.thesis}</p>

          <div className={"scores"}>
            <Score label="Visual control" value={candidate.scores.quality} />
            <Score label="Direct-entry speed" value={candidate.scores.startup} />
            <Score label="Fallback resilience" value={candidate.scores.resilience} />
            <Score label="Operational simplicity" value={candidate.scores.simplicity} />
          </div>

          <div className={"lists"}>
            <div>
              <h3>Preserves</h3>
              <ul>{candidate.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h3>Costs</h3>
              <ul>{candidate.costs.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </aside>
      </section>

      <section className={"pipelineSection"}>
        <div className={"pipelineHeading"}>
          <p className={"eyebrow"}>Source → delivery</p>
          <h2>{candidate.name}</h2>
        </div>
        <ol className={"pipeline"}>
          {candidate.pipeline.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={"diagnostics"}>
        <div>
          <p className={"eyebrow"}>Observable state</p>
          <h2>No hidden load.</h2>
          <p>The specimen exposes the selected route’s delivery contract. Values are from the approved GLB and the conservative Meshopt derivation used here.</p>
        </div>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </section>

      <section className={"recommendation"}>
        <p>Working recommendation</p>
        <h2>B / Route-fit hybrid</h2>
        <p>
          Keep one immutable geometry source and multiple governed outputs. Home earns
          a capable-tier realtime sequence. Product should use responsive authored
          media. Synth earns a deferred runtime because controls must move the hardware.
          Candidate C remains the fallback shape, not the default composition.
        </p>
      </section>

      <div className={"switcher"} aria-label="Pipeline candidates">
        <span>Compare</span>
        {CANDIDATES.map((item) => (
          <button
            key={item.id}
            type="button"
            data-active={candidateId === item.id}
            onClick={() => changeView(item.id, route)}
            aria-label={`Candidate ${item.id}: ${item.name}`}
          >
            <b>{item.id}</b>
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
