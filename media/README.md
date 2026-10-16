# Governed MONOLITH media pipeline

This directory owns the immutable approved geometry source, versioned render/crop recipes, offline masters, and deterministic derivative manifests for `MEDIA-001` through `MEDIA-004` and the asset portions of `QUALITY-004` and `QUALITY-006`.

## Commands

```bash
pnpm validate:media-source # checksum, glTF, bounds, hierarchy, texture/GPU checks
pnpm build:media           # regenerate the browser GLB, masters, stills, comparison, manifests
pnpm validate:media        # regenerate in a clean temporary tree and byte-compare every output
```

`pnpm build:media` is intentionally fail-closed. It first verifies the immutable source at `media/source/VANTA_MONOLITH_v03D.glb`, then reproduces the accepted conservative Meshopt model with glTF Transform 4.5.1. It does not flatten, join, instance, simplify, palette-convert, or recompress textures. It renders the approved source offline with the repository-owned software rasterizer and versioned camera/light/crop settings in `media/pipeline.json`; no browser, Figma-hosted image, or donor-prototype asset is used as a master.

The committed outputs are:

- `public/media/models/`: the shared browser GLB;
- `media/masters/`: color-managed PNG masters;
- `public/media/stills/`: responsive AVIF/WebP delivery variants;
- `media/manifests/derivatives.json`: complete source, recipe, resource, and output provenance;
- `media/manifests/media.json`: public route-use contract and delivery hashes;
- `docs/evidence/issue-59/visual-comparison.webp`: source/runtime comparison under each authored camera.

No authored motion file is currently generated because no current route contract requires one: Home and Synth use realtime enhancement over stable authored posters. The manifest records that decision and the 1.5 MB ceiling; adding a motion recipe automatically brings each output under the manifest and budget policy.

## Source validation policy

The source must match SHA-256 `ccbdb568548e154335b2d8eb147a8f39b9881eb930e2b290e098f419425ca261` and all locked measurements before any derivation runs. Required control nodes must retain their named ancestor hierarchy.

Khronos glTF Validator reports one source-authored error at `/meshes/12/primitives/0/material`: the shared brushed-metal material refers to a roughness texture on one grip primitive that has no UV accessor. Because the approved source is immutable, the policy records and allows only that exact code and pointer for only the approved hash. A changed hash, location, code, or additional validator error fails. Conservative derivation prunes the incompatible unused binding, and the browser GLB validates with zero errors. The finding remains visible in `artifacts/reports/glb-validation.json`; it is never silently suppressed.

Generated reports are local/CI engineering evidence with `acceptanceClaim: false`. Candidate Acceptance still requires binding them to one immutable application commit and deployment in the release evidence manifest.
