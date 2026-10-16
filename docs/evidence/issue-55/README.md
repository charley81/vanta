# Issue 55 — Synth shell and Control deck evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for `SYNTH-001`–`SYNTH-005`, with supporting checks for `SYNTH-009`, `SYNTH-010`, `QUALITY-009`, and `QUALITY-010`. It is not launch-candidate sign-off, deployed audio evidence, or a substitute for the required manual assistive-technology matrix.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Silent shell and instrument-scope report

Synth server-renders the authored graphite instrument shell, code-owned phrase and scope explanation, and an explicit Enable Sound transport boundary. The route never imports or constructs an audio engine. Activation calls the narrow transport adapter only from the button gesture, then truthfully reports the current audio implementation as unavailable; it does not pretend to play or retain consent.

The rendered copy defines one repeating monophonic `A — C — D — E — D — C` phrase and explicitly excludes keyboard, note grid, MIDI, chord mode, preset browser, save, share, URL encoding, and polyphony behavior. OSC, MIX, MOD, LFO, TONE, DECAY, SUSTAIN, and unnamed display buttons appear only as subdued, `aria-hidden` physical context. They are not interactive elements and have no focus target.

## Control matrix

All values are normalized integers from 0 through 100 with step 1. `src/synth/controls.ts` is the code-owned definition used by the route model, session defaults, semantic deck, and shared physical/semantic adapter.

| Control | Default | 0 endpoint | 100 endpoint | Purpose |
|---|---:|---|---|---|
| MORPH | 50 | SUB | FRACTURE | Move continuously from SUB weight to FRACTURE texture |
| CUTOFF | 54 | DARK | BRIGHT | Offset the voice toward darker or brighter filtering |
| RESONANCE | 32 | SOFT | FOCUSED | Emphasize the filter edge without changing the phrase |
| DRIVE | 24 | CLEAN | SATURATED | Add bounded post-filter saturation |
| ATTACK | 18 | IMMEDIATE | SWELLING | Shape the onset from immediate to swelling |
| RELEASE | 42 | CLIPPED | OVERLAPPING | Shape the tail from clipped to overlapping |

`tests/synth/control-surface.test.ts` proves that physical and semantic sources call the same adapter and mutate the same store, and that fractional or out-of-range values are rejected. `tests/browser/synth.spec.ts` verifies exactly six selector buttons, exactly six native ranges in source, the native range bounds, immediate visible updates, and one exposed focused range at a time.

## Accessibility-tree and screen-reader report

The default semantic tree contains the Sound transport status/action, the complete visible six-control reference, and six named selection buttons. Selecting a control expands a labelled non-modal detail region and exposes that control’s native range with its purpose, endpoint text, keyboard guidance, current value, and Close action. Other ranges use the native `hidden` state, so they cannot become stray focus targets. On wide layouts the detail is a side panel; below the content-driven breakpoint it becomes an inline panel.

Keyboard activation transfers focus from the selector to the range. Escape and Close collapse the panel and return focus to the selecting button without changing the value. Pointer activation leaves focus behavior native. Range changes update visible output immediately; the additional polite contextual status emits only the last value after 450 ms rather than announcing every input event. Native range semantics remain available throughout.

Production-browser coverage verifies focus movement/return, Arrow-key adjustment, Escape, six 44-by-44-pixel-or-larger selectors, transport and Close targets, 320 CSS-pixel reflow without horizontal page scrolling, and zero automated WCAG A/AA findings from axe-core with an open control panel. The Core route suite independently scans direct Synth entry at 320 CSS pixels. Local production-build references retain the [wide side-panel presentation](synth-wide.png) and [320 CSS-pixel inline presentation](synth-narrow.png).

Expected screen-reader sequence for the focused CUTOFF path is: selector name and current percent; expanded CUTOFF region; `CUTOFF value` slider with 0–100 range and current percent; purpose/endpoints/guidance description; debounced `CUTOFF [value] percent` contextual update; then selector focus after Escape/Close. Manual VoiceOver, NVDA, JAWS, TalkBack, physical touch, and 400% browser-zoom qualification remain candidate-stage work and are not claimed here.

## MORPH-session lifetime report

The MORPH session is a module-scoped observable store in the client tab’s JavaScript realm. It contains only `selectedControl` and the six normalized values. Panel openness, focus, audio state/consent, and browser resources are route-local and are not retained. No MORPH data is written to `localStorage`, `sessionStorage`, history, a URL, a cookie, or telemetry.

`tests/browser/synth.spec.ts` verifies:

| Boundary | Expected and observed outcome |
|---|---|
| App Router navigation away and back | selected control and all values retained; focused panel closed |
| Back/Forward restoration | selected control and values retained in the tab |
| Reload | canonical selected control and six defaults restored |
| New tab | canonical selected control and six defaults restored |
| Opener-created/duplicated tab | canonical selected control and six defaults restored even though browser session state may be copied |
| Web Storage inspection | no MORPH key in local or session storage |

The module lifetime also means a crash reconstruction creates canonical defaults rather than reconstructing prior MORPH values.

## Verification commands

The implementation is checked with:

```text
pnpm validate:requirements
pnpm validate:evidence
pnpm validate:performance
pnpm validate:product-catalog
pnpm validate:boundaries
pnpm validate:public-runtime
pnpm validate:editorial
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build:verified
pnpm test:browser
```

Generated reports under `artifacts/reports/` are local feedback bound to the working-tree identity and do not make an Acceptance claim for another commit or deployment.
