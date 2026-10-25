# ZENITH — N8N WORKFLOW SPECIFICATIONS & DEPLOYMENT GUIDE

---

## 1. PURPOSE & ARCHITECTURAL BOUNDARIES
Zenith utilizes n8n strictly for non-blocking asynchronous orchestrations:
- **Session Completion Digest:** Receives signed webhook on completed focus session and generates coaching advice.
- **Weekly Productivity Digest:** Automated weekly summarization on Monday 00:00 UTC.
- **Service Monitoring & Maintenance:** Heartbeat checking and stale presence reconciliation.

Critical path operations (User Authentication, Room Allocation, 30% XP Currency Deductions, and Community Moderation Auto-Kick) are executed natively within the transactional Node.js and PostgreSQL backend.

---

## 2. WORKFLOW ARTIFACTS
1. `session-completion-workflow.json`: Session analysis & coaching feedback.
2. `weekly-digest-workflow.json`: Weekly aggregated focus digest generation.
3. `maintenance-reconciliation-workflow.json`: 15-minute cron health monitoring.

---

## 3. SECURITY & HMAC VERIFICATION
All backend webhook events include the `X-Zenith-Signature` header computed as:
```text
HMAC-SHA256(payloadJson, N8N_WEBHOOK_SECRET)
```
Incoming webhooks sent to the backend require signature validation against `N8N_WEBHOOK_SECRET`.
