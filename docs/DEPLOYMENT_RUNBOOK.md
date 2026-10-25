# ZENITH — DEPLOYMENT RUNBOOK & OPERATIONAL PROCEDURES

---

## 1. PRODUCTION DEPLOYMENT TARGETS

- **Frontend Application:** Vercel (`https://zenith-dusky-theta.vercel.app/`)
- **Backend API & WebSockets:** Node.js / Docker on Railway, Render, or Dedicated VPS
- **Database:** Managed PostgreSQL 15 (e.g. Supabase, Neon, or AWS RDS)
- **Client Extensions:** Chrome Web Store (Manifest V3 unpacked bundle / zip)
- **Desktop Companion:** macOS Node.js daemon running as a launchd service

---

## 2. STEP-BY-STEP DEPLOYMENT PROCEDURE

### Step 1: Database Migration
```bash
cd backend
npx prisma db push --skip-generate
npx prisma generate
npm run prisma:seed
```

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
2. Register a new user with strong password.
3. Verify account persists upon browser refresh.
4. Enter an Education focus room and confirm 10-seat limit.
5. Enter an Interaction room and confirm 30% weekly XP deduction and 6-seat limit.
6. Verify Chrome extension bundle installs cleanly in developer mode.
