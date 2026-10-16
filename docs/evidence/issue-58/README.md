# Issue 58 — MORPH sound and target-device acceptance

Status: **approved on the identified representative target**

This record is the runbook and evidence index for `SYNTH-006`, `QUALITY-007`, and `QUALITY-008`. The signed issue record—not this procedural copy—is the Acceptance authority.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Recorded qualification

Chris Harley (`@charley81`, `product_design`) approved the result on 2026-10-16. The review was bound to application commit `04b69cea3525c9f5dbbc2b2129a213409a85bcf8`, Netlify deployment `6ad25ca573b503b1b673931a`, and its immutable Synth URL.

The selected representative target was a MacBook Pro running macOS Tahoe 26.6.2 and Google Chrome 154.0.8037.98 x86_64 through built-in speakers. The sound review, calibration values, three raw latency runs, medians, real-output ten-minute stress result, and explicit approval are preserved in the [signed issue record](https://github.com/charley81/vanta/issues/58#issuecomment-6221294500). Issue 58 is closed with no waiver or normative change.

## Completion gate

Issue 58 can close only after all of the following refer to the same immutable application commit, deployment, content/configuration identity, and audio implementation:

- a named product/design reviewer explicitly approves or rejects the sound and interaction result;
- every product/engineering-selected representative target device and browser has raw cold, warm, control-to-schedule, and visible-update measurements;
- a real-output ten-minute stress session has been heard and reviewed on each selected target class;
- the generated calibration report and human sound-review notes are retained and linked from the issue;
- every failure is either fixed within Implementation latitude and re-run as a new candidate, or handled through the baseline change-control process.

Desktop listening alone is not sufficient. The deterministic scheduler simulation is supporting engineering feedback, not a substitute for the real-output stress session.

## 1. Bind the candidate before listening

Record these values before collecting any result:

| Field | Required value |
|---|---|
| Handoff Baseline | `8177d60995fcce30fad51663b8c8e8fc5c7fceb9` |
| Application commit | Full immutable Git SHA |
| Deployment | Immutable deployment ID and URL; no mutable alias |
| Configuration/content | Exact release or revision identities used by the deployment |
| Reviewer | Name and `product_design` role |
| Target matrix | Hardware model, OS version, browser name/version, audio output, input method |
| Session | UTC start/end time and artifact custodian |

A result from a different identity is comparison material only. Do not copy it into the candidate decision.

## 2. Generate the calibration manifest

From a clean checkout of the bound application commit, run:

```bash
pnpm validate:audio-calibration
pnpm validate:audio-isolation
```

Retain `artifacts/reports/audio-calibration.json` as the calibration manifest and `artifacts/reports/audio-render-isolation.json` as supporting evidence. Record SHA-256 hashes for the retained files. The calibration report contains the authored phrase, 0/25/50/75/100 continuum, bright-SUB/dark-FRACTURE fingerprints, secondary-control deltas, compensation spread, tool versions, commit, dirty state, and timestamps.

A passing report is necessary but is explicitly marked `acceptanceClaim: false`; the named reviewer must still hear the rendered result.

## 3. Human sound review

Use the immutable candidate on each target in the selected matrix. Start from a reload with canonical values, use a safe fixed output level, and listen to at least two complete A–C–D–E–D–C phrases at every row. Record **pass**, **fail**, and precise notes; never leave a row implicit.

### MORPH continuum

Keep CUTOFF `54`, RESONANCE `32`, DRIVE `24`, ATTACK `18`, and RELEASE `42` fixed.

| MORPH | Required observation | Result/notes |
|---:|---|---|
| 0 | Deep, rounded, fundamental-forward, stable, spacious SUB | |
| 25 | Continuous movement away from SUB; no preset-like switch | |
| 50 | Audible intermediate identity; not a volume blend or renamed cutoff | |
| 75 | Continuous movement toward denser, less stable FRACTURE | |
| 100 | Bright, harmonically dense, unstable, angular, textured FRACTURE | |

Sweep slowly `0 → 100 → 0`. Reject a discontinuity, unsafe loudness jump, silence, or control motion that behaves like discrete presets.

### Semantic edge cases

| Case | Values | Required observation | Result/notes |
|---|---|---|---|
| Bright SUB | MORPH `0`, CUTOFF `100`; all other defaults | Remains recognizably SUB despite brightness | |
| Dark FRACTURE | MORPH `100`, CUTOFF `0`; all other defaults | Remains recognizably FRACTURE despite darkness | |

The two cases must remain recognizably different from one another.

### Secondary controls at fixed MORPH

Set MORPH `50`. Restore every non-tested secondary control to its default before each row. Compare `0`, default, and `100`, then make a slow end-to-end sweep.

| Control | Default | Required observation | Result/notes |
|---|---:|---|---|
| CUTOFF | 54 | Meaningful bounded dark-to-bright filter offset | |
| RESONANCE | 32 | Meaningful bounded filter-edge emphasis | |
| DRIVE | 24 | Meaningful clean-to-saturated change without unsafe gain | |
| ATTACK | 18 | Meaningful immediate-to-swelling onset | |
| RELEASE | 42 | Meaningful clipped-to-overlapping tail without a stuck note | |

### Phrase and scope

Confirm and record that the result remains one repeating monophonic A–C–D–E–D–C phrase at a steady pulse. It must not imply keyboard, note-grid, MIDI, chord, preset, save/share, URL-state, polyphony, or complete eight-voice MONOLITH emulation behavior. Record whether the selected voicing and timing are approved within Implementation latitude.

## 4. Target-device latency traces

Collect at least three raw runs for each selected hardware/browser pair from the immutable candidate. Retain the raw trace, not only a pass/fail summary, and report the median without deleting outliers.

| Measurement | Budget |
|---|---:|
| Cold first sound | `≤ 500 ms` |
| Warm first sound | `≤ 150 ms` |
| Accepted control input to audio scheduling | `≤ 50 ms` |
| Visible value update | Same animation frame |

For the automated Chromium preflight, run `pnpm test:audio-latency`; its Playwright attachment is supporting feedback only. On every physical target, capture the browser/device trace using its native performance tooling or an approved external audio/interaction capture. Identify the hardware, OS, browser version, output path, run number, raw values, and UTC timestamp in each trace.

The Synth status element exposes the implementation measurements as `data-audio-cold-latency-ms`, `data-audio-warm-latency-ms`, and `data-audio-control-latency-ms`. These measure application scheduling. When the target/output stack can add material latency, pair them with external first-audible-output capture rather than relabeling scheduling time as audible latency.

## 5. Ten-minute real-output stress session

Run a continuous ten-minute session on each selected target class. Listen throughout and retain the target trace. At minimum:

1. begin at canonical values and confirm phrase order;
2. sweep MORPH repeatedly through `0/25/50/75/100`, including slow full sweeps;
3. exercise every secondary control through both endpoints while MORPH remains fixed at `50`;
4. use Pause/Resume repeatedly;
5. trigger and recover from one visibility/platform interruption;
6. open and close Bag, verify interruption, then explicitly resume;
7. finish with at least one minute of uninterrupted playback.

Record any click with its timestamp and preceding action. Reject any application-caused click, stuck note, overlapping transport, runaway gain, unrecovered interruption, phrase-order/timing defect, or unsafe output. Also run `pnpm validate:audio-stress` and retain `artifacts/reports/audio-stress.json` as deterministic supporting evidence; it cannot replace this heard session.

## 6. Evidence index

| Artifact | Record | Result | Custodian |
|---|---|---|---|
| Calibration manifest | [Signed issue record](https://github.com/charley81/vanta/issues/58#issuecomment-6221294500) | pass | `@charley81` |
| Audio/render isolation report | [Signed issue record](https://github.com/charley81/vanta/issues/58#issuecomment-6221294500) | pass | `@charley81` |
| Sound-review notes | [Signed issue record](https://github.com/charley81/vanta/issues/58#issuecomment-6221294500) | pass | `@charley81` |
| Target-device latency trace | [Three raw runs and medians](https://github.com/charley81/vanta/issues/58#issuecomment-6221294500) | pass | `@charley81` |
| Ten-minute real-output stress notes | [Signed issue record](https://github.com/charley81/vanta/issues/58#issuecomment-6221294500) | pass | `@charley81` |
| Signed audio acceptance record | [Explicit approval](https://github.com/charley81/vanta/issues/58#issuecomment-6221294500) | approve | `@charley81` |

The machine-readable draft at [`evidence/manifests/issue-58.yaml`](../../../evidence/manifests/issue-58.yaml) remains an unpromoted release-candidate scaffold. It intentionally makes no release-wide candidate claim because the full release identity and pre-launch bindings are outside issue 58.

## 7. Signed decision template

The completed decision is linked above. Future requalification uses this explicit decision block:

```text
Decision: APPROVE | REJECT
Reviewer: <name>
Role: product_design
Signed at: <UTC timestamp>
Handoff Baseline: 8177d60995fcce30fad51663b8c8e8fc5c7fceb9
Application commit: <full SHA>
Deployment ID / immutable URL: <ID and URL>
Evidence manifest SHA-256 / URI: <hash and URI>
Accepted calibrated values: <calibration manifest SHA-256 / URI>
Target matrix: <hardware, OS, browser versions, output paths>
Waivers: <IDs or none>
Notes or precise failures: <text>
```

An approval with missing identity, target traces, stress evidence, or reviewer name is incomplete. A rejection must identify the failing row and observable defect precisely enough for engineering to reproduce it.
