# Install Zenith Shield on Mac

1. Extract the ZIP. Open `chrome://extensions` in Google Chrome, turn on **Developer mode**, then use **Load unpacked** on the extracted folder itself. It contains `manifest.json`. If upgrading, remove the old Zenith Shield entry first. Chrome should show Zenith Shield 10.6.0. Reload the Zenith tab.
2. To enable desktop app blocking, open the **Mac App Setup** subfolder in Finder and double-click **Install Zenith Mac Shield.command**. Node.js must be installed. You can also run `bash "Install Zenith Mac Shield.command"` in Terminal from that subfolder.
3. In Zenith, select **Distraction Shield → Check setup**. Chrome and the Mac helper report separately. If macOS asks, allow System Events under **System Settings → Privacy & Security → Automation** and grant Accessibility to the app named in the system prompt.
4. Start a room or solo focus session with Distraction Shield enabled. The room shows **Web + Mac Shield active** when both are running.

Chrome blocks listed websites. The Mac helper hides a listed foreground app and returns you to Zenith. It leaves the app's process running. Rules stop when the focus session ends. The helper makes no network requests and stores no credentials.
