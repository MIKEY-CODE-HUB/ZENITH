# ZENITH — SECURITY ARCHITECTURE & THREAT MODEL

**Authoritative Security Standards & Enforcement Policies**

---

## 1. THREAT MODEL & MITIGATIONS

| Threat Vector | Attack Scenario | Zenith Architectural Mitigation |
| :--- | :--- | :--- |
| **Broken Object Level Authorization (IDOR)** | User attempts to query or manipulate another user's shield rules or focus history. | All controller operations extract `userId` strictly from verified JWT claims (`req.user.id`). Foreign key lookups enforce `WHERE userId = req.user.id`. |
| **Race Conditions / Double Spending** | Concurrent HTTP requests to join an Interaction Room attempt to spend the same weekly XP balance twice. | PostgreSQL transaction advisory lock `pg_advisory_xact_lock(hashtext('xp_' \|\| userId))` isolates concurrent requests per user. |
| **Arbitrary XP Inflation** | Client sends a fabricated request to award points. | Point awards are exclusively minted server-side inside `SessionController.completeSession` based on validated server timestamps and scoring rules. |
| **Fake Attendance / Room Sybil Abuse** | User spins up multiple sockets to hoard seats or manipulate votes. | Room entry requires valid JWT token. Socket handlers associate socket ID to verified `userId`. Max 1 participant record per user in any room. |
| **Malicious Ballot Removal / Brigading** | Accused votes on own case, or reporter conspires to kick innocent user without corroboration. | Accused and reporter are explicitly excluded from the ballot. Up to 8 independent room peers vote. Strict majority threshold (>50%) plus minimum quorum required. |
| **Reconnection Bypass After Kick** | Kicked user immediately re-joins room through API or socket. | Server records `RoomRestriction` with 30-minute cooldown. `joinRoom` and socket `join_room` query active restrictions and reject entry. |
| **Cross-Site Scripting (XSS) via Themes** | Malicious CSS, JavaScript, or data URIs submitted in custom theme URLs. | Strict schema and regex validation on theme URLs. Only HTTPS URLs or recognized image/color tokens accepted. |
| **Credential & Secret Leakage** | Database URLs, JWT secrets, or provider keys exposed in frontend bundles or logs. | `process.env` secrets remain server-side. Next.js bundle inspection verifies zero secret leakage in client JS. |
| **Voice Eavesdropping in Focus Rooms** | Malicious participant un-mutes microphone in silent focus rooms. | WebRTC signaling server strictly ignores audio renegotiation requests and drops `speaking_change` socket events unless room category is `INTERACTION`. |
| **Webhook Spoofing (n8n)** | Unauthenticated caller posts fabricated events to background automation endpoints. | HMAC SHA-256 signature verification on all incoming webhook payloads using a shared secret. |

---

## 2. PASSWORD & AUTHENTICATION POLICY

- Minimum password length: 8 characters.
- Required character classes: at least 1 uppercase letter (`[A-Z]`), 1 lowercase letter (`[a-z]`), 1 digit (`[0-9]`), and 1 special symbol (`[!@#$%^&*...]`).
- Passwords hashed using `bcrypt` with work factor 10.
- JWT signed using HS256 with expiration enforced. Expired tokens are rejected with HTTP 401.
