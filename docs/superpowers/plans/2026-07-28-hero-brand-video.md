# Hero Brand Video + Nav Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder CSS "pulsing sphere" hero animation with the real Vividex logo-lockup video, and add an actual logo mark to the nav bar.

**Architecture:** Static HTML/CSS/JS site (no build step, no test framework, deployed to Vercel as-is). Two new binary assets (a compressed hero video + poster frame, and a transparent nav icon) are produced from source files outside the repo and outside `assets/`, then `index.html` and `styles.css` are edited directly. Verification is visual (local static server + Playwright screenshots at desktop/mobile widths) since there's no existing test suite to extend — this matches the codebase's current conventions.

**Tech Stack:** Plain HTML/CSS/JS, `ffmpeg-static` (npm, used only as a one-off local tool — not added as a project dependency), the project's `vividex-server.ps1` local static server, Playwright MCP tools for visual verification.

## Global Constraints

- This pass touches only the hero section and nav logo. No other page, no palette/typography change, no other rebrand asset (spec: "Out of scope").
- Hero video: re-encode to 1280x720 H.264, no audio track, `+faststart`, target under 1.5MB (spec says "well under 1MB" — 1.5MB is the hard verification bound, aim lower).
- Video is decorative: `autoplay muted loop playsinline`, no controls, `aria-hidden="true"` on its wrapper.
- Respect `prefers-reduced-motion: reduce` — show the poster frame as a static image instead of playing video.
- Mobile (≤960px, matching the existing `.hero-foot` breakpoint): video stacks **above** the headline, full width.
- Desktop (≥961px): headline/copy on the left, video card on the right, roughly where the old sphere sat.
- Source files (read-only, do not modify):
  - `C:\Users\Abbot\DaVinci Resolve Media\vividex desktop refined.mp4`
  - `C:\GameForge\websites\Vividex\vividex logo 4.png`

---

## File Structure

- Create: `assets/hero-brand.mp4` — compressed, muted hero loop.
- Create: `assets/hero-brand-poster.jpg` — poster frame / reduced-motion fallback.
- Create: `assets/nav-logo.png` — transparent V-mark icon for the nav.
- Modify: `index.html` — nav logo markup (`.nav-logo`), hero markup (remove `.hero-bg`, restructure `.hero-inner`).
- Modify: `styles.css` — nav logo styles, remove sphere/ring/dots rules, add `.hero-video-card` and grid layout rules, responsive + reduced-motion rules.

---

### Task 1: Compress the hero video and extract a poster frame

**Files:**
- Create: `assets/hero-brand.mp4`
- Create: `assets/hero-brand-poster.jpg`

**Interfaces:**
- Produces: `assets/hero-brand.mp4` (H.264, 1280x720, no audio, muted-loop-ready), `assets/hero-brand-poster.jpg` (JPEG, same 1280x720 frame), both consumed by Task 4's `<video>` markup.

- [ ] **Step 1: Install a portable ffmpeg outside the repo**

Run from the repo root (`C:\GameForge\websites\Vividex`):

```bash
mkdir -p ../.vividex-ffmpeg-tools
cd ../.vividex-ffmpeg-tools
npm init -y
npm install ffmpeg-static --no-save
cd -
```

This installs into a sibling directory (`..\.vividex-ffmpeg-tools`), outside the git repo, so nothing needs to be gitignored or cleaned up from tracked files.

- [ ] **Step 2: Verify the ffmpeg binary is present**

```bash
"../.vividex-ffmpeg-tools/node_modules/ffmpeg-static/ffmpeg.exe" -version
```

Expected: prints an ffmpeg version banner (e.g. `ffmpeg version ...`), no error.

- [ ] **Step 3: Re-encode the video**

```bash
FF="../.vividex-ffmpeg-tools/node_modules/ffmpeg-static/ffmpeg.exe"
"$FF" -y -i "C:\Users\Abbot\DaVinci Resolve Media\vividex desktop refined.mp4" \
  -an -vf "scale=1280:720" -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p \
  -movflags +faststart assets/hero-brand.mp4
```

- `-an` strips the unused audio track.
- `-crf 24` targets small size while keeping the logo/wordmark text edges clean (this clip is mostly a dark gradient background, so bitrate should stay low even at this quality).

- [ ] **Step 4: Verify the output size and playability**

```bash
"$FF" -i assets/hero-brand.mp4 2>&1 | grep -E "Duration|Stream"
ls -la assets/hero-brand.mp4
```

Expected: `Stream ... Video: h264 ... 1280x720`, no `Audio` stream line, and file size under 1.5MB (`1500000` bytes). If it's over 1.5MB, re-run Step 3 with `-crf 28` instead of `24`.

- [ ] **Step 5: Extract a poster frame**

```bash
"$FF" -y -i assets/hero-brand.mp4 -ss 0.5 -vframes 1 -q:v 3 assets/hero-brand-poster.jpg
```

- [ ] **Step 6: Verify the poster frame exists and looks right**

```bash
ls -la assets/hero-brand-poster.jpg
```

Expected: file exists, non-zero size (roughly 50-200KB for a 1280x720 JPEG at q:v 3). Read the file with the Read tool to visually confirm it shows the logo/wordmark clearly (not a black or blank frame — if it looks blank, re-run Step 5 with a different `-ss` value like `2.0`).

- [ ] **Step 7: Commit**

```bash
git add assets/hero-brand.mp4 assets/hero-brand-poster.jpg
git commit -m "$(cat <<'EOF'
Add compressed hero brand video and poster frame

Re-encoded from the DaVinci Resolve export: 1920x1080/11.5Mbps/with-audio
down to 1280x720/no-audio, for use as the hero background loop.
EOF
)"
```

---

### Task 2: Produce a transparent nav logo icon

**Files:**
- Create: `assets/nav-logo.png`

**Interfaces:**
- Produces: `assets/nav-logo.png` (transparent PNG, V-mark only), consumed by Task 3's nav markup.

- [ ] **Step 1: Key out the black background**

```bash
FF="../.vividex-ffmpeg-tools/node_modules/ffmpeg-static/ffmpeg.exe"
"$FF" -y -i "vividex logo 4.png" -vf "colorkey=0x000000:0.15:0.1" assets/nav-logo.png
```

- [ ] **Step 2: Verify transparency**

Use PowerShell to confirm the corners are now transparent (alpha 0) and the center still has color:

```powershell
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile("C:\GameForge\websites\Vividex\assets\nav-logo.png")
$corner = $img.GetPixel(2,2)
$center = $img.GetPixel([int]($img.Width/2), [int]($img.Height/2))
Write-Output "Corner alpha: $($corner.A) | Center alpha: $($center.A), RGB: $($center.R),$($center.G),$($center.B)"
$img.Dispose()
```

Expected: `Corner alpha: 0` and `Center alpha` close to 255 with a blue-ish RGB (high B, moderate G, low R). If the corner alpha isn't 0, increase the similarity value in Step 1 (e.g. `0.15` → `0.2`).

- [ ] **Step 3: Visually confirm**

Read `assets/nav-logo.png` with the Read tool. Expected: a clean blue/cyan V shape with no black square around it, no visible halo/fringe at the edges. If there's a dark fringe, re-run Step 1 with a higher `blend` value (the third `colorkey` parameter, e.g. `0.15:0.2`).

- [ ] **Step 4: Commit**

```bash
git add assets/nav-logo.png
git commit -m "Add transparent nav logo icon (V mark, keyed from black background)"
```

---

### Task 3: Add the logo icon to the nav bar

**Files:**
- Modify: `index.html:27` (`.nav-logo` anchor)
- Modify: `styles.css:59-62` (`.nav-logo` rule)

**Interfaces:**
- Consumes: `assets/nav-logo.png` from Task 2.

- [ ] **Step 1: Update the nav markup**

In `index.html`, replace:

```html
    <a class="nav-logo" href="#top">VIVIDEX</a>
```

with:

```html
    <a class="nav-logo" href="#top">
      <img class="nav-logo-mark" src="assets/nav-logo.png" alt="" width="28" height="24">
      VIVIDEX
    </a>
```

(`alt=""` because the adjacent "VIVIDEX" text already names the brand — the icon is purely decorative here.)

- [ ] **Step 2: Update the nav logo CSS**

In `styles.css`, replace:

```css
.nav-logo {
  font-family: var(--fd); font-size: 0.95rem; font-weight: 800;
  letter-spacing: 0.2em; color: var(--white); flex-shrink: 0;
}
```

with:

```css
.nav-logo {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--fd); font-size: 0.95rem; font-weight: 800;
  letter-spacing: 0.2em; color: var(--white); flex-shrink: 0;
}
.nav-logo-mark { width: 22px; height: auto; display: block; flex-shrink: 0; }
```

- [ ] **Step 3: Verify locally**

Start the local server (`powershell -File vividex-server.ps1`, serves on `http://localhost:8080/`) if it isn't already running. Use the Playwright MCP tools to navigate to `http://localhost:8080/`, take a screenshot of the nav bar, and confirm the V icon renders next to "VIVIDEX" with no layout shift or broken-image icon. Check `browser_console_messages` for any 404 on `assets/nav-logo.png`.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "Add logo mark to nav bar"
```

---

### Task 4: Restructure the hero — remove the sphere, add the video card

**Files:**
- Modify: `index.html:41-66` (`.hero` section)
- Modify: `styles.css:95-183` (`.hero` and related rules)

**Interfaces:**
- Consumes: `assets/hero-brand.mp4`, `assets/hero-brand-poster.jpg` from Task 1.

- [ ] **Step 1: Replace the hero markup**

In `index.html`, replace the entire hero `<section>` (currently lines 41-66):

```html
    <section class="hero">
      <div class="hero-bg" aria-hidden="true">
        <div class="hb-sphere"></div>
        <div class="hb-ring"></div>
        <div class="hb-dots"></div>
      </div>
      <div class="hero-inner">
        <p class="hero-label">Web design &amp; software development &nbsp;·&nbsp; Australia</p>
        <h1 class="hero-h1">
          <span class="h1-line">Software that</span>
          <span class="h1-line h1-accent">moves your</span>
          <span class="h1-line">business forward.</span>
        </h1>
        <div class="hero-foot">
          <p class="hero-desc">Vividex designs and builds websites, web applications, and custom software for Australian small businesses and startups. From first conversation to live product.</p>
          <div class="hero-actions">
            <a class="btn-prim" href="#contact">Start a project</a>
            <a class="btn-ghost" href="#work">See our work</a>
          </div>
        </div>
      </div>
      <div class="hero-scroll-hint" aria-hidden="true">
        <span>Scroll</span>
        <div class="scroll-line"></div>
      </div>
    </section>
```

with:

```html
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-video-card" aria-hidden="true">
          <video autoplay muted loop playsinline poster="assets/hero-brand-poster.jpg">
            <source src="assets/hero-brand.mp4" type="video/mp4">
          </video>
        </div>
        <div class="hero-text">
          <p class="hero-label">Web design &amp; software development &nbsp;·&nbsp; Australia</p>
          <h1 class="hero-h1">
            <span class="h1-line">Software that</span>
            <span class="h1-line h1-accent">moves your</span>
            <span class="h1-line">business forward.</span>
          </h1>
          <div class="hero-foot">
            <p class="hero-desc">Vividex designs and builds websites, web applications, and custom software for Australian small businesses and startups. From first conversation to live product.</p>
            <div class="hero-actions">
              <a class="btn-prim" href="#contact">Start a project</a>
              <a class="btn-ghost" href="#work">See our work</a>
            </div>
          </div>
        </div>
      </div>
      <div class="hero-scroll-hint" aria-hidden="true">
        <span>Scroll</span>
        <div class="scroll-line"></div>
      </div>
    </section>
```

Note the video card is first in the DOM (so it's first on mobile, where the layout stays a plain single-column stack), and CSS `grid-template-areas` reorders it to the right on desktop — see Step 2.

- [ ] **Step 2: Remove the sphere CSS and the old `.hero-inner` rule**

In `styles.css`, the `.hero {` rule itself (position/min-height/flex/padding/overflow) is unchanged — leave it as-is. Delete only the block that runs from `.hero-bg {` through the old `.hero-inner { ... max-width: 900px; }` rule (currently lines 102-142, immediately after `.hero {}` and immediately before `.hero-label {`):

```css
.hero-bg {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
}
.hb-sphere {
  position: absolute; top: -10%; right: -5%;
  width: clamp(360px, 45vw, 680px); height: clamp(360px, 45vw, 680px);
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 32%, rgba(0,217,255,0.55) 0%, transparent 48%),
    radial-gradient(circle at 68% 72%, rgba(0,92,255,0.6) 0%, transparent 52%),
    radial-gradient(circle at 50% 50%, #05111e 0%, #020508 100%);
  box-shadow: 0 0 160px rgba(0,217,255,0.18), inset 0 0 100px rgba(0,92,255,0.3);
  animation: sphere-float 8s ease-in-out infinite;
}
@keyframes sphere-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-16px, 20px) scale(1.02); }
  66% { transform: translate(20px, -14px) scale(0.98); }
}
.hb-ring {
  position: absolute; top: 5%; right: 10%;
  width: clamp(260px, 32vw, 480px); height: clamp(260px, 32vw, 480px);
  border-radius: 50%;
  border: 1px solid rgba(0,217,255,0.12);
  animation: ring-spin 40s linear infinite;
}
.hb-ring::before {
  content: ''; position: absolute; inset: 20px;
  border-radius: 50%; border: 1px solid rgba(0,92,255,0.1);
}
@keyframes ring-spin { to { transform: rotate(360deg); } }
.hb-dots {
  position: absolute; inset: 0;
  background-image: radial-gradient(circle, rgba(0,217,255,0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 80% at 60% 30%, black 0%, transparent 70%);
}
.hero-inner {
  position: relative; z-index: 1;
  max-width: 900px;
}
```

Replace that whole deleted block with:

```css
.hero-inner {
  position: relative; z-index: 1;
  display: grid;
  grid-template-areas: "video" "text";
  grid-template-columns: 1fr;
  gap: 40px;
  align-items: center;
}
.hero-video-card {
  grid-area: video;
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #030508;
  box-shadow:
    0 0 0 1px rgba(0,217,255,0.06),
    0 20px 60px rgba(0,20,40,0.5),
    0 0 120px rgba(0,92,255,0.12);
}
.hero-video-card video {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}
@media (prefers-reduced-motion: reduce) {
  .hero-video-card video { display: none; }
  .hero-video-card {
    background-image: url('assets/hero-brand-poster.jpg');
    background-size: cover;
    background-position: center;
  }
}
.hero-text { grid-area: text; }
```

Everything from `.hero-label {` through `@keyframes scroll-pulse { ... }` (currently lines 143-182) is unchanged — do not touch those lines.

- [ ] **Step 3: Add the desktop two-column breakpoint**

In `styles.css`, immediately after `@keyframes scroll-pulse { 0%,100%{opacity:0.4;transform:scaleY(1)} 50%{opacity:1;transform:scaleY(1.2)} }` and before the `/* ══ TICKER ══ */` comment, insert this new block (pure addition, nothing around it changes):

```css

@media (min-width: 961px) {
  .hero-inner {
    grid-template-areas: "text video";
    grid-template-columns: 1fr minmax(320px, 560px);
    gap: 56px;
  }
  .hero-video-card { justify-self: end; }
}
```

This pairs with the existing `@media (max-width: 960px)` rule further down (which already collapses `.hero-foot` to one column and hides the scroll hint) — mobile gets this file's default single-column `.hero-inner`, desktop gets the two-column override. Nothing in the existing `max-width: 960px` block needs to change.

- [ ] **Step 4: Verify no leftover references**

```bash
grep -n "hb-sphere\|hb-ring\|hb-dots\|hero-bg\|sphere-float\|ring-spin" index.html styles.css
```

Expected: no output (all removed).

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css
git commit -m "$(cat <<'EOF'
Replace hero sphere animation with brand video

Removes the placeholder .hb-sphere/.hb-ring/.hb-dots CSS animation and
restructures the hero into a two-column layout: headline/copy on the
left, the looping brand video in a framed card on the right (stacked
above the headline on mobile).
EOF
)"
```

---

### Task 5: Visual verification across viewports

**Files:** none (verification only).

- [ ] **Step 1: Start the local server**

```bash
powershell -File vividex-server.ps1
```

Leave it running in the background (or run in a separate terminal); it serves `http://localhost:8080/`.

- [ ] **Step 2: Desktop screenshot**

Use the Playwright MCP tools: `browser_navigate` to `http://localhost:8080/`, `browser_resize` to `1440x900`, wait briefly for the video to start, then `browser_take_screenshot`.

Expected: headline text on the left, the video card visible and playing on the right roughly where the old sphere used to sit, no visual overlap between the headline and the card, nav shows the V icon + "VIVIDEX".

- [ ] **Step 3: Mobile screenshot**

`browser_resize` to `390x844`, `browser_take_screenshot`.

Expected: video card full-width at the top of the hero, headline/copy stacked below it, no horizontal scrollbar, nav still shows the icon (nav links are already hidden below 960px by the existing rule).

- [ ] **Step 4: Console check**

`browser_console_messages` — expected: no errors, specifically no 404s for `assets/hero-brand.mp4`, `assets/hero-brand-poster.jpg`, or `assets/nav-logo.png`.

- [ ] **Step 5: Reduced-motion check**

Use `browser_evaluate` (or re-navigate with `prefers-reduced-motion` emulation if the Playwright tool supports it) to confirm that with `prefers-reduced-motion: reduce`, the `<video>` element is hidden and the poster image shows in its place via the card's `background-image`.

- [ ] **Step 6: Fix forward, not backward**

If anything looks wrong (card too large/small, video cropped oddly, overlap with the scroll hint), adjust the relevant rule in `styles.css` from Task 4 directly and re-screenshot — don't reintroduce the old sphere. Commit any fix as its own small commit, e.g.:

```bash
git add styles.css
git commit -m "Tune hero video card sizing after visual check"
```

---

## Self-Review Notes

- **Spec coverage:** asset pipeline (Task 1, 2) ✓; two-column hero layout with uncropped 16:9 video, glow/border card, aria-hidden ✓ (Task 4); mobile stacks video above headline at the existing 960px breakpoint ✓ (Task 4 Step 2/3); nav gets the transparent V icon next to existing text ✓ (Task 3); reduced-motion fallback ✓ (Task 4 Step 2, verified in Task 5 Step 5). Out-of-scope items (other pages, other logo assets, palette/typography) are untouched by every task.
- **Type/name consistency:** `assets/hero-brand.mp4` / `assets/hero-brand-poster.jpg` / `assets/nav-logo.png` are the same three filenames from Task 1/2 through their consumers in Task 3/4 — checked for drift.
- **No placeholders:** every step has literal commands or literal HTML/CSS, no "similar to above" or "add appropriate styling" left in.
