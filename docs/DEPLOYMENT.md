# Guess The Frame — Production Deployment Guide

This guide details how to build, configure, and deploy the **Guess The Frame** application to production environments.

---

## 1. Architecture Deployment Overview

The application is architected as a decoupled full-stack system:
1. **Frontend:** Static Single Page Application (SPA) built with React and Vite. Can be hosted on any static edge CDN (Render, Vercel, Netlify, Cloudflare Pages, AWS S3 + CloudFront).
2. **Backend:** Node.js + Express API server with persistent WebSockets (`/ws`). Runs on long-running compute (Render, Railway, Fly.io, AWS ECS, or a VPS with PM2).
3. **Database:** Managed PostgreSQL (Render PostgreSQL, Supabase, Neon, AWS RDS) or local SQLite for staging/testing.

---

## 2. Option A: Turnkey Deployment via Render (Recommended)

The project includes an infrastructure-as-code Blueprint specification in [`render.yaml`](../render.yaml).

### Steps:
1. Push this repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com/), navigate to **Blueprints** → **New Blueprint Instance**.
3. Select your repository. Render will automatically parse `render.yaml` and configure:
   - **`guess-the-frame-backend`**: Node.js Web Service on port `10000` with WebSocket support enabled.
   - **`guess-the-frame-frontend`**: Static Site with automatic SPA rewrite rules (`/*` → `/index.html`).
   - **`guess-the-frame-db`**: Managed PostgreSQL database instance.
4. Click **Apply**.
5. Once deployed, copy the backend URL (e.g. `https://guess-the-frame-backend.onrender.com`) and ensure the frontend's `VITE_API_URL` environment variable matches.

---

## 3. Option B: Hybrid Cloud Deployment (Vercel + Railway/Render)

### 3.1 Deploying Backend to Railway / Render / VPS
1. **Build & Start Commands:**
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
2. **Health Check Path:**
   - Set health check to `/api/health` (returns HTTP 200 with database status and uptime).
3. **Environment Variables:**
   ```env
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=postgresql://user:password@host:5432/guesstheframe?schema=public
   JWT_SECRET=super-secure-random-32-byte-hex-string
   JWT_REFRESH_SECRET=another-super-secure-random-32-byte-string
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

### 3.2 Deploying Frontend to Vercel / Cloudflare Pages
1. **Build & Output Settings:**
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
2. **Environment Variables:**
   ```env
   VITE_API_URL=https://your-backend-api.com
   ```
3. **SPA Routing Configuration:**
   - For Vercel, a `vercel.json` rewrite rule is configured:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```

---

## 4. Option C: Single Server / VPS Deployment (Ubuntu + Nginx + PM2)

### 4.1 Prerequisites
```bash
sudo apt update && sudo apt install -y nodejs npm nginx postgresql git
sudo npm install -g pm2
```

### 4.2 Clone & Build
```bash
git clone https://github.com/asmitsharma-alt/guess-the-frame.git /var/www/guess-the-frame
cd /var/www/guess-the-frame

# Install root & orchestrate build
npm install
npm run build
```

### 4.3 Configure & Start Backend with PM2
```bash
cd /var/www/guess-the-frame/backend
cp .env.example .env
nano .env # Set production secrets and PostgreSQL DATABASE_URL

# Run Prisma database migration
npx prisma db push
node prisma/seed.js

# Start backend cluster with PM2
pm2 start src/server.js --name "gtf-backend" -i max
pm2 save
pm2 startup
```

### 4.4 Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/guesstheframe`:

```nginx
server {
    listen 80;
    server_name play.yourdomain.com;

    # Static Frontend
    root /var/www/guess-the-frame/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Realtime WebSocket Proxy
    location /ws {
        proxy_pass http://127.0.0.1:8080/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/guesstheframe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Environment Variables Reference

### Backend (`/backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `8080` | Port for Express & WebSocket server |
| `NODE_ENV` | Yes | `production` | Environment mode (`production`, `development`, `test`) |
| `DATABASE_URL` | Yes | - | PostgreSQL or SQLite connection string |
| `JWT_SECRET` | Yes | - | Strong cryptographic key for access tokens (HMAC SHA-256) |
| `JWT_REFRESH_SECRET` | Yes | - | Strong cryptographic key for refresh tokens |
| `JWT_EXPIRES_IN` | Optional | `24h` | Access token lifetime |
| `CORS_ORIGIN` | Yes | `*` | Allowed client origin URL(s) |
| `LOG_LEVEL` | Optional | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |

### Frontend (`/frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Optional | `/api` | Base URL for REST API endpoints |
| `VITE_WS_URL` | Optional | Auto-detect | WebSocket endpoint URL (e.g. `wss://api.yourdomain.com/ws`) |

---

## 6. Health Checks & Verification

After deployment, verify the installation:

```bash
# 1. Health check endpoint
curl -i https://your-backend-api.com/api/health
# Expected: HTTP/1.1 200 OK
# Body: {"status":"ok","database":"ok","uptimeSeconds":123,...}

# 2. WebSocket connectivity
wscat -c wss://your-backend-api.com/ws
# Expected: Connected (press CTRL+C to quit)

# 3. Frontend assets
curl -I https://your-frontend-domain.com/
# Expected: HTTP/1.1 200 OK
```
