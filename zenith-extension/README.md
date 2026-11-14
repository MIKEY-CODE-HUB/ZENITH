# Zenith Distraction Shield for Chrome

1. Download and unzip the extension from **Settings** in Zenith.
2. Open `chrome://extensions` in Chrome 120 or later and turn on **Developer mode**.
3. Choose **Load unpacked** and select the extracted folder containing `manifest.json`. For an existing unpacked install, replace the files in that folder, click **Reload**, then reload the Zenith tab. Version 10.3.0 uses a stable extension ID. Remove the previous Zenith extension if Chrome shows both versions.
4. Start a focus session with **Distraction Shield** enabled. The room and extension popup show the protection status.

Chrome blocks new requests to restricted domains, including embedded frames, fetches, media, and WebSocket handshakes. In Strict mode, unapproved top-level destinations are also blocked. Approved tools can still load normal dependencies. If you open or switch to a restricted page, the extension brings the focus tab forward where Chrome permits it.

Rules are scoped to the protected Chrome session. They clear on session end, room exit, expiry, or browser restart. During protection, the extension checks Zenith periodically for rule changes and server-side session end. Native desktop apps are handled by Zenith's separate macOS companion. Requests served entirely from a site's service worker cache and connections already established before activation can remain available.

If a focus room was open during installation, open the Zenith extension popup and choose **Reconnect current focus room**.

For native Mac app blocking, install the Mac setup from Zenith’s **Distraction Shield** page and choose **Connect Mac app blocking** in the extension popup. Chrome starts it when protection is enabled.
