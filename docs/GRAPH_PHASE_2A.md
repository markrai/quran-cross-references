# Phase 2A: Interactive Quran relationship graph

Phase 2A upgrades the original SVG arc preview into an explorable, deep-linkable
graph without changing the Quran numbering, source text or curated relationships.

## Interaction model

- Use **+**, **−**, arrow buttons and **Reset** to zoom or pan. Zoom is bounded
  between the whole Quran (1×) and 12×, with the pointer position preserved
  when zooming using Ctrl/Cmd + wheel.
- Drag the labeled handle below the plot or an empty region inside it to navigate
  using mouse or touch. At the initial 1× full-Quran overview, the first drag
  automatically zooms to 1.8× and pans in the drag direction. Once zoomed,
  further drags pan without changing zoom. A click or a movement under 6px
  does not zoom. Vertical page scrolling remains available outside the plot.
- Click a relationship curve or focus it and press Enter/Space to inspect both
  cited passage ranges. The selected link ID is saved as `link=N` in the URL.
- Click the Quran axis to select an ayah. Focus the axis and press left/right
  arrows to move exactly one ayah; Enter/Space selects the current viewport center.
  This changes `ref=surah:ayah` and updates the bilingual reader.
- Change the selected ayah using search, the surah picker, the previous/next
  controls or the Threads view. The graph's focus moves with the reader.
- Use **Graph focus through ayah** to select a contiguous passage in the
  current surah. This changes `end=surah:ayah`, highlights its band and marks
  every relationship touching **any** included source or target ayah.
- Optionally enable **Only links touching selected passage** to hide unrelated
  arcs without throwing away the current scope filter.
- The graph reports source-data link counts, the selected passage, visible
  viewport boundaries and the number of SVG arcs actually drawn. None of
  these counts represents a theological interpretation or relevance ranking.

## Sharing and history

The following canonical URL addresses a selected range and curated link:

```text
/quran-cross-references/?ref=2%3A1&end=2%3A5&link=0
```

`ref` identifies the active ayah, `end` an optional inclusive end within
the same surah and `link` an optional nonnegative relationship ID. Unknown,
out-of-range or unrelated link IDs are ignored safely. Malformed ranges
are discarded. Existing `/quran/` URLs and old `ref`-only links still work.

Zoom/pan and the local "Only links" toggle deliberately stay ephemeral.
Shareable passage and relationship selections survive refresh and browser
back/forward. Changing the selected ayah clears the previous range and link
selection to avoid stale context.

## Architecture and performance

- `graph-viewport.ts` owns bounded viewport math, zoom anchoring, panning,
  and the reversible world-coordinate/ayah-index mapping.
- `graph-layout.ts` generates and labels arc paths once per corpus/filter
  change. The render loop reuses those paths during drag and zoom.
- SVG paths wholly outside the visible X-coordinate range are culled. A
  relationship spanning the viewport is retained even if neither endpoint is
  inside it. This avoids wrongly hiding long-distance links.
- Highlighting uses source/target range intersection, so multi-ayah links
  are handled without duplicating relationships.
- The existing indexed corpus and immutable source SHA-256 pins are unchanged.

Run the repeatable CPU baseline:

```powershell
npm run bench:graph
```

This reports the median and p95 layout times for all 2,445 relationships
and for surah 2, plus the number of potentially rendered SVG nodes. It is
**not** a browser paint benchmark. Record the baseline on target desktop
and phone browsers with DevTools Performance, including drag responsiveness,
layout time, memory and dropped frames before committing to Canvas/WebGL.
At sustained interaction frames above a 16.7 ms budget on target devices,
consider a Canvas or GPU renderer that consumes the same graph adapters.

## Acceptance

```powershell
npm ci
npm run check
npm run build
npm run bench:graph
npm run test:e2e
```

On phone, check pointer pan, scroll outside the graph, the focus controls
and touch hit areas. On desktop, check wheel zoom, SVG keyboard access and
link selection history. Phase 1D.3's separate PWA/release rights acceptance
still applies. The application remains `noindex` until those gates pass.
