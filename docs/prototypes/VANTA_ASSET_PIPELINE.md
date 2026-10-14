# VANTA asset-pipeline comparison prototype

> Throwaway decision artifact for **Choose the 3D asset and rendering pipeline**. Do not promote this route or its media directly into production.

## Question

Which source-to-runtime composition should turn the approved MONOLITH GLB into product stills, responsive media, and interactive 3D without paying the realtime-rendering cost where it adds no product value?

## Run

```bash
pnpm install
pnpm prototype:asset-pipeline
```

Open <http://localhost:3000/prototype/asset-pipeline?candidate=B&route=home>.

The query parameters are shareable:

- `candidate=A|B|C`
- `route=home|product|synth`

## Compared compositions

- **A / Realtime everywhere:** serve the untouched GLB and mount WebGL on Home, Product, and Synth.
- **B / Route-fit hybrid:** use a conservative Meshopt runtime derivative on Home; responsive stills on Product; and an intent-deferred runtime on Synth.
- **C / Media-first:** use pre-rendered motion on Home, responsive stills on Product, and an intent-deferred runtime only on Synth.

The working recommendation shown in the prototype is **B / Route-fit hybrid**. Candidate C describes the natural capability fallback rather than the default composition.

## Source observations

The approved source is `/Users/chrisharley/Desktop/vanta/VANTA_MONOLITH_v03D.glb`.

| Property | Observed value |
| --- | ---: |
| SHA-256 | `ccbdb568548e154335b2d8eb147a8f39b9881eb930e2b290e098f419425ca261` |
| Transfer size | 3,778,588 bytes |
| Triangles | 71,744 |
| Estimated model draw calls | 131 |
| Named nodes | 141 |
| Embedded textures | 5 PNGs |
| Estimated minimum texture GPU allocation | ~20.6 MB |
| Animation clips | 0 |
| Required interactive node | `MORPH_ROTATING_ENCODER` |
| Required emissive node | `MORPH_Light_Ring_Outer` |

The model is modest in network bytes and triangle count, but expensive in draw calls. Embedded PNGs also decode to much more GPU memory than their transfer size suggests. The source has no built-in animation clips; camera, light, and supported control behavior remain application-owned.

## Conservative runtime derivation

The prototype generated the runtime GLB with glTF Transform 4.5.1 using Meshopt while explicitly disabling flattening, joining, instancing, simplification, palette generation, and texture recompression:

```bash
pnpm dlx @gltf-transform/cli optimize \
  VANTA_MONOLITH_v03D.glb \
  VANTA_MONOLITH_runtime_meshopt.glb \
  --compress meshopt \
  --flatten false \
  --join false \
  --instance false \
  --palette false \
  --simplify false \
  --texture-compress false
```

| Property | Result |
| --- | ---: |
| SHA-256 | `e764793bea736a369995ea1ee20a1a9bf263e52363e9db214f219d5b60552cc1` |
| Transfer size | 2,568,220 bytes |
| Transfer reduction | 32.02% |
| Named nodes | 141 |
| Required interactive nodes retained | Yes |
| Triangles | 71,744 |
| Estimated model draw calls | 131 |

This pass improves transmission, not rendering cost. Mesh/material consolidation must be a deliberate DCC change because naïve joining can break per-control transforms and material fidelity. KTX2 was not produced in this spike because the required `ktx` encoder was unavailable; texture transcode format and quality therefore remain a production-pipeline qualification item.

## Media caveats

The AVIF/WebP stills and WebM in this branch are derived from donor-prototype browser captures. They exist only to make route compositions tangible:

- 1440 px AVIF stills are 12–24 KB in this dark sample.
- The donor WebM is 4,994,545 bytes—larger than either GLB—and demonstrates why “video is faster” cannot be assumed without a production bitrate ladder and measured start behavior.
- Production still masters must be rendered color-managed from the approved source scene, not captured from this browser prototype.

## Design context

The prototype was checked against the Figma desktop MCP metadata and screenshots for the selected `final` canvas, Product hero (`129:477`), and Product MORPH feature (`129:521`). The design makes product imagery central on Product but does not require direct manipulation there, supporting authored responsive media for that route. Home and Synth responsibilities follow the previously resolved experience architecture.

## What this prototype does not decide

- Final quality, startup, memory, or frame-time budgets.
- Exact capability tiers and inclusive fallbacks.
- KTX2 profile, texture resizing, LODs, or a draw-call-reduction DCC pass.
- Production renderer, render-farm, CDN, or media-transformation vendor.
- Final camera, lighting, color-management, and crop manifest schema.

Those details follow after the route composition is chosen.
