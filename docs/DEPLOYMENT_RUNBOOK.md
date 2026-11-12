# ZENITH — DEPLOYMENT RUNBOOK & OPERATIONAL PROCEDURES

---

## 1. PRODUCTION DEPLOYMENT TARGETS

- **Frontend Application:** Vercel (`https://zenith-dusky-theta.vercel.app/`)
- **Backend API & WebSockets:** Node.js / Docker on Railway, Render, or Dedicated VPS
- **Database:** Managed PostgreSQL 15+ (e.g. Supabase, Neon, or AWS RDS)
- **Client Extensions:** Chrome Web Store (Manifest V3 unpacked bundle / zip)
- **Desktop Companion:** macOS Node.js daemon running as a launchd service

---

## 2. REQUIRED PRODUCTION ENVIRONMENT VARIABLES

### Backend Environment Variables
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql://user:pass@host:5432/db?schema=public`) |
| `JWT_SECRET` | Yes | High-entropy signing secret (min 32 chars). Default placeholder is rejected at startup. |
| `PORT` | No | Listening port (defaults to `5001`) |
| `CLIENT_ORIGIN` | Yes | Allowed frontend origin for CORS (e.g. `https://zenith-dusky-theta.vercel.app`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 Web Client ID for server-side token audience verification |
| `GOOGLE_ONLY_AUTH` | No | Enforces Google-only sign-in (defaults to `true` when `NODE_ENV=production`) |

### Frontend Environment Variables
| Variable | Required | Description |
|---|---|---|
| `BACKEND_URL` | Yes | Upstream Express API URL (e.g. `https://api.zenith.app/api`) |
| `NEXT_PUBLIC_API_URL` | Yes | Public API path or upstream URL |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Dedicated Socket.IO backend endpoint |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google Client ID for Google Identity Services SDK |
| `BACKEND_TIMEOUT_MS` | No | Upstream timeout before returning 504 Gateway Timeout (default `3000`) |

---

## 3. STEP-BY-STEP DEPLOYMENT PROCEDURE

### Step 1: Database Migration & Idempotent Catalog Seeding
```bash
cd backend
npx prisma db push --skip-generate
npx prisma generate
npm run prisma:seed
```
> **IMPORTANT (Zero-Data Loss Guarantee):** `npm run prisma:seed` executes an **idempotent catalog upsert**. It installs and updates the 40 canonical focus rooms and achievement catalog. It **never deletes** existing users, focus sessions, point transactions, blocker sessions, or room memberships. Running the seed multiple times is completely safe in production.
>
> *(For local development only, destructive database wipes are separated into `npm run prisma:seed:reset-dev`, which is blocked in production environments).*

### Step 2: Backend Build & Startup
```bash
cd backend
npm run build
npm run start
```
Verify health endpoint: `GET http://localhost:5001/api/health` returns `status: "ok"`.

### Step 3: Frontend Build & Asset Bundle
```bash
cd frontend
npm run sync:extension # Packages zenith-extension.zip into public/
npm run build
```
Verify static and dynamic routes compiled with exit code 0.

### Step 4: Verification Smoke Test
1. Access root URL `http://localhost:3000/`.
2. Authenticate using a verified Google Account (Google-only production flow).
3. Confirm identity is permanently keyed to Google `sub` and persists across browser refreshes.
4. Verify non-Google routes (`/register`, `/login`, `/otp/*`) return `403 Forbidden` (`AUTH_METHOD_DISABLED`).
5. Enter an Education focus room and confirm 10-seat limit.
6. Enter an Interaction room and confirm 30% weekly XP deduction and 6-seat limit.
7. Verify Chrome extension bundle installs cleanly in developer mode.
