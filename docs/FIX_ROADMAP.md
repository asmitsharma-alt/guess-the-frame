# Engineering Fix Roadmap: Guess The Frame

This roadmap establishes the prioritized remediation path required to elevate *Guess The Frame* to enterprise-grade production readiness, modeled after live-service gaming engineering standards (Netflix Games / Riot Games / Epic Games tier).

---

## 🔴 Priority P0: Launch Blockers (Must Fix Before Any Public Launch)

These items represent active security vulnerabilities, fatal architectural deadlocks, or network dependencies that prevent commercial deployment.

| Task ID | Component | File & Lines | Description & Technical Remedy |
| :--- | :--- | :--- | :--- |
| **P0-01** | Security & Auth | `index.html`: L12642-12691 | **Enforce Cryptographic Message Verification**: Call `NetworkSecurity.verifyToken(msg.token, roomCode, msg.senderId)` within `validateIncomingMessage`. Drop any packet where the HMAC signature fails or token is absent. |
| **P0-02** | Room Security | `index.html`: L12659-12672 | **Whitelist `HOST_MIGRATED` Command**: Add `HOST_MIGRATED` to the `HOST_COMMANDS` array or implement a distributed consensus protocol (Raft-lite or host election token) so arbitrary clients cannot hijack rooms. |
| **P0-03** | Multiplayer Sync | `index.html`: L15365-15377, L15557 | **Host Migration Playlist Handshake**: When the host creates a playlist, encrypt the full playlist (with answers) using a shared room secret and store it in `localStorage` or broadcast as an encrypted blob to candidate hosts. Upon host drop, the newly elected host decrypts the playlist and seamlessly continues round progression. |
| **P0-04** | Networking | `index.html`: L14816-14817 | **Decommission Public MQTT Brokers**: Replace `broker.emqx.io` and `broker.hivemq.com` with a managed, authenticated backend: either Appwrite Realtime via Appwrite Cloud or a dedicated WebSocket server with TLS, rate-limiting, and per-room ACLs. |
| **P0-05** | Asset Delivery | `index.html`: L16547-16570 | **Eliminate Active Preloading of 146 MB Celebration Frames**: Remove the background loop that fetches 376 raw PNGs during gameplay. Only load the winner celebration animation on-demand when the match concludes, or replace the PNG sequence with an optimized WebM/MP4 video clip (< 1 MB per avatar). |
| **P0-06** | Asset Paths | `index.html`: L12205, L12222, L12272 | **Fix Relative Path Traversal on Winner Screen**: Replace all occurrences of `src="../avvtar/"` with `src="avvtar/"` to prevent 404 broken image icons when served from web root. |

---

## 🟠 Priority P1: Scalability & Stability (Fix Before Scaling to 1,000+ Users)

These items address client performance, memory leaks, data persistence, and build architecture necessary to sustain concurrent player traffic.

| Task ID | Component | File & Lines | Description & Technical Remedy |
| :--- | :--- | :--- | :--- |
| **P1-01** | Backend DB | Appwrite Cloud | **Implement Appwrite Database & Collections**: Provision a `matches` and `leaderboards` database collection. Store room codes, active player sessions, round history, and final standings to allow real-time queryability and historical player stats. |
| **P1-02** | User Identity | Appwrite Cloud | **Implement Appwrite Anonymous Authentication**: Replace random `p_xxxx` strings with Appwrite Anonymous Sessions (`account.createAnonymousSession()`). Allows persistent user profiles, rejoin tokens, and ban enforcement. |
| **P1-03** | Frontend Build | Root / Build Tooling | **Break Monolith into Modular Vite Application**: Separate the 18,162-line `index.html` into modular ES modules (`src/engine/`, `src/ui/`, `src/audio/`, `src/security/`). Use Vite or ESBuild with Tailwind CSS purging and code-splitting. |
| **P1-04** | Memory Mgmt | `index.html`: L13558 | **Implement LRU Image Cache Eviction**: Cap `GS.imageCache` at 30 images with Least-Recently-Used eviction to prevent unbounded memory growth over prolonged gaming sessions. |
| **P1-05** | UI Ergonomics | `index.html`: L11479-11668 | **Eliminate 52px Viewport Overflow**: Adjust padding and container constraints on `#homeScreen` so the view fits exactly in 100vh on 1280x720 desktop displays without scrollbars. |
| **P1-06** | Web Fonts | `index.html`: L11-12 | **Optimize Font Loading**: Consolidate the 6 Google Font families to 2 primary font families (`Anybody` and `DM Sans`). Self-host WOFF2 font files locally with `font-display: swap` to eliminate render-blocking delay. |

---

## 🟡 Priority P2: Quality of Life & Enterprise Polish (Post-Launch Enhancements)

These enhancements elevate player retention, operational visibility, and feature depth.

| Task ID | Component | Description & Technical Remedy |
| :--- | :--- | :--- |
| **P2-01** | Observability | **Centralized Error Tracking (Sentry)**: Integrate Sentry browser SDK to capture unhandled client errors, WebSocket disconnects, and preloader timeouts in real-time. |
| **P2-02** | Media Optimization | **Convert Frame Sequences to WebM Alpha Video**: Replace PNG frame sequences in `avvtar/` with transparent WebM/HEVC video loops. Reduces celebration asset size from 146 MB to under 4 MB (97.3% compression). |
| **P2-03** | Network UX | **Actionable Reconnection Banner**: When a network drop occurs, display an interactive modal with connection retry countdown, ping indicator, and automatic state resynchronization. |
| **P2-04** | Accessibility | **WCAG 2.1 Touch Target Compliance**: Ensure all interactive buttons, avatar selectors, and settings controls have minimum tap dimensions of 44x44 CSS pixels. |
| **P2-05** | Matchmaking | **Public Room Browser & Matchmaking Queue**: Add a lobby browser allowing players to find open public games without exchanging private 4-digit codes. |
