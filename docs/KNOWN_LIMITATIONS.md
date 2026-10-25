# ZENITH — KNOWN TECHNICAL LIMITATIONS & ROADMAP TRADEOFFS

---

## 1. BROWSER EXTENSION & TAB MANAGEMENT
- **Chrome MV3 Service Worker Inactivity:** Chrome Manifest V3 service workers sleep after 30 seconds of inactivity. Keep-alive pings between content scripts and background scripts ensure uninterrupted snap-back monitoring during active focus sessions.
- **Native OS Apps vs. Browser Sandbox:** Chrome extensions cannot inspect or hide native desktop applications due to browser sandbox restrictions. Native application blocking is handled exclusively by the companion `zenith-desktop-blocker` Node.js daemon.

## 2. WEBRTC MESH SCALING
- **Peer-to-Peer Mesh Constraints:** WebRTC peer-to-peer mesh topology works reliably up to 6–10 participants per room. Above 10 participants, upload bandwidth requirements scale quadratically ($N \times (N - 1)$). The system strictly enforces the 10-participant ceiling for focus rooms and 6-participant ceiling for interaction rooms. Enterprise deployments exceeding 10 participants should configure a Selective Forwarding Unit (SFU) such as LiveKit.

## 3. NATIVE DESKTOP BLOCKER PLATFORM COMPATIBILITY
- The current native desktop blocker uses macOS `osascript` (AppleScript) to query and hide frontmost processes. Windows (`user32.dll`) and Linux (`xdotool` / `hyprctl`) companion daemons are designated for future multi-platform release.

## 4. COMMUNITY MODERATION QUORUM IN SMALL ROOMS
- For rooms with fewer than 4 total participants (where only 1 or 2 eligible peers exist besides the reporter and accused), a single peer's vote represents 100% of the voting pool. The system requires minimum 1 valid independent vote to achieve quorum, preventing a reporter from unilaterally kicking a user.
