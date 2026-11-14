# Zenith Shield for Windows

1. In Google Chrome, load the Zenith Shield extension from the Distraction Shield page.
2. Extract the Windows download. Open **ZenithShield.exe** and confirm setup. This registers a Chrome native messaging helper for your Windows account.
3. Select **Check setup** in Zenith, then start a protected session. Open a blocked app such as Steam or Discord, then finish the session and reopen it.
4. Use the executable name, such as `Discord.exe`, when adding an app rule.

The helper minimizes a matched foreground window and asks Chrome to return to the focus room. It leaves the app running, makes no network calls, and does not run outside the Chrome connection. This build is for Windows 10/11 x64. Apps running with elevated permissions and some packaged Windows apps may not respond to this helper.
