# Issue 45 — shell implementation evidence

This record describes the implementation in the commit containing this file. It is focused engineering evidence for PRODUCT-007, PRODUCT-008, QUALITY-009, QUALITY-010, and the shell portion of STATE-004; it is not launch-candidate sign-off or manual assistive-technology evidence.

Baseline: approved Handoff Baseline `8177d60995fcce30fad51663b8c8e8fc5c7fceb9`.

## Responsive captures

The captures were produced from a local `next build` / `next start` production build of the same working tree:

- [1440 × 900 wide shell](shell-wide.png)
- [390 × 844 narrow shell](shell-narrow.png)
- [1440 × 900 reduced-motion shell](shell-reduced-motion.png)
- [390 × 844 forced-colors shell](shell-forced-colors.png)

The browser suite additionally checks 320 CSS pixels with and without JavaScript and rejects horizontal page overflow.

## Accessibility report

Automated Chromium checks in `tests/browser/global-shell.spec.ts` cover:

- first-focusable skip link and semantic banner, navigation, main, and content-info landmarks;
- current-route announcement through `aria-current="page"`;
- narrow menu and Bag shell focus containment, Escape, explicit close, mutual exclusion, and header/footer invoker focus return;
- at least 44 × 44 CSS-pixel visible link and button targets at 320 CSS pixels;
- Axe WCAG 2 A/AA, 2.1 AA, and 2.2 AA rules with the narrow navigation dialog open under forced colors;
- reduced-motion animation suppression;
- useful route content and footer navigation without JavaScript.

The focused run reported no Axe violations. VoiceOver, NVDA, JAWS, TalkBack, physical-device, and manual 400% zoom qualification remain launch-candidate activities and are not claimed here.

## Token report

`app/globals.css` defines the approved palette as source tokens:

| Token | Value | Role in this shell |
|---|---:|---|
| Espresso | `#0F0905` | Foundation |
| Cream | `#FEFCFB` | Primary text |
| Peach | `#E7C5B1` | Editorial emphasis |
| Taupe | `#DED4CF` | Secondary text and mixed rules |
| Terracotta | `#CA8054` | Available route-expression token |
| Brown | `#604E43` | Mixed raised surfaces and depth |
| Signal cyan | `#7DE3D6` | Focus, current route, and open disclosure state only |

Spacing uses a rem-based `1/2/3/4/6/8/12/16/24` scale, a fluid page gutter, and a fluid shell height. Forced colors replace authored focus, rule, surface, text, and current-state colors with system colors.

## Font candidate and transfer report

The provisional candidates are loaded with `next/font`, self-hosted in the generated deployment, and covered by the SIL Open Font License 1.1:

| Role | Candidate | Latin WOFF2 |
|---|---|---:|
| Grotesk declarations and identity | Geist variable | 29,288 bytes loaded |
| Monospaced navigation and telemetry | Geist Mono variable | 23,108 bytes loaded |
| Restrained serif italic emphasis | Instrument Serif italic 400 | 15,684 bytes deferred until used |
| **First-render total** |  | **52,396 bytes** |

The first-render total is below the 120 KiB compressed font ceiling. `next/font` supplies metric-adjusted fallbacks and `font-display: swap`; the unused serif candidate is not preloaded. The candidates remain provisional pending final visual and licensing approval.

## Initial shell transfer

The production build measured 119,125 Brotli bytes of initial Home JavaScript against the 140 KiB Home ceiling. The shell disclosure chunk contributes 6,673 Brotli bytes. The browser test recomputes both measurements from the scripts requested by the page and checks the fonts actually requested by the page. Product and Synth route totals will be qualified when those route adapters exist; this report does not claim their future budgets.
