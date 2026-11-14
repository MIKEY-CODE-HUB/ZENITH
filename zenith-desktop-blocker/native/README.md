# Install Zenith Shield on Mac

1. Open `chrome://extensions` in Google Chrome and turn on **Developer mode**. Click **Load unpacked** and select **1 - Chrome Extension**. Check that Chrome shows Zenith Shield 10.4.0 and remove the old Zenith Shield copy if both appear.
2. For desktop app blocking, open **2 - Mac App Setup** and run **Install Zenith Mac Shield.command** once. Node.js must be installed. From a Terminal where Node is available, you can also run `bash "Install Zenith Mac Shield.command"` inside that folder.
3. In Zenith, open **Distraction Shield → My rules** to manage your list. Start a room or solo focus session with **Distraction Shield** enabled. Chrome connects to the Mac helper automatically. If macOS asks, allow System Events under **System Settings → Privacy & Security → Automation** and grant Accessibility to the app named in the system prompt.

Chrome blocks listed websites. The Mac helper hides a listed foreground app and returns you to Zenith. It leaves the app's process running. Rules stop when the focus session ends. The helper makes no network requests and stores no credentials.
