# Guess The Frame — Security Policy & Hardening

This document outlines the security controls, defensive architecture, and best practices implemented across the **Guess The Frame** platform.

---

## 1. Threat Model & Security Posture

As a real-time multiplayer web game with live chat, competitive scoring, and user accounts, the platform is defended against:
- **Authentication Bypass & Session Hijacking**
- **Client-Side Answer Tampering & Spoiling (Anti-Cheat)**
- **Cross-Site Scripting (XSS) & Content Injection**
- **Distributed Denial of Service (DDoS) & Rate Floods**
- **Injection Attacks (SQL/NoSQL/Command)**
- **WebSocket Protocol Abuse & State Desynchronization**

---

## 2. Authentication & Credential Safety

### 2.1 Password Hashing
- Passwords are salted and hashed using **`bcryptjs`** with an iteration cost factor of **10 rounds**.
- Raw passwords are never logged, stored in memory buffers, or exposed in API responses.

### 2.2 Token-Based Access (JWT)
- Authenticated sessions use **JSON Web Tokens (JWT)** signed via **HMAC SHA-256 (`HS256`)**.
- Separate secrets are required for access tokens (`JWT_SECRET`) and refresh tokens (`JWT_REFRESH_SECRET`).
- Token validation extracts the user ID and verifies the token is neither expired nor malformed before granting route access.

---

## 3. Realtime Anti-Cheat & Spoiler Shield

### 3.1 Server-Side Answer Authority
- In production multiplayer rooms, **the current frame's movie title is never transmitted to clients during an active round**.
- Clients submit their guesses to the server/host for validation; only correct/incorrect status is returned.

### 3.2 Live Chat Spoiler Shield
- The client and server run a regex/fuzzy filter (`isAnswerOrSpoiler`) on all chat messages.
- Any message matching or closely resembling the current answer is intercepted:
  - The message is suppressed from the public chat stream.
  - An inline system notification is delivered exclusively to the sender.
  - This prevents malicious or accidental leaking of answers in public lobby/game chat.

### 3.3 Duplicate Guess Suppression
- Players cannot spam guesses; repeated submissions of identical answers within a round are suppressed to prevent brute-force dictionary attacks against the fuzzy matcher.

---

## 4. HTTP & Network Hardening

### 4.1 Secure HTTP Headers (Helmet)
The backend enforces security headers via `helmet`:
- **`X-Content-Type-Options: nosniff`** — Prevents MIME-type sniffing.
- **`X-Frame-Options: SAMEORIGIN`** — Mitigates clickjacking attacks.
- **`Strict-Transport-Security (HSTS)`** — Enforces HTTPS in production.
- **`X-DNS-Prefetch-Control: off`** — Blocks speculative DNS prefetching.

### 4.2 Cross-Origin Resource Sharing (CORS)
- REST and WebSocket endpoints are guarded by origin white-listing via `corsMiddleware`.
- In production, requests from unapproved origins are blocked with HTTP 403 Forbidden.

### 4.3 Request Size Limits
- Request bodies are capped at **`1MB`** (`express.json({ limit: '1mb' })`).
- This prevents memory exhaustion and buffer overflow vulnerabilities from oversized payloads.

---

## 5. Rate Limiting & DoS Defense

### 5.1 REST Endpoint Throttling
Endpoints are protected using `express-rate-limit`:
- **Standard API Limiter (`/api`):** Max 100 requests per 15-minute window per IP.
- **Authentication Limiter (`/api/auth/*`):** Max 10 requests per 15-minute window to block credential stuffing and brute-force attacks.

### 5.2 Room & Lobby Capacity Guards
- Maximum players per room is authoritatively hard-capped at **8 players**.
- Join attempts beyond capacity are rejected immediately with `LOBBY_FULL`.
- Join attempts to in-progress matches are rejected with `GAME_ALREADY_STARTED`.

---

## 6. Input Sanitization & SQL Injection Defense

### 6.1 Database Query Parameterization
- All persistence logic is routed through **Prisma ORM**.
- Queries use parameterized SQL prepared statements by default, making SQL injection impossible.

### 6.2 XSS Sanitization
- Usernames, room codes, and chat messages undergo stripping of HTML tags and control characters via `sanitizeInputs` middleware prior to controller handling.
- React's JSX virtual DOM natively escapes dynamic variables, preventing DOM-based XSS attacks.

---

## 7. Reporting a Vulnerability

If you discover a potential security vulnerability in Guess The Frame, please email the development team directly rather than filing a public issue. Include:
1. Steps to reproduce the vulnerability.
2. Proof-of-concept payload or request trace.
3. Impact assessment.
