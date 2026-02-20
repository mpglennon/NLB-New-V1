# Opus Directive: NLB Cash Mobile & Polish Pass

**Mission:** Make NLBCash mobile-ready (PWA) and polish for launch.
**Constraint:** NO REBUILD. Responsive CSS edits only.

---

## 1. Mobile CSS Fixes (Critical)

**Problem:** Desktop-first layout breaks on small screens.

**Tasks:**
1.  **KPI Cards Grid:**
    *   Current: `grid-template-columns: repeat(4, 1fr)`
    *   Mobile: Change to `repeat(1, 1fr)` (stack) or `repeat(2, 1fr)` (2x2 grid).
    *   Use `@media (max-width: 768px)`.
2.  **Header Wrap:**
    *   Ensure logo and buttons wrap gracefully or stack vertically on mobile.
    *   Adjust padding for touch targets (44px min).
3.  **Chart Height:**
    *   Ensure chart container handles aspect ratio changes (don't force `350px` height if it pushes content off-screen on phones).

## 2. PWA Implementation (The "App" Feel)

**Goal:** Installable on iOS/Android home screen.

**Tasks:**
1.  **Manifest:** Create `public/manifest.json`.
    *   Name: "NLB Cash"
    *   Theme Color: Dark Navy (`#0a0b14` or match `var(--bg-page)`)
    *   Icons: Add standard icon sizes (192, 512).
2.  **Meta Tags:** Add viewport/theme-color tags to `index.html` to prevent Safari UI bars from clashing.
3.  **Vite PWA Plugin (Optional):** If easy, add `vite-plugin-pwa` for offline caching. If hard, skip for v1.

## 3. Launch Polish (Consensus Tweaks)

**Tasks:**
1.  **Default View:** Change `timeframe` default from `90` to `30`. (Aligns with "30/30 Method").
2.  **Trust Signal:** Add a small footer text: *"Data stored locally on your device. Zero external access."*
3.  **Runway Prominence:** On the Dashboard, ensure the "Days of Runway" (e.g. "90 Days") is visually distinct/larger if possible. (Time > Money).

---

**Execution Mode:**
*   Focus on `App.css` (or `styles` object) and `index.html`.
*   Do not rewrite logic components.
*   Test mobile view by shrinking browser window.
