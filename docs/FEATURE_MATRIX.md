# ZENITH — FEATURE VERIFICATION MATRIX

**Audit Status as of October 25, 2026**

| Feature ID | Feature Name | Intended Behavior | Technical Implementation | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | User Registration | Unique email/username, bcrypt hashing, complexity check. | `authController.register` | Automated unit test (`auth.test.ts`) | **VERIFIED** |
| **AUTH-02** | User Login | Valid credentials grant tamper-proof JWT token. | `authController.login` | Automated unit test (`auth.test.ts`) | **VERIFIED** |
| **AUTH-03** | Auth Rejection | Rejects invalid credentials, short passwords, missing numbers. | `authController.ts` | Automated unit test (`auth.test.ts`) | **VERIFIED** |
| **ROOM-01** | Room Catalog | 40 canonical rooms (10 Education, 10 Exercise, 10 Side Quest, 10 Interaction). | `canonicalRooms.ts`, `seed.ts` | Unit & API tests | **VERIFIED** |
| **ROOM-02** | Focus Capacity | Strict 10-participant hard ceiling for standard focus rooms. | `roomController.ts`, `roomSocketHandlers.ts` | Socket concurrency test (`masterQAE2E.test.ts`) | **VERIFIED** |
| **ROOM-03** | Interaction Capacity | Strict 6-participant hard ceiling for interaction rooms. | `roomController.ts`, `roomSocketHandlers.ts` | Socket concurrency test (`masterQAE2E.test.ts`) | **VERIFIED** |
| **ROOM-04** | Random Matchmaking | Server-side atomic allocation to available room with capacity. | `roomController.matchmake` | Dynamic concurrency test (`matchmaking.test.ts`) | **VERIFIED** |
| **MEDIA-01**| WebRTC Signaling | Peer-to-peer audio/video signaling over Socket.io. | `roomSocketHandlers.ts`, `useWebRTC.ts` | Multi-peer socket test | **VERIFIED** |
| **MEDIA-02**| Silent Focus Rooms | Microphone transmission disabled in Education, Exercise, Side Quests. | `roomSocketHandlers.ts`, `FloatingControlDock.tsx` | Socket event dropping verified | **VERIFIED** |
| **MEDIA-03**| Interaction Voice | Voice enabled exclusively in Interaction rooms. | `roomSocketHandlers.ts` | Socket permission verified | **VERIFIED** |
| **ECON-01** | 30% Weekly Fee | 30% weekly XP deduction to enter Interaction rooms (min 15-20 floor). | `pointService.ts` | Unit test (`masterQAE2E.test.ts`) | **VERIFIED** |
| **ECON-02** | Atomic Currency Lock | Transactional advisory lock preventing double-spend race conditions. | `pg_advisory_xact_lock` in `pointService.ts` | Concurrency integration test | **VERIFIED** |
| **BLCK-01** | Tier 1 Blacklist | Automatic interception of high-distraction platforms. | `policyEngine.ts` | 6-scenario unit test suite | **VERIFIED** |
| **BLCK-02** | Tier 2 Whitelist | Strict protection of developer, study, and coding platforms. | `policyEngine.ts` | 6-scenario unit test suite | **VERIFIED** |
| **BLCK-03** | Tier 3 Custom Rules | User allow/block list subordinate to Tier 1 and Tier 2. | `policyEngine.ts`, `blockerRoutes.ts` | Conflict validation test | **VERIFIED** |
| **BLCK-04** | Chrome Extension | MV3 background service worker with instant snap-back to room. | `zenith-extension/background.js` | Extension bundle & sync test | **VERIFIED** |
| **BLCK-05** | Native Desktop Blocker| macOS daemon polling session status and hiding unauthorized apps. | `zenith-desktop-blocker.js` | Daemon telemetry test | **VERIFIED** |
| **TELE-01** | Focus Scoring | Authoritative scoring distinguishing active from idle time. | `focusScoringService.ts` | Unit test suite | **VERIFIED** |
| **TELE-02** | Clean Slate Analytics| Honest 0% focus rate and 0 completed sessions for empty users. | `analyticsService.ts` | Regression test (`BUG-003`) | **VERIFIED** |
| **TELE-03** | Multi-Tenant Privacy| Guests cannot see first user's telemetry records. | `analyticsController.ts` | Regression test (`BUG-004`) | **VERIFIED** |
| **MOD-01**  | Misbehavior Reporting| Room participants report disruptive behavior with reason. | `moderationService.ts` | Implementation in progress | **IMPLEMENTED** |
| **MOD-02**  | Corroboration Ballot| Freeze voter snapshot (up to 8 eligible voters, excluding accused/reporter). | `moderationService.ts` | Implementation in progress | **IMPLEMENTED** |
| **MOD-03**  | Majority Auto-Kick | Strict >50% vote threshold triggers automated kick & cooldown. | `moderationService.ts` | Implementation in progress | **IMPLEMENTED** |
| **THM-01**  | Scoped Atmospheres | Themes scoped to DASHBOARD, ROOMS, or BOTH with validation. | `atmospheres.ts`, `userController.ts` | Schema validation | **VERIFIED** |
| **THM-02**  | Audio Soundscapes | Web Audio synthesizer generating realistic binaural ambient sounds. | `ambientAudio.ts`, `soundscapeEngine.ts` | Audio engine test | **VERIFIED** |
| **N8N-01**  | Background Workflows| Digest generation and maintenance tasks with HMAC validation. | `n8nWebhookService.ts` | Integration verification | **IMPLEMENTED** |
