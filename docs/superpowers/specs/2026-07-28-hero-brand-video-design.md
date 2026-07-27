# Hero brand video + nav logo — Design

## Context

The homepage hero currently uses a CSS-animated "pulsing sphere" (`.hb-sphere`, `.hb-ring`, `.hb-dots`) as ambient background art behind the headline. The nav bar shows only the plain text "VIVIDEX" — no logo mark appears anywhere on the site.

Vividex now has real brand assets: a finished logo animation (exported from DaVinci Resolve as `vividex desktop refined.mp4`) showing the full lockup — the blue/cyan V mark, "VIVIDEX" wordmark, and "Building Digital Experiences" tagline — with a particle wave sweeping across the frame, plus several static logo PNGs. The goal of this change is to replace the placeholder sphere animation with the real brand video, and give the nav bar an actual logo mark, so the site reflects the brand that now exists instead of a generic animated placeholder.

This spec covers only the hero video swap and the nav logo. A broader rebrand (palette, typography, other pages) is explicitly out of scope for this pass.

## Source assets

- `C:\Users\Abbot\DaVinci Resolve Media\vividex desktop refined.mp4` — 1920x1080, 7.72s, 24fps, H.264 @ ~11.5Mbps, includes an unused stereo AAC audio track. Content: dark navy background, centered V mark + "VIVIDEX" wordmark + tagline, animated particle wave sweeping bottom-left to top-right. Loops cleanly (first and last frames match).
- `C:\GameForge\websites\Vividex\vividex logo 4.png` — 493x428, V mark only, no wordmark, on a flat opaque black background (not transparent).

## 1. Asset pipeline

**Hero video** (`assets/hero-brand.mp4`):
- Strip the audio track (unused — video will be muted).
- Re-encode to 1280x720 H.264, yuv420p, `+faststart` for progressive playback. Target well under 1MB (source is ~10.6MB at needlessly high bitrate for a looping decorative clip).
- Extract a poster frame (`assets/hero-brand-poster.jpg`) from early in the clip, used as the `poster` attribute so the card isn't blank while the video loads, and as the fallback for `prefers-reduced-motion`.

**Nav logo** (`assets/nav-logo.png`):
- Source from `vividex logo 4.png`. Key out the flat black background (chroma/color-key on pure black, since the V mark's blue/cyan gradient is well separated from black) to produce a transparent PNG.
- Trim to the mark's bounding box, export at a size suitable for a ~28–32px-tall nav icon (@2x for retina).

## 2. Hero markup & layout

Remove `.hero-bg` and its children (`.hb-sphere`, `.hb-ring`, `.hb-dots`, and the `sphere-float` / `ring-spin` keyframes) entirely.

Restructure `.hero-inner` into a two-column layout:
- **Left column**: existing headline, description, and actions — unchanged content, just now one side of a row instead of the full width.
- **Right column**: a new `.hero-video-card` containing the `<video>` element. Autoplay, muted, loop, `playsinline`, no controls, `poster="assets/hero-brand-poster.jpg"`. The whole card is `aria-hidden="true"` (decorative — the nav logo and headline already carry the brand/meaning for screen reader users).
- Card styling: rounded corners, subtle 1px border, soft cyan/blue glow (reusing the existing `--cyan`/`--blue` accent treatment already used on `.btn-prim`'s hover glow), video shown uncropped at native 16:9 via `aspect-ratio: 16/9` and `object-fit: cover` inside the rounded frame. Sized comparably to the sphere's old footprint (roughly `clamp(320px, 38vw, 560px)` wide), positioned on the right side of the hero, not bled off the viewport edge.
- Respect `prefers-reduced-motion: reduce` — pause the video (show the poster frame as a static image) for users who request it.

**Responsive**: at the existing 960px breakpoint where `.hero-foot` already collapses to a single column, the hero's two-column split also stacks to one column, with the video card ordered **above** the headline (CSS `order`), full-width. Below that, existing hero responsive rules (headline font-size clamp at 640px, etc.) are unaffected.

## 3. Nav logo

Update `.nav-logo` to include the new transparent V-mark icon (`assets/nav-logo.png`) alongside the existing "VIVIDEX" text — icon first, text after, small gap between them, vertically centered. No change to nav text styling, links, or the scroll-triggered blur/background behavior.

## Out of scope

- Any changes to color palette, typography, or layout outside the hero/nav.
- Other pages (privacy, terms, success).
- The other logo-animation mp4s and business-card assets sitting in the repo root — not used in this pass.
