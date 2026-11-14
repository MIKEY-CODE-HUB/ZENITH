# Zenith Shield for Android

This Android companion protects native apps during a running Zenith focus session. Open the focus room in Android Chrome with protection enabled, then choose **Protect Android apps**. In the companion, approve the Accessibility disclosure, enable Zenith Shield in Android settings and tap **Protect this focus session**. Keep the focus room open in Chrome.

Instagram, WhatsApp, YouTube and other listed apps are blocked during the session. Built-in study apps and essential Android components stay available. Custom native-app rules accept display names or Android package IDs. The companion acts on foreground app changes, leaves apps running, and has no access to screen content. All app detection stays on the device. Website blocking on Android Chrome is outside this companion’s scope.

The handoff contains a session-only token. The companion verifies it over HTTPS, keeps it in memory, and stops at expiry, after session completion is confirmed, or when the user stops protection. If Zenith cannot be reached, protection stops within 25 seconds of the last successful verification.

Open this directory in Android Studio and build the `app` module with SDK 35. Alternatively run `gradle :app:assembleDebug` with Gradle 8.9 and an installed JDK and Android SDK. The build requires Android 11 or later. Use a managed signing key and complete Google Play accessibility disclosures before distributing through Google Play.
