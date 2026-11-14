package app.zenith.shield;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.os.SystemClock;
import android.telecom.TelecomManager;
import android.view.accessibility.AccessibilityEvent;

public final class ShieldService extends AccessibilityService {
    private String launcher;
    private String dialer;
    private long lastBlock;
    private String lastApp = "";

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
        ResolveInfo resolved = getPackageManager().resolveActivity(home, PackageManager.MATCH_DEFAULT_ONLY);
        launcher = resolved == null ? "" : resolved.activityInfo.packageName;
        TelecomManager telecom = getSystemService(TelecomManager.class);
        dialer = telecom == null ? "" : telecom.getDefaultDialerPackage();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || event.getPackageName() == null) return;
        String app = event.getPackageName().toString();
        if (app.equals(launcher) || app.equals(dialer)) return;
        ShieldState state = ShieldState.INSTANCE;
        if (!state.hasPolicy()) return;
        String label = app;
        try {
            PackageManager packages = getPackageManager();
            label = packages.getApplicationLabel(packages.getApplicationInfo(app, 0)).toString();
        } catch (PackageManager.NameNotFoundException ignored) {
            // Rules can also use Android package names.
        }
        long now = SystemClock.elapsedRealtime();
        if (app.equals(lastApp) && now - lastBlock < 500) return;
        if (state.blocks(app, label) && performGlobalAction(GLOBAL_ACTION_HOME)) {
            lastApp = app;
            lastBlock = now;
        }
    }

    @Override
    public void onInterrupt() {
        ShieldState.INSTANCE.stop("Android protection was interrupted. Reopen Shield from the focus room.");
    }

    @Override
    public void onDestroy() {
        ShieldState.INSTANCE.stop("Android protection stopped.");
        super.onDestroy();
    }
}
