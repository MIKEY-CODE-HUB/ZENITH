# Zenith app blocking for macOS

1. Install the current Zenith extension in Google Chrome.
2. Extract this Mac setup download. With Node.js available, run `bash "Install Zenith Mac Shield.command"` from the extracted folder.
3. Open the Zenith extension popup and select **Connect Mac app blocking**. Grant Chrome’s native messaging permission when prompted.
4. Start a protected focus session. Allow System Events under **System Settings → Privacy & Security → Automation** and enable Accessibility for the app identified by macOS if it asks. The focus room reports any permission issue it receives.

Chrome starts the helper for protected sessions and stops it when protection ends. The helper receives only the verified session ID, expiry and app rules. It hides restricted foreground apps and asks Chrome to return to your focus room. It makes no network requests and stores no credentials.
