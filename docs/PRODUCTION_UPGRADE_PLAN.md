# Production Architecture Upgrade Plan: Guess The Frame

**Prepared By**: Senior Principal Engineer, Multiplayer Game Architect & Site Reliability Engineer  
**Objective**: Transform *Guess The Frame* from a client-side peer-to-peer prototype into a resilient, enterprise-grade, server-authoritative multiplayer platform capable of serving millions of concurrent players.

---

## 1. Target System Architecture

The target architecture decouples presentation from game simulation, ensuring server-authoritative validation, resilient state management, and high-performance asset distribution:

```text
[Web & Mobile Clients]
       |
       +---> [Cloudflare CDN / Vercel Edge] ---> Static Assets, WebP Images, WOFF2 Fonts
       |
       +---> [Appwrite Realtime / Scaled WebSocket Cluster] ---> Bidirectional Game Packets
       |
       +---> [Appwrite Cloud Functions (Server-Authoritative)]
                   |
                   +---> [Appwrite Auth (Anonymous Sessions / Tokens)]
                   +---> [Appwrite Database / Redis State Store]
                   +---> [Observability: Sentry + Datadog / OpenTelemetry]
```

---

## 2. Server-Authoritative Multiplayer Migration

### Current Architectural Flaw:
The current game relies on a **Client-Host topology**: one browser tab acts as the host and validates guesses, while communication is broadcast over public MQTT brokers.
- *Fatal weakness*: If the host browser closes, tabs sleep, or network drops, the game stalls. Hosts can also cheat by inspecting local memory for answers.

### Enterprise Target Architecture:
Migrate to **Server-Authoritative Game Sessions** using Appwrite Cloud Functions & Redis/Appwrite Realtime:
1. **Match Engine in Cloud Functions**:
   - Room creation, player join, and answer validation run inside isolated, ephemeral backend executions.
   - When a player submits a guess, it is sent over an authenticated RPC to the server.
   - The server validates the answer using fuzzy string matching and broadcasts the result to the room.
   - **Zero answer leaks**: Client devices never receive movie titles or answers until after the round expires.
2. **Dedicated Realtime Channels**:
   - Each match is isolated to an authenticated Appwrite channel: `databases.[dbId].collections.rooms.documents.[roomId]`.
   - Players authenticate with Appwrite Anonymous or OAuth sessions.
   - Channel subscriptions are governed by Appwrite Document-level permissions: only registered players in a room can subscribe or publish.

---

## 3. High-Performance Asset Delivery & Media Pipeline

### Problem:
Current assets weigh **151.20 MB**, with 376 celebration PNGs consuming 146 MB.

### Solution & Pipeline Overhaul:
1. **Convert Frame Sequences to Transparent Video**:
   - Transcode avatar celebrations from raw PNG sequences into transparent **WebM (VP9 + Alpha)** for Chromium/Firefox and **HEVC with Alpha** for Safari/iOS.
   - *Result*: File size shrinks from 37 MB per avatar to **~950 KB per avatar** (97.4% reduction).
2. **Cloudflare / CDN Edge Caching**:
   - Cache all movie frames (`GUESSTHEFRAME/`, `GUESSTHEEYES/`, `tie breaker/`) behind Cloudflare or AWS CloudFront with:
     `Cache-Control: public, max-age=31536000, immutable`
   - Deliver optimized image formats (AVIF / WebP) dynamically based on `Accept` request headers.
3. **Lazy-Load Winner Assets**:
   - Do not preload any winner celebration animations during lobby or active gameplay.
   - Only fetch the winning player's animation asset during the 3-second transition into `winnerScreen`.

---

## 4. Observability, Logging & SRE Strategy

### Monitoring & Metrics (Prometheus / Grafana / Datadog)
- **Multiplayer Health Dashboard**:
  - Active rooms and concurrent players (CCU).
  - WebSocket connection duration and unexpected disconnect rate.
  - Round completion latency and guess validation response time (p50, p95, p99 < 50ms).
  - Reconnection success rate.
- **Client Web Vitals**:
  - Largest Contentful Paint (LCP) target: < 1.2s.
  - First Input Delay (FID) / Interaction to Next Paint (INP) target: < 50ms.
  - Cumulative Layout Shift (CLS) target: < 0.02.

### Structured Error Tracking (Sentry)
- Instrument client-side Sentry SDK:
  ```javascript
  Sentry.init({
    dsn: "https://your-sentry-dsn@sentry.io/project",
    integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
  ```
- Log custom tags: `roomCode`, `isHost`, `connectionTransport`, `deviceClass`.

### Client-Side Logging Standard
Replace scattered `console.log` with a structured logger:
```javascript
const Logger = {
  info(event, data) { sendToCollector({ level: 'INFO', event, timestamp: Date.now(), data }); },
  warn(event, data) { sendToCollector({ level: 'WARN', event, timestamp: Date.now(), data }); },
  error(event, err) { Sentry.captureException(err); }
};
```

---

## 5. Scaling & Disaster Recovery Strategy

### Concurrency Targets:
- **Phase 1 Target**: 1,000 Concurrent Users (CCU) (~150 concurrent rooms).
- **Phase 2 Target**: 25,000 CCU (~3,500 concurrent rooms).
- **Phase 3 Target (Gaming Scale)**: 100,000+ CCU.

### Scaling Architecture:
1. **Horizontal WebSocket Scaling**:
   - Deploy stateless WebSocket gateway instances behind an AWS Network Load Balancer (NLB) with sticky sessions.
   - Use a managed Redis Cluster (AWS ElastiCache or Redis Enterprise) as the pub/sub state backplane.
2. **Database Sharding & TTLs**:
   - Ephemeral match documents in Appwrite/Redis configured with a 2-hour Time-To-Live (TTL).
   - Inactive rooms automatically garbage-collected by the database engine without cron jobs.
3. **Disaster Recovery & Redundancy**:
   - Multi-region failover between primary (e.g. AWS us-east-1 / sgp) and backup region.
   - Automated DNS failover via Cloudflare Load Balancing with automated health probes every 10 seconds.
