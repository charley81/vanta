"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import "./prototype.css";

const Viewer = dynamic(() => import("./viewer").then((module) => module.Viewer), {
  ssr: false,
  loading: () => <div className="pipelineLabLoading">Loading 3D runtime…</div>,
});

type Route = "home" | "product" | "synth";
type CandidateId = "A" | "B" | "C";
type MediaMode = "realtime" | "still" | "video" | "deferred";

type Candidate = {
  id: CandidateId;
  name: string;
  summary: string;
  asset: "source" | "runtime";
  routeModes: Record<Route, MediaMode>;
  transfer: Record<Route, string>;
  pipeline: string[];
  tradeoffs: string[];
};

const ROUTES: { id: Route; label: string; figmaRole: string }[] = [
  { id: "home", label: "Home", figmaRole: "Opening cinematic media region" },
  { id: "product", label: "Product", figmaRole: "Product hero and editorial media regions" },
  { id: "synth", label: "Synth", figmaRole: "MORPH Lab instrument region" },
];

const CANDIDATES: Candidate[] = [
  {
    id: "A",
    name: "Realtime everywhere",
    summary: "Mount the untouched source GLB anywhere the Figma design calls for product media.",
    asset: "source",
    routeModes: { home: "realtime", product: "realtime", synth: "realtime" },
    transfer: { home: "3.78 MB GLB", product: "3.78 MB GLB", synth: "3.78 MB GLB" },
    pipeline: ["Approved GLB", "Hierarchy validation", "Untouched browser asset", "WebGL on all routes"],
    tradeoffs: ["Maximum camera freedom", "3D JavaScript and 131 draw calls on every direct entry", "Product pays for interaction it does not use"],
  },
  {
    id: "B",
    name: "Route-fit hybrid",
    summary: "Keep the Figma composition; choose the lightest media implementation that preserves each route’s intended behavior.",
    asset: "runtime",
    routeModes: { home: "realtime", product: "still", synth: "deferred" },
    transfer: { home: "2.57 MB GLB", product: "12–24 KB prototype AVIF", synth: "2.57 MB GLB after intent" },
    pipeline: ["Immutable approved GLB", "Validate materials and named controls", "Derive hierarchy-safe runtime GLB", "Render still masters to Figma crops", "Encode responsive AVIF/WebP", "Load runtime only on Home and Synth"],
    tradeoffs: ["Fast Product direct entry", "Home preserves camera choreography", "Synth preserves direct hardware control", "Runtime and offline outputs need shared camera/light specifications"],
  },
  {
    id: "C",
    name: "Media-first",
    summary: "Fill Home and Product media regions with offline outputs; reserve browser 3D for MORPH Lab.",
    asset: "runtime",
    routeModes: { home: "video", product: "still", synth: "deferred" },
    transfer: { home: "5.0 MB donor WebM", product: "12–24 KB prototype AVIF", synth: "2.57 MB GLB after intent" },
    pipeline: ["Immutable approved GLB", "Offline camera and lighting render", "Encode motion ladder", "Encode responsive stills", "Derive runtime GLB only for Synth"],
    tradeoffs: ["Strong rendering compatibility", "Predictable authored frames", "Video seeking weakens reversible scroll choreography", "Current donor video is larger than the runtime GLB"],
  },
];

function StaticMedia({ route }: { route: Route }) {
  const image = route === "product" ? "reveal" : "morph";
  return (
    <picture className="pipelineLabPicture">
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
        alt={`Temporary MONOLITH ${route} media proxy`}
      />
    </picture>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="pipelineLabSegmented">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
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
  const routeDefinition = ROUTES.find((item) => item.id === route) ?? ROUTES[0];
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
      route,
      figmaRegion: routeDefinition.figmaRole,
      deliveryMode: live && mode === "deferred" ? "realtime (activated)" : mode,
      modelRequested: live,
      modelAsset: live ? candidate.asset : null,
      transfer: candidate.transfer[route],
      sourceBytes: 3_778_588,
      runtimeBytes: 2_568_220,
      hierarchyPreserved: true,
      namedControl: "MORPH_ROTATING_ENCODER",
      measuredDrawCalls: modelStats.drawCalls || null,
      measuredTriangles: modelStats.triangles || null,
      renderLoop: live ? "demand" : "none",
    }),
    [candidate, live, mode, modelStats, route, routeDefinition.figmaRole],
  );

  return (
    <main className="pipelineLabShell">
      <header className="pipelineLabHeader">
        <div>
          <p className="pipelineLabKicker">Technical prototype · media implementation only</p>
          <h1>MONOLITH delivery study</h1>
        </div>
        <div className="pipelineLabAuthority">
          <strong>Figma remains the visual source of truth.</strong>
          <span>This page proposes no layout, typography, color, component, or content changes.</span>
        </div>
      </header>

      <section className="pipelineLabControls" aria-label="Prototype controls">
        <SegmentedControl
          label="Pipeline candidate"
          value={candidateId}
          options={CANDIDATES.map((item) => ({ id: item.id, label: `${item.id} · ${item.name}` }))}
          onChange={(value) => changeView(value, route)}
        />
        <SegmentedControl
          label="Existing Figma route"
          value={route}
          options={ROUTES.map((item) => ({ id: item.id, label: item.label }))}
          onChange={(value) => changeView(candidateId, value)}
        />
      </section>

      <section className="pipelineLabWorkspace">
        <div className="pipelineLabMediaColumn">
          <div className="pipelineLabSlotHeading">
            <div>
              <span>Media slot under test</span>
              <strong>{routeDefinition.figmaRole}</strong>
            </div>
            <code>{mode}</code>
          </div>

          <div
            className="pipelineLabMedia"
            onPointerMove={(event) => {
              if (!live) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              setRotation(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
            }}
            onPointerLeave={() => setRotation(0)}
          >
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
                className="pipelineLabVideo"
                src="/prototype/asset-pipeline/media/home-sequence.webm"
                poster="/prototype/asset-pipeline/media/reveal-1440.webp"
                autoPlay
                muted
                loop
                playsInline
                controls
              />
            )}
            {mode === "deferred" && !activated && (
              <div className="pipelineLabDeferred">
                <StaticMedia route="synth" />
                <div>
                  <strong>Static proxy shown before intent</strong>
                  <span>The surrounding Figma composition does not change.</span>
                  <button type="button" onClick={() => setActivated(true)}>
                    Activate runtime · 2.57 MB
                  </button>
                </div>
              </div>
            )}
          </div>

          {live && (
            <label className="pipelineLabMorph">
              <span>MORPH control test</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={morph}
                onChange={(event) => setMorph(Number(event.target.value))}
              />
              <output>{Math.round(morph * 100)}%</output>
            </label>
          )}

          <p className="pipelineLabProxyNote">
            The image and video files in this throwaway branch are donor-prototype proxies.
            Production outputs would be rendered from the approved GLB to the exact Figma
            aspect ratios and art-directed crops.
          </p>
        </div>

        <aside className="pipelineLabInspector">
          <div className="pipelineLabCandidateHeading">
            <span>{candidate.id}</span>
            <div>
              <p>Selected composition</p>
              <h2>{candidate.name}</h2>
            </div>
          </div>
          <p>{candidate.summary}</p>

          <dl className="pipelineLabRouteMatrix">
            {ROUTES.map((item) => (
              <div key={item.id} data-current={route === item.id}>
                <dt>{item.label}</dt>
                <dd>{candidate.routeModes[item.id]}</dd>
                <dd>{candidate.transfer[item.id]}</dd>
              </div>
            ))}
          </dl>

          <h3>Runtime state</h3>
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </aside>
      </section>

      <section className="pipelineLabDetails">
        <article>
          <p className="pipelineLabKicker">Generated outputs</p>
          <h2>{candidate.name}</h2>
          <ol>
            {candidate.pipeline.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </article>
        <article>
          <p className="pipelineLabKicker">Trade-offs</p>
          <h2>What changes technically</h2>
          <ul>
            {candidate.tradeoffs.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
        <article className="pipelineLabRecommendation">
          <p className="pipelineLabKicker">Working recommendation</p>
          <h2>B · Route-fit hybrid</h2>
          <p>
            Preserve the approved Figma design. Change only how each product-media region is
            fulfilled: capable-tier realtime on Home, responsive authored media on Product,
            and an intent-deferred runtime on Synth. Candidate C supplies fallback media.
          </p>
        </article>
      </section>
    </main>
  );
}
