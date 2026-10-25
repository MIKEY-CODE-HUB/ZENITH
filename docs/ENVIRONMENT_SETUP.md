# ZENITH — ENVIRONMENT CONFIGURATION & SECRETS REFERENCE

---

## 1. BACKEND ENVIRONMENT VARIABLES (`backend/.env`)

| Variable Name | Required | Safe for Client? | Purpose | Example / Format |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Yes | No | Port on which the Express & Socket.io server listens. | `5001` |
| `NODE_ENV` | Yes | No | Runtime environment (`development`, `production`, `test`). | `development` |
| `DATABASE_URL` | Yes | No | PostgreSQL connection URI including credentials and schema. | `postgresql://user:pass@host:5432/trapbreaker?schema=public` |
| `JWT_SECRET` | Yes | No | Cryptographic secret for signing and verifying JWTs. | Strong 256-bit random string |
| `CLIENT_ORIGIN`| Yes | No | Allowed CORS origin for frontend web client. | `http://localhost:3000` |
| `N8N_WEBHOOK_SECRET` | Optional | No | Shared secret for HMAC-signed webhook delivery to n8n. | Hex-encoded HMAC key |
| `LIVEKIT_URL` | Optional | No | LiveKit WebRTC server URI (for cloud SFU video scaling). | `wss://zenith.livekit.cloud` |
| `LIVEKIT_API_KEY` | Optional | No | LiveKit API Key. | `APIxxxxxx` |
| `LIVEKIT_API_SECRET` | Optional | No | LiveKit API Secret. | `secxxxxxx` |

---

## 2. FRONTEND ENVIRONMENT VARIABLES (`frontend/.env.local`)

| Variable Name | Required | Safe for Client? | Purpose | Example / Format |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | Yes | Base URL for REST API communication. | `http://localhost:5001` |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Yes | WebSocket server URI for Socket.io client. | `http://localhost:5001` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | No | Yes | Feature flag to enable client telemetry collection. | `true` |

---

## 3. DESKTOP BLOCKER CONFIGURATION

| Variable Name | Required | Safe for Client? | Purpose | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| `ZENITH_BACKEND_URL` | No | No | Target API URL polled by native desktop blocker daemon. | `http://localhost:5001` |
