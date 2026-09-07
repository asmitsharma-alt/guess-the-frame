# 🎬 Guess The Frame

> **The Ultimate Cinematic Frame Guessing Party Game by Asmit**  
> Race against the clock with friends in real-time online multiplayer or local party mode as iconic movie frames unblur before your eyes!

[![Appwrite](https://img.shields.io/badge/Appwrite-FD366E?style=flat&logo=appwrite&logoColor=white)](https://appwrite.io/)
[![Playwright](https://img.shields.io/badge/Tested%20with-Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)](https://playwright.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Features

- ⚡ **Zero-Build Vanilla SPA**: High-performance Single Page Application built with pure HTML5, CSS3, and ES6+ JavaScript.
- 🌐 **Real-Time Multiplayer**: Instant 4-letter room codes, QR code mobile scanning, live state synchronization powered by Appwrite Realtime WebSockets with local broadcast fallbacks.
- 🎨 **Tactile Claymorphism UI**: Organic shadows, vibrant pastel palettes, animated avatar sprite components, and smooth micro-animations.
- 🔊 **Zero-Latency Web Audio**: Procedural sound effects (fanfares, chimes, buzzers, countdown ticks) synthesized on the fly via Web Audio API.
- 🎯 **Smart Fuzzy Matching**: Typo-tolerant Levenshtein distance scoring that automatically strips articles, accents, and punctuation.
- 🏆 **Interactive Winner Podium**: Dynamic 1st/2nd/3rd place celebration with custom sprite avatars, confetti particle physics, and match scoreboard.

---

## 📁 Repository Structure

```plaintext
appwrite-skills/
├── avvtar/                      # Animated avatar SVG vector assets (Aman, Amish, Aziz, Vish)
├── bg/                          # Cinema backdrop and branding artwork (WebP optimized)
├── css/                         # Precompiled Tailwind CSS styles (tailwind.min.css)
├── docs/                        # Technical documentation and architecture reports
│   ├── FIX_ROADMAP.md           # Hardening roadmap and issue trackers
│   ├── PRODUCTION_AUDIT_REPORT.md
│   ├── PRODUCTION_UPGRADE_PLAN.md
│   └── screenshots/             # Verified reference screenshots (Winner & Scoreboard)
├── GUESSTHEFRAME/               # Core movie frame catalog (34 optimized WebP stills)
├── GUESSTHEEYES/                # Celebrity eye closeup catalog (bonus game mode)
├── sites/                       # Appwrite Sites deployment bundle
│   └── guess-the-frame/         # Static site deploy target mapped in appwrite.config.json
├── tests/                       # Playwright E2E and stress test suites
│   ├── assets.spec.js           # Asset integrity and 200 HTTP check
│   ├── heavy_stress.spec.js     # Heavy multiplayer concurrent load tests
│   ├── lobby.spec.js            # Lobby controls, modals, and room generation
│   ├── master_heavy_e2e.spec.js # Master end-to-end verification (46 assertions)
│   ├── multiplayer.spec.js      # WebSocket messaging and state sync tests
│   ├── reconnect.spec.js        # Host migration and reconnection recovery
│   ├── security.spec.js         # XSS sanitization and rate-limiting defenses
│   ├── ui.spec.js               # Responsive viewports and overflow tests
│   └── verify_live.js           # Live production endpoint health verification
├── tie breaker/                 # Sudden death tie-breaker frame stills
├── .gitignore                   # Standard exclusion rules (scratch, test-results, nodes)
├── appwrite.config.json         # Appwrite Cloud project and Sites configuration
├── CNAME                        # Custom domain mapping
├── dialogues.txt                # Cinema quotes and dialogue trivia dataset
├── index.html                   # Core single-page application
├── logo.png                     # Official game branding logo
├── package.json                 # Development scripts and test dependencies
├── playwright.config.js         # Playwright test runner configuration
└── project.md                   # Master technical specifications and rules documentation
```

---

## 🚀 Quick Start

### 1. Run Locally
Because Guess The Frame is built with pure web standards, no compilation or bundler is required:

```bash
# Install test and dev dependencies
npm install

# Start local server at http://localhost:8080
npm start
```

### 2. Run Test Suites
The codebase is backed by a comprehensive Playwright test suite covering UI, security, asset loading, and real-time multiplayer:

```bash
# Run all automated tests
npm test

# Run master E2E test suite
npm run test:e2e

# Run responsive UI tests
npm run test:ui
```

---

## 🌐 Deployment

### Appwrite Sites (Recommended)
This repository is configured for [Appwrite Sites](https://appwrite.io/docs/products/sites):
```bash
# Deploy site directory configured in appwrite.config.json
appwrite push site
```

### Vercel / Static Hosting
Deploy directly from repository root:
```bash
# Using Vercel CLI
vercel --prod
```

---

## 📖 Documentation

For in-depth specifications on game mechanics, scoring formulas, state machines, and networking protocols, see:
- [Master Project Documentation (`project.md`)](project.md)
- [Production Audit Report (`docs/PRODUCTION_AUDIT_REPORT.md`)](docs/PRODUCTION_AUDIT_REPORT.md)
- [Production Upgrade Plan (`docs/PRODUCTION_UPGRADE_PLAN.md`)](docs/PRODUCTION_UPGRADE_PLAN.md)

---

<div align="center">
  <sub>Crafted with passion for cinema & gaming by <b>Asmit</b>.</sub>
</div>
