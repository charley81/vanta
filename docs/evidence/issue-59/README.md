# Issue 59 — governed GLB and authored-media pipeline

This directory indexes branch-level implementation evidence. It does not claim candidate Acceptance; generated verification reports set `acceptanceClaim: false` until a release manifest binds them to an immutable candidate.

## Evidence map

| Evidence | Location | Result |
|---|---|---|
| Approved-source and required-node validation | `artifacts/reports/glb-validation.json` from `pnpm validate:media-source` | Pass under the documented hash-scoped source finding policy |
| Derivative manifest | `media/manifests/derivatives.json` | SHA-256 `20ea020786e240a3bdf96e90dca255b26a789004d222d5ab219441a2536881f7` |
| Public media manifest | `media/manifests/media.json` | SHA-256 `6e289ba5eb5a3554b0741e3815ec442c5c9b5584d48cb10fbebce90f10a815c0` |
| Clean-run reproducibility | `artifacts/reports/media-reproducibility.json` from `pnpm validate:media` | 22 outputs and both manifests reproduced byte-for-byte |
| Resource ceilings | `artifacts/reports/media-resource-budgets.json` | Pass |
| Source/runtime visual comparison | [`visual-comparison.webp`](visual-comparison.webp) | Four versioned cameras, approved source at left and Meshopt derivative at right |

## Measured results

- Approved source: `3,778,588` bytes, SHA-256 `ccbdb568548e154335b2d8eb147a8f39b9881eb930e2b290e098f419425ca261`.
- Browser derivative: `2,568,220` bytes, SHA-256 `e764793bea736a369995ea1ee20a1a9bf263e52363e9db214f219d5b60552cc1`, below the `2,700,000`-byte ceiling.
- Browser GLB: zero Khronos validator errors; 141 named nodes, 71,744 triangles, and 131 draw calls preserved.
- Decoded texture allocation including a full mip chain: `20,621,997` bytes, below `33,554,432`.
- Estimated total GPU allocation: `84,300,329` bytes at the configured 1440×900/DPR 2 reference viewport, including `62,208,000` bytes of double-color-buffer plus depth/stencil targets; below `100,663,296`.
- Motion variants: none required by the current route contracts; the `1,500,000`-byte per-variant ceiling remains enforced for future outputs.

The approved immutable source's one exact Khronos validator finding is described in [`media/README.md`](../../../media/README.md) and retained in the validation report. Any source identity change or any unrecognized/additional validator error stops the pipeline.
