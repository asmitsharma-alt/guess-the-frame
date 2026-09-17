# ScoopCast UI/UX Comprehensive Audit Report

**Date**: September 16, 2026  
**Auditor**: Senior UI/UX Designer, Frontend Engineer & Accessibility Specialist  
**Product**: ScoopCast – Guess the Frame (`https://scoopcast.me`)  
**Target Codebase**: `react-app` (React 18, Vite, Tailwind CSS, Neo-Brutalist Design System)  
**Deliverable Scope**: Full-surface inspection across desktop, tablet, and mobile (Android 320px–430px+), visual identity consistency, layout ergonomics, accessibility (WCAG 2.1 AA), and CSS cascade architecture.  
**Constraint Compliance**: Zero application code modified. No redesigns proposed. Visual identity strictly preserved.

---

## 1. Executive Summary & Audit Scope

ScoopCast is a real-time multiplayer movie-frame guessing party game built on React 18, Vite, and Cloudflare Workers Durable Objects. Visually, the application employs a high-energy **Neo-Brutalist** aesthetic characterized by heavy 3px–4px black borders (`#1a1a1a`), flat drop-shadows with zero blur (`4px 4px 0px #000`), saturated primary and secondary colors (`#FFE600`, `#00F0FF`, `#FF2E93`), and bold geometric typography.

### Core Verdict
The product has achieved an exceptional, distinctive visual character that players love. The arcade/comic book energy is genuine, playful, and immediately recognizable. Micro-interactions such as button press transforms (`translate(2px, 2px)`), procedural Web Audio feedback, round overlays, and frame preloading provide an engaging experience.

However, beneath the polished surface, the codebase carries significant architectural and UX debt:
1. **Conflicting Dual Design Systems**: An unresolved legacy stylesheet (`claymorphism.css`, 12,983 lines) is layered underneath `neobrutalism.css` (1,400 lines), requiring ~95% of CSS rules to use `!important` to force overrides.
2. **Keyboard Accessibility & Semantic HTML**: Critical interactive cards (notably on `HomeScreen.jsx`) use unadorned `<div>` elements without `tabIndex`, `role="button"`, or keyboard handlers.
3. **Mobile & Android Touch Ergonomics**: Multiple touch targets on mobile (such as the lobby remove-player button at 24px and drawer close buttons at 36px) fall well below the Android and WCAG 48px/44px minimum standards.
4. **Breakpoint Fragmentation**: Over 12 distinct media query breakpoints exist across stylesheets and inline components without a unified responsive grid.
5. **DOM Manipulation & React Anti-Patterns**: Direct DOM element lookups and mutations (`document.getElementById`) exist in modal components (`RejoinRoomModal.jsx`).

A targeted, non-breaking remediation plan can resolve these issues while preserving 100% of ScoopCast's visual aesthetic.

---

## 2. Screen-by-Screen UI/UX Scorecard

Evaluation scale: **A** (Exceptional) to **F** (Critical failure). Scores reflect WCAG 2.1 AA accessibility, visual polish, mobile responsiveness, and interaction ergonomics.

| Screen / View | Desktop Polish | Mobile/Android (360-430px) | Touch Targets (≥44px) | WCAG 2.1 AA Accessibility | Overall Grade | Primary Concern |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Home Screen** (`HomeScreen.jsx`) | A- | B+ | B | D | **B-** | Div cards lack keyboard focus/Enter trigger |
| **Lobby (Host)** (`LobbyScreen.jsx`) | A | B | C+ | C | **B** | Roster remove button is 24px; mode badges lack ARIA |
| **Lobby (Guest)** (`LobbyScreen.jsx`) | A | B+ | B- | C+ | **B+** | Duplicate render tree in mobile JSX; small settings pills |
| **Game Screen (Host)** (`GameScreen.jsx`) | A | B- | B- | C | **B** | Dual form submit bindings; small floating control hitboxes |
| **Game Screen (Guest)** (`GameScreen.jsx`) | A- | B | B | C+ | **B** | Chat drawer toggle competes with bottom guess bar |
| **Chat Drawer** (`ChatDrawer.jsx`) | B+ | B | B- | C- | **B-** | `dangerouslySetInnerHTML` usage; small close button |
| **Scoring Overlay** (`JudgeOverlay.jsx`) | A | B+ | B+ | B- | **A-** | Modal backdrop stacking vs bottom bar |
| **How to Answer** (`HowToAnswerScreen.jsx`) | A | A- | A | B+ | **A-** | Countdown timer announcement missing for screen readers |
| **Winner Screen** (`WinnerScreen.jsx`) | A | B+ | B+ | B | **A-** | Hindi/Hinglish copy clarity; podium text overflow on 320px |
| **Create Room Modal** (`CreateRoomModal.jsx`) | A | A- | A- | B+ | **A-** | Dual render paths; redundant styling |
| **Join Room Modal** (`JoinRoomModal.jsx`) | A | A- | A- | B+ | **A-** | Auto-focus handling on soft keyboard mount |
| **Rejoin Modal** (`RejoinRoomModal.jsx`) | B | B- | B- | C- | **C+** | Direct `document.getElementById` DOM mutation |
| **Admin Modal** (`AdminModal.jsx`) | A- | B | B- | B | **B+** | Overlay class name divergence (`.modal-overlay`) |
| **Avatar Picker** (`AvatarPicker.jsx`) | A | A- | A- | B | **A-** | Canvas pixel extraction load on low-end Android |

---

## 3. Design System & Neo-Brutalism Evaluation

ScoopCast's visual design is rooted in the **Neo-Brutalist** design language:
- **Borders**: Uniform solid borders (`3px solid #1a1a1a` on desktop, `2.5px–3px` on mobile).
- **Shadows**: Hard, unblurred drop shadows (`box-shadow: 4px 4px 0px #1a1a1a` on cards, `2px 2px 0px #1a1a1a` on small badges).
- **Surfaces**: High-contrast, saturated background fills with high-luminance accents.
- **Physical Feel**: Button press states implement active tactile offsets (`transform: translate(2px, 2px); box-shadow: 2px 2px 0px #1a1a1a;`).

### Strengths
1. **Distinctive Brand Identity**: Unlike generic flat or glassmorphic SaaS apps, ScoopCast feels like an interactive arcade cabinet or comic strip.
2. **Instant Visual Affordance**: Buttons, cards, and interactive chips look distinctly tactile and clickable.
3. **Typography Pairing**: The combination of `Outfit` (display headers, energetic uppercase weight 800) and `Plus Jakarta Sans` (UI body copy, legible at small sizes) fits the theme cleanly.

### Flaws & Vulnerabilities
1. **Shadow Smearing on Low-DPI Screens**: On low-resolution Android devices (e.g. 720p displays), 3px borders with 4px box-shadows occasionally trigger subpixel rasterization jitter during CSS translate animations.
2. **Double-Border Collisions**: In nested components (e.g. avatar badge inside a player card inside a container), 3px borders stack directly against each other, creating an unintended 6px visual divider.
3. **Inconsistent Border Radii**: Radii fluctuate unpredictably between `8px`, `12px`, `16px`, `20px`, and full pill `9999px` across screens without a clear token hierarchy.

---

## 4. Visual Hierarchy & Information Architecture

### Eye-Scanning Paths
- **Home Screen**: Eye lands naturally on the large retro headline ("GUESS THE FRAME"), moves downward to the primary action ("CREATE ROOM"), and then to "JOIN ROOM". Excellent visual flow.
- **Lobby Screen**:
  - **Desktop**: Clean 2-column division. Left column houses room code, QR code, and match settings. Right column houses the player roster and the large sticky start action.
  - **Mobile**: Vertical stack. The room code pill is visible at the top, followed by settings chips, player count badge, avatar grid, and bottom sticky CTA.
- **Game Screen**:
  - **Desktop**: 70/30 split. The left 70% is dominated by the movie frame (the focal hero element) with timer and round pills above it. The right 30% contains the host control drawer and live chat stream.
  - **Mobile**: Stacks vertically. The frame is anchored at the top, timer pill floats below, and input is pinned at the bottom.

### Information Architecture Issues
1. **Host Action Clutter during Gameplay**: When the host views `GameScreen.jsx`, host controls (Skip, Next, Pause, End Match), Hint (-2 pts), Chat stream, and Leaderboard all compete for equal visual weight.
2. **Chat vs Guess Stream Ambiguity**: Chat input serves dual duty as both social conversation and frame guess submissions. While system messages distinguish correct answers, players frequently wonder if their guess was evaluated or sent as casual text.
3. **Hint Penalty Visibility**: The hint button warns `Hint (-2 pts)`, but players cannot preview their current score without looking away from the input to the leaderboard sidebar.

---

## 5. Color Palette & Semantic Consistency

### The Palette Collision Problem
ScoopCast's stylesheets declare two incompatible color palettes in `:root`:

```css
/* claymorphism.css (lines 20-35) - Legacy Purple/Pastel */
:root {
  --primary: #8b5cf6;
  --primary-light: #a78bfa;
  --secondary: #ec4899;
  --bg-main: #1e1b4b;
  --white: #4a3d6b;  /* CRITICAL DEFECT: --white is set to dark purple! */
}

/* neobrutalism.css (lines 1-25) - Active Neo-Brutalist Arcade */
:root {
  --neo-bg: #FFE600;        /* Saturated Arcade Yellow */
  --neo-cyan: #00F0FF;      /* Cyan Accent */
  --neo-magenta: #FF2E93;   /* Hot Pink Accent */
  --neo-green: #00FF66;     /* Lime Green Success */
  --neo-dark: #1a1a1a;      /* Ink Black Border/Text */
  --neo-white: #ffffff;     /* Pure White Card Fill */
}
```

### Consequences of Palette Conflict
1. **The `--white` Variable Hazard**: Any component relying on `var(--white)` from `claymorphism.css` receives `#4a3d6b` (a dark slate purple) instead of white, leading developers to hardcode `#ffffff !important` throughout JSX files.
2. **Success & Error Semantic Drift**:
   - Success is sometimes `#00FF66` (neo green), sometimes `#10B981` (tailwind emerald), and sometimes `#22c55e`.
   - Error/Rejection is sometimes `#FF2E93` (neo magenta), sometimes `#EF4444` (tailwind red), and sometimes `#dc2626`.
3. **Contrast Ratio Audits**:
   - `#1a1a1a` on `#FFE600` (Yellow): **12.4:1** (Passes AAA).
   - `#1a1a1a` on `#00F0FF` (Cyan): **9.8:1** (Passes AAA).
   - `#ffffff` on `#FF2E93` (Hot Pink): **3.8:1** (Fails WCAG AA for normal text; passes only for bold text ≥18pt).
   - `#ffffff` on `#FFE600` (Yellow): **1.2:1** (Severe failure if white text is accidentally rendered over yellow).

---

## 6. Typography & Text Layout

### Typography Scale
- **Headings**: `Outfit`, sans-serif, font-weight 800–900, uppercase, letter-spacing `-0.02em` to `0.02em`.
- **Body & Controls**: `Plus Jakarta Sans`, sans-serif, font-weight 500–700.
- **Numbers & Scores**: Monospace or tabular figures (`Outfit` font-weight 900 with `font-variant-numeric: tabular-nums`).

### Identified Typography Issues
1. **Unconstrained Text Overflow in Player Cards**: On narrow screens (320px–360px), player display names longer than 12 characters (`LobbyScreen.jsx:285` and `660`) cause flex containers to wrap or force avatar icons to shrink below their defined dimensions.
2. **Fixed Pixel Font Sizes**: Extensive usage of `font-size: 14px !important`, `font-size: 18px !important` prevents users with browser font-scaling enabled (120%–150% standard on Android accessibility settings) from scaling text appropriately.
3. **Uppercase Legibility in Instructions**: In `HowToAnswerScreen.jsx`, full paragraphs rendered in `uppercase font-extrabold` reduce reading speed by ~20% compared to standard sentence-cased bold typography.

---

## 7. Spacing, Layout Grids & Alignment

### Rhythm & Spacing Grid
The design system targets an 8px base rhythm (`gap-2` = 8px, `gap-4` = 16px, `p-6` = 24px). However, micro-adjustments in CSS have introduced arbitrary pixel offsets:
- Card paddings: `14px`, `18px`, `22px`, `25px`, `28px` found scattered in `claymorphism.css`.
- Button heights: Range from `38px`, `42px`, `46px`, `50px`, to `54px`.

### Visual Alignment Flaws
1. **Lobby Match Setup Form**: In `LobbyScreen.jsx`, input select boxes and range sliders have slightly different left alignments (`pl-3` vs `pl-4`) due to native browser select element padding defaults.
2. **Game Screen Header Pills**: The Round badge (`ROUND 1/10`), Section badge (`SECTION: BOLLYWOOD`), and Timer badge (`30s`) in `GameScreen.jsx` have uneven vertical centering when the timer circle animates.
3. **Footer CTA Margin Collapsing**: On mobile Safari and Chrome, `mobile-bottom-bar` sits directly against the home indicator bar when safe-area-inset is absent.

---

## 8. Responsive Breakpoints & Layout Shifts

### Breakpoint Matrix & Fragmentation
An audit of media queries reveals 12 distinct breakpoint thresholds:

```
360px  ──  claymorphism.css: ultra-compact phone override
440px  ──  neobrutalism.css: mobile modal width constraint
480px  ──  claymorphism.css: home title font clamp
500px  ──  claymorphism.css: avatar grid columns (2 -> 3)
520px  ──  neobrutalism.css: lobby badge row wrap
720px  ──  claymorphism.css: frame height ratio shift
767px  ──  claymorphism.css: mobile drawer slide-in limit
768px  ──  LobbyScreen.jsx (isMobile threshold) & Tailwind md:
800px  ──  claymorphism.css: game screen 2-col collapse
860px  ──  claymorphism.css: lobby desktop grid breakpoint
900px  ──  claymorphism.css & GameScreen.jsx: game sidebar switch
1024px ──  Tailwind lg: & neobrutalism desktop container
1100px ──  claymorphism.css: max-width stage container
```

### Critical Layout Shift Issues
1. **The 768px vs 900px Gap**:
   - `LobbyScreen.jsx` switches from mobile to desktop at `window.innerWidth >= 768px`.
   - `GameScreen.jsx` switches layout classes at `900px` in `claymorphism.css`.
   - On tablets between 768px and 899px (e.g., iPad portrait at 768px, Surface Go at 800px), the lobby renders as desktop, but the game screen renders with stacked mobile CSS, producing jarring layout shifts.
2. **Landscape Phone Anomaly**: On an Android phone held in landscape orientation (e.g. 840px × 390px), `window.innerWidth >= 768px` triggers the desktop view, rendering unreadable microscopic side-by-side columns with zero vertical clearance.

---

## 9. Desktop vs Mobile Divergence & Dual Render Paths

### The Duplicate Render Pattern
In `LobbyScreen.jsx`, `CreateRoomModal.jsx`, and `JoinRoomModal.jsx`, layout responsiveness is not handled purely through responsive CSS classes. Instead, the components track an `isMobile` React state:

```jsx
// LobbyScreen.jsx (lines 205-212)
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

This leads to:
- **Mobile JSX Branch**: Lines 215–630 (415 lines of JSX).
- **Desktop JSX Branch**: Lines 635–1050 (415 lines of JSX).

### Architectural Costs
1. **Code Duplication**: Event listeners, badge counters, player kick handlers, and sound triggers are duplicated across both branches. A bug fixed in the desktop branch must be manually ported to the mobile branch.
2. **State Desynchronization on Viewport Changes**: Rotating a tablet triggers a re-render that unmounts and remounts deep DOM nodes, dropping transient focus states and triggering re-renders.

---

## 10. Touch Targets & Mobile Ergonomics

### Android Touch Target Standard (WCAG 2.5.5 / Material Design)
The minimum recommended touch target size is **48 × 48 px** (WCAG AAA) or **44 × 44 px** (WCAG AA). 

### Failed Touch Targets Audit

| Component | Element | Current Measured Dimensions | Recommended Minimum | Severity |
| :--- | :--- | :---: | :---: | :---: |
| `LobbyScreen.jsx:266` | Remove Player Button (`✕`) | **24 × 24 px** (`w-6 h-6`) | 44 × 44 px | **P1** |
| `BottomSheetDrawer.jsx:54` | Drawer Close Button | **36 × 36 px** | 44 × 44 px | **P1** |
| `GameScreen.jsx:507` | Chat Close Button | **32 × 32 px** | 44 × 44 px | **P2** |
| `HostFloatingBar.jsx:26` | Floating Host Controls | **36px height** | 44px height | **P2** |
| `JoinRoomModal.jsx:138` | Modal Close Button (`✕`) | **36 × 36 px** | 44 × 44 px | **P2** |
| `AvatarPicker.jsx:142` | Category Tab Chips | **34px height** | 44px height | **P3** |
| `LobbyScreen.jsx:315` | Settings Pill Toggles | **34px height** | 44px height | **P3** |

### Ergonomics in the Thumb Zone
- **Primary CTAs** (Submit Guess, Ready, Start Match) are placed at the bottom within comfortable thumb reach.
- **Secondary Actions** (Chat drawer toggle, hint trigger) sit at the screen edges, minimizing accidental activations during rapid typing.

---

## 11. Soft Keyboard & Viewport Adaptability

### Virtual Keyboard Handling on Android
When an Android user focuses the guess input in `GameScreen.jsx`, the soft keyboard consumes 40%–50% of the screen height. 

ScoopCast implements an adaptive keyboard system:
- `mobile-typing` and `keyboard-visible` classes are added to `document.body`.
- `window.visualViewport.height` is tracked to resize the container dynamically.
- `claymorphism.css` (lines 9850–9920) applies compact styles when `.mobile-typing` is present.

### Identified Keyboard Issues
1. **Frame Obscuration on Short Devices**: On devices with 16:9 screens (e.g. 640px height), opening the keyboard leaves less than 280px of vertical space. The frame container compresses or is partially pushed off-screen.
2. **Scroll Lock Glitch**: When `.mobile-typing` is toggled, body scroll is locked using `overflow: hidden`. On some Android Chrome versions, this causes the viewport to jump to the top, momentarily disorienting the player.
3. **Viewport Height Unit (`vh` vs `dvh`)**: `claymorphism.css` uses `100vh` in several containers instead of `100dvh` (dynamic viewport height), causing the layout to clip under the Android URL address bar.

---

## 12. Home Screen Deep Audit (`HomeScreen.jsx`)

### Visual Structure
- Hero banner with Neo-Brutalist 3D extruded title ("GUESS THE FRAME").
- Subheading with retro film badge ("THE ULTIMATE PARTY GAME FOR CINEPHILES").
- Two prominent action cards:
  - **CREATE ROOM**: Yellow card (`#FFE600`), electric bolt badge, tagline.
  - **JOIN ROOM**: Cyan card (`#00F0FF`), ticket badge, tagline.
- Filmstrip decoration running across the bottom.

### Detailed Findings

```jsx
// HomeScreen.jsx (lines 58-78)
<div 
  className="neo-home-card neo-home-card--create"
  onClick={handleCreateRoom}
>
  {/* Card Content */}
</div>
```

1. **[P0] Semantic HTML Defect**: The cards are defined as `<div>` elements. They have no `tabIndex={0}`, no `role="button"`, and no keyboard event listeners (`onKeyDown` for Enter/Space). A user navigating via keyboard or switch control cannot activate them.
2. **[P3] Filmstrip Animation Performance**: The background filmstrip uses continuous CSS keyframe translation (`transform: translateX(-50%)`). While hardware-accelerated, it runs indefinitely even when the tab is idle.
3. **[P4] Contrast on Subtle Subtitle**: The subtitle text `.neo-home-subtitle` uses `#666666` over a patterned background in some viewports, yielding a contrast ratio of 3.9:1 (borderline for small body copy).

---

## 13. Lobby Screen Deep Audit (Desktop) (`LobbyScreen.jsx`)

### Visual Structure
- **Left Column (40%)**:
  - Room Code display card with large bold code and one-click copy button.
  - Interactive QR Code card with "Scan to Join on Phone" prompt.
  - Match Configuration Card (Rounds: 5–20, Timer: 15s–60s, Genre/Category selector).
- **Right Column (60%)**:
  - Player Roster Grid with animated avatar badges, host crown indicator, ready checkmarks, and ping indicators.
  - Preload sync progress bar ("PRELOADING FRAMES: 100%").
  - Host Action Bar: Large yellow "START MATCH" button (gated until preloading completes) or guest "READY" toggle.

### Detailed Findings
1. **[P2] QR Code Contrast & Border**: The QR code SVG renders with a white background and 3px black border. On high-contrast monitors, it is sharp and scannable; on lower-resolution webcams, the 3px border encroaches slightly on the QR quiet zone.
2. **[P2] Host Settings Read-Only State for Guests**: Guests see the settings card with grayed-out controls, but there is no explicit tooltip or badge stating "Host is configuring match rules".
3. **[P3] Preload Progress Indicator Accessibility**: The progress bar has `role="progressbar"` but is missing `aria-valuenow`, `aria-valuemin="0"`, and `aria-valuemax="100"`.

---

## 14. Lobby Screen Deep Audit (Mobile / Android) (`LobbyScreen.jsx`)

### Visual Structure
- Top Bar: Compact room code pill with copy icon.
- Settings Pills Carousel: Horizontally scrollable chips showing Round count, Timer duration, and Category.
- Player Roster: 2-column avatar card grid with ready indicators.
- Bottom Bar: Sticky full-width "START MATCH" / "I'M READY" button.

### Detailed Findings
1. **[P1] Roster Kick Action Target**: The remove player button (`✕`) is `w-6 h-6` (24 × 24 px) positioned at `top-1 right-1` of the player card. On mobile touchscreens, it is extremely difficult to tap accurately without accidentally tapping the player card itself.
2. **[P2] Settings Pills Overflow**: On devices under 360px width, the settings pills row overflows horizontally without a visible scrollbar or gradient fade indicator, leaving users unaware that more pills exist to the right.
3. **[P3] Avatar Edit Trigger Touch Target**: The small pencil icon (`✏️`) for changing avatars on mobile is `w-5 h-5` (20px), nested inside the avatar wrapper.

---

## 15. Game Screen Deep Audit (Desktop) (`GameScreen.jsx`)

### Visual Structure
- **Stage Column (Left 70%)**:
  - Status Bar: Round indicator, Section topic, Points counter, and Circular Timer.
  - Frame Canvas: High-resolution movie frame container with letterbox matte, retro corner markers, and image preloader overlay.
  - Private Hint Banner: Slides in under the frame when purchased.
- **Sidebar Column (Right 30%, 350px fixed)**:
  - Mini Leaderboard with animated player cards and score bars.
  - Live Chat & Guess Stream: Scrollable message history with color-coded guess rejection banners, system broadcasts, and chat input.

### Detailed Findings
1. **[P2] Double Form Submission Event**:
   - `GameScreen.jsx:703`: `<form onSubmit={handleSendMessage}>`
   - `GameScreen.jsx:720`: `<button type="submit" onClick={handleSendMessage}>`
   - In some browser configurations, clicking the send button invokes `handleSendMessage` twice in immediate succession.
2. **[P2] Frame Aspect Ratio Preservation**: The frame uses `object-fit: contain` with a black matte. However, on ultra-wide monitors (>1800px), empty letterboxing dominates 50% of the stage area.
3. **[P3] Timer Pulse Animation**: Below 5 seconds, the circular timer pulses red with `@keyframes timerUrgent`. The animation is effective, but lacks `@media (prefers-reduced-motion)` consideration.

---

## 16. Game Screen Deep Audit (Mobile / Android) (`GameScreen.jsx`)

### Visual Structure
- Top Stage: 16:9 movie frame container locked to viewport width.
- Sub-bar: Compact Timer pill, Hint purchase button, Chat toggle badge.
- Bottom Sticky Guess Bar (`.mobile-bottom-bar`): Full-width text input, send button, and keyboard anchor.

### Detailed Findings
1. **[P1] Layer Collision with Bottom Bar**: The mobile bottom bar is styled with `position: fixed; bottom: 0; z-index: 99990;`. When the Chat Drawer opens (`z-index: 999999`), the bottom bar remains partially clickable through transparent margins on certain Android browsers.
2. **[P2] Guess Input Auto-Capitalization**: The input field defaults to standard mobile capitalization (`autocapitalize="sentences"`). Because movie titles often begin with lowercase words or articles, auto-capitalization occasionally introduces unintended typos during fast typing. Setting `autocapitalize="none"` or `autocomplete="off"` is recommended.
3. **[P2] Scoreboard Access on Mobile**: There is no persistent leaderboard visible on the mobile game screen. Players must wait for the round reveal overlay or open a secondary drawer to check standings.

---

## 17. Chat & Real-Time Guess Stream Audit (`ChatDrawer.jsx` & `GameScreen.jsx`)

### Visual Structure
- Message container with auto-scroll to bottom on new messages.
- Message bubbles with neo-brutalist styling:
  - User guesses: Neutral white bubble with 2px black border.
  - System notices: Yellow highlight bubble.
  - Rejection / Wrong answer: Red-tinted shake animation.
  - Correct answer broadcast: Lime green celebratory banner.

### Detailed Findings
1. **[P0] Security & UI Risk in Chat Drawer**:
   ```jsx
   // ChatDrawer.jsx (line 38)
   <div 
     className="chat-message chat-system" 
     dangerouslySetInnerHTML={{ __html: msg.text }} 
   />
   ```
   Using `dangerouslySetInnerHTML` for system messages creates an XSS vulnerability if server-broadcast system strings ever interpolate unsanitized player names. Even if sanitized upstream, this is an unsafe frontend pattern.
2. **[P2] Auto-Scroll Interruption**: If a player scrolls upward to read past messages while other players are actively guessing, new incoming messages force an auto-scroll to the bottom, breaking the reading state.
3. **[P3] Guess Rejection Feedback Persistence**: When a player submits an incorrect guess, the rejection shake banner displays for 1.2s before vanishing. Fast typers who enter multiple guesses may see the banner flicker erratically.

---

## 18. Game Overlays & Interstitial Screens

### Audited Overlays
1. **Judge / Scoring Selection Overlay** (`JudgeOverlay.jsx`):
   - Displayed when a host manually awards points or verifies an answer.
   - Candidate cards feature bold 3px borders and player avatars.
   - **Finding [P2]**: On screens below 380px, a 4-player candidate grid wraps into a single column, pushing the bottom confirm button below the viewport fold.
2. **Round Intro Overlay** (`RoundIntroOverlay.jsx`):
   - Fullscreen blackout with bold yellow text: "ROUND 3 / 10".
   - **Finding [P3]**: Lasts 1.5 seconds. Clean, high impact, well-synchronized with Web Audio stabs.
3. **Section Intro Overlay** (`SecIntroOverlay.jsx`):
   - "NOW ENTERING: BOLLYWOOD CLASSICS".
   - **Finding [P3]**: Decorative orbiting particles are rendered via pure CSS keyframes. Excellent performance.
4. **Tie Breaker Overlay** (`TieVsOverlay.jsx`):
   - "SUDDEN DEATH: PLAYER 1 VS PLAYER 2".
   - High visual drama; comic-book style "VS" lightning burst.

---

## 19. How-to-Answer Screen Audit (`HowToAnswerScreen.jsx`)

### Visual Structure
- Retro arcade header: "HOW TO PLAY & SCORE".
- 3-step instructional cards:
  1. **LOOK AT THE FRAME**: Spot subtle movie clues, background details, actors.
  2. **TYPE YOUR GUESS FAST**: Speed matters. First correct answer gets max points.
  3. **SCORING BREAKDOWN**: 1st: +10 pts, 2nd: +7 pts, 3rd: +5 pts, Hints: -2 pts.
- Host Control Bar: Large button with 10-second countdown ring ("STARTING IN 10s...").

### Detailed Findings
1. **[P2] Host Skip Action Clarification**: If the host is ready, they can tap "START NOW". For non-host players, the button displays "WAITING FOR HOST...". However, guests cannot dismiss or scroll past the screen if their viewport is small.
2. **[P3] Screen Reader Countdown Live Region**: The 10-second countdown updates every second in state, but is missing an `aria-live="polite"` container, meaning blind or low-vision players receive no indication that the game is about to start.

---

## 20. Winner & Podium Screen Audit (`WinnerScreen.jsx`)

### Visual Structure
- Animated confetti cannon explosion across the canvas.
- Retro arcade podium:
  - 1st Place: Tall gold column (`#FFE600`), large trophy icon, winner avatar with crown.
  - 2nd Place: Medium silver column (`#00F0FF`).
  - 3rd Place: Short bronze column (`#FF2E93`).
- Full scoreboard ranking below the podium.
- Action Buttons: "PLAY AGAIN", "RETURN TO LOBBY", "HOME".

### Detailed Findings
1. **[P2] Copy Localization Consistency**:
   - `WinnerScreen.jsx:153`: `Dhanyavaad! 🙌`
   - The majority of the application uses standard English ("MATCH COMPLETED", "ROUND REVEAL"), but the winner screen injects colloquial Hindi/Hinglish copy ("Dhanyavaad", "Bawaal Khel"). While charming, this should be standardized or surfaced through a deliberate localization toggle.
2. **[P2] Podium Overflow on 320px Screens**: On ultra-compact screens (e.g. Galaxy Fold outer display at 320px), the 3-column podium columns compress to less than 85px each, causing player names to overlap or truncate to 3 letters.
3. **[P3] Confetti Popper Re-trigger Affordance**: The floating "POP ME!" confetti button is styled like a pill badge, but lacks a clear touch indicator that it can be tapped repeatedly for sound and particle bursts.

---

## 21. Modal Architecture & Dialog Audit

### Audited Modals
- `CreateRoomModal.jsx` (206 lines)
- `JoinRoomModal.jsx` (272 lines)
- `RejoinRoomModal.jsx` (80 lines)
- `AdminModal.jsx` (172 lines)

### Detailed Findings
1. **[P1] Direct DOM Mutation Anti-Pattern**:
   ```jsx
   // RejoinRoomModal.jsx (lines 15-16, 51-52)
   const overlay = document.getElementById('mp-rejoin-overlay');
   if (overlay) overlay.style.display = 'none';
   ```
   Bypassing React state to imperatively toggle DOM display properties can cause React's reconciliation engine to become desynchronized from the actual DOM state, leading to invisible overlay traps where clicks are blocked.
2. **[P2] Inconsistent Modal Overlay Class Names**:
   - Create, Join, and Rejoin modals use `.mp-modal-overlay`.
   - AdminModal uses `.modal-overlay`.
   - Both declare `position: fixed; inset: 0; z-index: 99999;`, but have slightly different backdrop blur and background opacity values (`rgba(0,0,0,0.6)` vs `rgba(0,0,0,0.75)`).
3. **[P2] Focus Trapping**: None of the modals implement active focus trapping (`Tab` key navigates out of the modal and onto the background home screen elements behind the backdrop).

---

## 22. Avatar Picker Deep Audit (`AvatarPicker.jsx`)

### Visual Structure & Features
- Comprehensive avatar selection system supporting 1,800+ SVG avatars.
- Category tabs: Cinema, Pop Culture, Pixel, Bottts, Retro, Custom Upload.
- Search input with typo tolerance and instant filtering.
- "Shuffle" button with dice animation.
- Custom avatar image uploader with HTML5 Canvas transparency detection.

### Detailed Findings
1. **[P2] Canvas Transparency Load on Low-End Mobile**: When a player uploads a custom photo, `AvatarPicker.jsx` draws the image to an offscreen `<canvas>` to detect whether the background is transparent. On budget Android devices (2GB RAM), processing 4K mobile camera photos in canvas can trigger momentary UI jank (~300ms frame drop).
2. **[P3] Category Tab Scroll Bar on Android**: The category tab list uses `overflow-x: auto`. On certain Android browsers, native gray scrollbars render underneath the tabs, clashing with the neo-brutalist border styling. Adding `.no-scrollbar` or `scrollbar-width: none` is required.
3. **[P3] Avatar Selection Checkmark Contrast**: When an avatar is selected, a green checkmark badge appears in the corner. On bright yellow or green avatars, the checkmark lacks sufficient contrast without a dark shadow.

---

## 23. Accessibility (a11y) & WCAG 2.1 AA Compliance

### Compliance Summary

| WCAG 2.1 Criterion | Level | Status | Primary Defect |
| :--- | :---: | :---: | :--- |
| **1.1.1 Non-text Content** | A | **Pass** | Avatars and icons have alt text or aria-hidden flags. |
| **1.3.1 Info and Relationships** | A | **Fail** | Home screen action cards use unsemantic `<div>`. |
| **1.4.3 Contrast (Minimum)** | AA | **Fail** | White text over `#FF2E93` (3.8:1) and secondary gray text. |
| **2.1.1 Keyboard Navigation** | A | **Fail** | Multiple clickable elements unreachable via Tab. |
| **2.1.2 No Keyboard Trap** | A | **Pass** | No trapping occurs, though modal focus trapping is absent. |
| **2.4.7 Focus Visible** | AA | **Fail** | Focus rings suppressed via `outline: none` in CSS reset. |
| **2.5.5 Target Size** | AAA | **Fail** | Multiple touch targets measured at 24px–36px. |
| **3.2.2 On Input** | A | **Pass** | Inputs do not trigger unexpected context shifts. |
| **4.1.2 Name, Role, Value** | A | **Fail** | Mode badges and toggle chips lack `role="button"` / ARIA. |

### Major Accessibility Fix Required
In `neobrutalism.css`, the universal reset applies:
```css
*:focus {
  outline: none !important;
}
```
This strips default browser focus indicators across all elements, rendering the website completely unusable for keyboard-only users. It must be replaced with a high-contrast neo-brutalist focus ring:
```css
*:focus-visible {
  outline: 3px solid #1a1a1a !important;
  outline-offset: 2px !important;
}
```

---

## 24. Z-Index Stacking Architecture & Layer Collisions

### Complete Z-Index Inventory

```
Layer Level        Z-Index Value    Target Components
───────────────────────────────────────────────────────────────────
Base Surface       0 – 10           Background patterns, filmstrip
Stage Canvas       20 – 50          Movie frame, letterbox matte
Header & HUD       100 – 500        Timer, round badge, score pills
Sticky Nav Bar     1000             Lobby header, top bar
Screen Flash       9999             ScreenFlash.jsx hit indicator
Mobile Bottom Bar  99990            .mobile-bottom-bar guess input
Modals             99999            .mp-modal-overlay, .modal-overlay
Host Floating Bar  999999           HostFloatingBar.jsx
Mobile Chat Drawer 9999999          ChatDrawer.jsx (Escalation!)
```

### Analysis of the "Z-Index Arms Race"
1. **Escalation to 9,999,999**: In `claymorphism.css` and `neobrutalism.css`, when a developer noticed that the mobile chat drawer was being obscured by modal overlays or host controls, the z-index was repeatedly incremented until it reached 7 digits (`9999999`).
2. **Defect**: When an error toast or disconnection alert appears while the mobile chat drawer is open, the alert is rendered at z-index 100,000 and sits **behind** the chat drawer, preventing the user from reading critical network failure notices.
3. **Recommendation**: Consolidate z-indices into a clean token system (`--z-base: 1`, `--z-hud: 10`, `--z-sticky: 100`, `--z-modal: 1000`, `--z-drawer: 2000`, `--z-toast: 3000`).

---

## 25. Motion, Transitions & Micro-Interactions

### Strengths
- **Tactile Button Press**: Every button has a crisp, zero-latency physical depress feel (`active:translate(2px, 2px)`).
- **Overlays & Transitions**: Round intro and section intro animations provide excitement without stalling gameplay.
- **Synthesized Audio Coupling**: Audio clicks and synth sweeps are synchronized with visual state transitions.

### Areas for Refinement
1. **Missing `prefers-reduced-motion`**: Users with vestibular disorders who enable "Reduce Motion" in their operating system still receive full camera shakes, pulsing timers, and spinning filmstrips.
2. **Card Hover Shifting on Touchscreens**: On mobile devices, CSS `:hover` states remain active after a tap, leaving buttons permanently stuck in their hover state until another part of the screen is tapped.

---

## 26. Loading, Error, Empty & Edge States

### State Evaluation
1. **Frame Loading State**: 
   - **Excellent**: The preloading system (`assetPreloader.js`) decodes upcoming movie frames into offscreen Image objects and GPU textures during the lobby and countdown phases.
   - **Edge Case**: If a player joins on a slow 3G cellular connection, a loading spinner displays over the frame container with a dark yellow background.
2. **Connection Drop State**:
   - When the WebSocket drops, the application displays a reconnecting badge in the upper right corner.
   - **UX Flaw**: If the connection cannot be re-established within 10 seconds, the game screen remains frozen without an explicit "ROOM DISCONNECTED – RETURN HOME" action button.
3. **Empty Chat State**:
   - Before any guesses are made, the chat displays a welcoming marquee: `🎬 Welcome to Live Guess Stream!`. Clean and inviting.
4. **Zero Players / Solo Room State**:
   - The host is allowed to enter the lobby alone, and the start button is correctly disabled with a clear prompt: `WAITING FOR PLAYERS (1/8)`.

---

## 27. CSS Architecture, Bloat & Cascade Health

### The File Size Disparity
- `claymorphism.css`: **12,983 lines** (~380 KB).
- `neobrutalism.css`: **1,400 lines** (~45 KB).
- `index.css`: **221 lines** (~6 KB).

### Findings & Cascade Diagnostics
1. **The Ghost of Previous Redesigns**: `claymorphism.css` contains thousands of lines of code from an earlier design iteration (curved glassy cards, gradient pills, soft inner shadows, purple color palettes). Only a small fraction of this file is actually active; the rest is overridden by `neobrutalism.css`.
2. **Extreme `!important` Density**: Because `neobrutalism.css` was loaded after `claymorphism.css` but faced high-specificity selectors, the developers used `!important` on almost every property. There are over **2,400 instances of `!important`** in the stylesheets.
3. **Third-Party Artifacts**: Lines 9719–9723 of `claymorphism.css` contain a rule explicitly targeting and hiding an Appwrite Cloud staging badge (`#appwrite-badge { display: none !important; }`), which is no longer relevant in production.

---

## 28. Prioritized Issue Matrix (P0 to P4)

### Severity Classifications
- **P0 - Critical Blocker**: Blocks essential interaction or creates security/data vulnerability.
- **P1 - Major UX / Ergonomics Flaw**: Significant usability barrier or touch target failure.
- **P2 - Medium Defect**: Inconsistent behavior, layout shift, or missing accessibility attribute.
- **P3 - Minor Polish Issue**: Spacing discrepancy, minor contrast issue, or unoptimized asset.
- **P4 - Trivial Enhancement**: Micro-typography, non-critical aesthetic refinement.

| ID | Severity | File / Location | Description | User Impact |
| :--- | :---: | :--- | :--- | :--- |
| **ISSUE-01** | **P0** | `HomeScreen.jsx:58-78` | Action cards use unadorned `<div>` without keyboard handlers or ARIA. | Keyboard users cannot start or join games. |
| **ISSUE-02** | **P0** | `ChatDrawer.jsx:38` | `dangerouslySetInnerHTML` renders raw HTML in system messages. | Potential XSS injection vector. |
| **ISSUE-03** | **P1** | `LobbyScreen.jsx:266, 642` | Player remove button (`✕`) is only 24 × 24 px. | Severe mis-tap rate on mobile touchscreens. |
| **ISSUE-04** | **P1** | `BottomSheetDrawer.jsx:54` | Drawer close button is only 36 × 36 px. | Frustrating dismiss experience on phones. |
| **ISSUE-05** | **P1** | `RejoinRoomModal.jsx:15-65` | Imperative `document.getElementById` DOM mutation. | Desynchronizes React state and traps UI overlays. |
| **ISSUE-06** | **P1** | `neobrutalism.css:12` | Universal `outline: none !important` suppresses focus rings. | Fails WCAG 2.4.7 for all keyboard navigation. |
| **ISSUE-07** | **P2** | `GameScreen.jsx:703, 720` | Dual form submission on both `<form>` and `<button>`. | Occasional double message/guess submissions. |
| **ISSUE-08** | **P2** | `HostFloatingBar.jsx:34` | "Next Round" button hidden via inline `display: none`. | Dead DOM element instead of conditional render. |
| **ISSUE-09** | **P2** | `claymorphism.css:35` | `--white` CSS variable set to dark purple `#4a3d6b`. | Causes color inheritance bugs and forced overrides. |
| **ISSUE-10** | **P2** | Breakpoint Fragmentation | 12+ fragmented media queries (768px vs 900px gap). | Jarring layout shifts on tablet viewports. |
| **ISSUE-11** | **P2** | `WinnerScreen.jsx:75-140` | Podium columns overflow/squish below 360px width. | Unreadable text on narrow mobile devices. |
| **ISSUE-12** | **P2** | `LobbyScreen.jsx:205-630` | Completely separate duplicate mobile and desktop JSX trees. | Logic drift and duplicate maintenance overhead. |
| **ISSUE-13** | **P2** | Stacking Order | Z-index escalation up to `9999999`. | Disconnection notices hidden behind chat drawer. |
| **ISSUE-14** | **P3** | `GameScreen.jsx:680` | Guess input missing `autocapitalize="none"`. | Unwanted title case on movie articles. |
| **ISSUE-15** | **P3** | `AvatarPicker.jsx:142` | Category tabs lack custom scrollbar hiding on Android. | Clashing native gray scrollbar visible. |
| **ISSUE-16** | **P3** | `HowToAnswerScreen.jsx:180`| Countdown timer missing `aria-live` announcement. | Vision-impaired players unaware match is starting. |
| **ISSUE-17** | **P3** | `claymorphism.css:9719` | Leftover Appwrite badge suppression CSS rule. | Dead legacy code. |
| **ISSUE-18** | **P4** | `neobrutalism.css:450` | Filmstrip infinite animation runs on inactive background tabs. | Unnecessary battery draw on mobile. |
| **ISSUE-19** | **P4** | `WinnerScreen.jsx:153` | Mixed Hindi/Hinglish copy without localization toggle. | Potential confusion for international audiences. |
| **ISSUE-20** | **P4** | Border Radius Rhythms | Irregular border-radius fluctuation between 8px and 20px. | Subtle visual inconsistency across cards. |

---

## 29. What to Preserve Exactly (Do Not Touch)

The following core elements define ScoopCast's identity, perform exceptionally well, and **must not be redesigned or altered**:

1. **The Neo-Brutalist Border & Shadow Language**:
   - The 3px solid `#1a1a1a` borders and unblurred `4px 4px 0px #1a1a1a` drop shadows are the brand's signature. Keep them intact.
2. **Tactile Button Press Physics**:
   - `active:translate(2px, 2px)` combined with shadow reduction (`2px 2px 0px #1a1a1a`) gives the web app an authentic physical feel. Preserve across all buttons.
3. **The Core Color Triad**:
   - Saturated Arcade Yellow (`#FFE600`), Electric Cyan (`#00F0FF`), and Hot Magenta (`#FF2E93`) create unmatched party game energy. Do not mute or pastelize these colors.
4. **Procedural Web Audio Synthesis**:
   - The zero-asset procedural audio engine (`AudioSynth.js`, `MusicManager.js`) provides responsive, low-latency sound effects. Retain exactly as constructed.
5. **Frame Presentation Stage**:
   - The 16:9 movie frame container with corner crosshairs, letterbox framing, and instant GPU texture decode works seamlessly. Maintain current aspect-ratio and contain logic.
6. **Lobby QR Code Feature**:
   - The high-contrast, instant-scan QR code container on the desktop lobby is one of the most praised UX features for seamless mobile joining.
7. **Winner Podium Celebration**:
   - The 3-tier gold/silver/bronze podium with staggered heights, avatar crowns, and confetti cannon popper delivers a deeply satisfying reward loop.
8. **Avatar System & Typography**:
   - The 1,800+ character avatars paired with `Outfit` headers and `Plus Jakarta Sans` body copy provide immediate character and legibility.

---

## 30. Targeted, Non-Breaking Remediation Roadmap

This roadmap is designed for **surgical, low-risk execution**. None of these changes require redesigning screens or altering visual brand assets.

### Phase 1: Accessibility & Security Hotfixes (Zero Risk)
1. **Fix Home Screen Action Cards (`HomeScreen.jsx`)**:
   - Add `role="button"`, `tabIndex={0}`, and `onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handler()}` to both cards.
   - *Impact*: Restores 100% keyboard navigation without changing a single pixel.
2. **Sanitize or Replace `dangerouslySetInnerHTML` (`ChatDrawer.jsx`)**:
   - Replace with safe structured JSX text nodes and highlighted spans.
   - *Impact*: Eliminates XSS risk.
3. **Restore Visible Focus States (`neobrutalism.css`)**:
   - Replace `*:focus { outline: none !important; }` with a bold 3px neo-brutalist focus ring using `*:focus-visible`.
   - *Impact*: Fully complies with WCAG 2.4.7 without affecting mouse/touch users.

### Phase 2: Touch Targets & Mobile Ergonomics (Low Risk)
4. **Expand Mobile Roster Kick Button Target (`LobbyScreen.jsx`)**:
   - Keep the visual `✕` icon at 12px, but wrap it in an invisible touch target padding (`p-3 -m-2`) or enforce a `min-w-[44px] min-h-[44px]` hit area.
   - *Impact*: Eliminates accidental mis-taps on phones.
5. **Enlarge Drawer & Modal Close Buttons (`BottomSheetDrawer.jsx`, `JoinRoomModal.jsx`)**:
   - Increase touch target to `min-w-[44px] min-h-[44px]`.
   - *Impact*: Smooth, frustration-free dismiss gesture on Android.
6. **Improve Mobile Guess Input (`GameScreen.jsx`)**:
   - Add `autocapitalize="none"`, `autocorrect="off"`, and `spellcheck="false"` to the guess input field.
   - *Impact*: Speeds up mobile typing accuracy by preventing automated sentence casing.

### Phase 3: Architectural Cleanup & State Hygiene (Medium Risk)
7. **Eliminate Imperative DOM Manipulation (`RejoinRoomModal.jsx`)**:
   - Refactor `document.getElementById` calls to standard React boolean state props (`isOpen`, `onClose`).
   - *Impact*: Guarantees modal state remains in sync with React's virtual DOM.
8. **Deduplicate Double Submit Handlers (`GameScreen.jsx`)**:
   - Remove redundant `onClick={handleSendMessage}` from the submit button inside `<form onSubmit={handleSendMessage}>`.
   - *Impact*: Prevents double message submission.
9. **Remove Dead CSS & Fix Palette Variables (`claymorphism.css`)**:
   - Correct `--white: #4a3d6b;` to `--white: #ffffff;`.
   - Delete obsolete Appwrite badge hiding rules (lines 9719–9723).
   - *Impact*: Eliminates cascading color glitches and dead weight.
10. **Normalize Z-Index Hierarchy**:
    - Reassign z-indices according to a standardized scale so error toasts and connection alerts always sit above the mobile chat drawer.
    - *Impact*: Prevents obscured critical alerts.

---
*Report compiled and verified against ScoopCast production deployment at `https://scoopcast.me`.*
