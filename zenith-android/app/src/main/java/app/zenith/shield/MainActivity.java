package app.zenith.shield;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.view.View;
import android.view.accessibility.AccessibilityManager;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private final ShieldState state = ShieldState.INSTANCE;
    private final Runnable onShieldChange = this::renderStatus;
    private TextView status;
    private CheckBox consent;
    private Button start;
    private ShieldSession pending;
    private String returnHost = ShieldSession.PRODUCTION;

    @Override
    public void onCreate(Bundle saved) {
        super.onCreate(saved);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(246, 244, 237));
        LinearLayout body = new LinearLayout(this);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        body.setPadding(padding, padding, padding, padding);
        body.setOrientation(LinearLayout.VERTICAL);
        scroll.setFillViewport(true);
        scroll.addView(body);
        TextView title = text("Zenith Shield", 28);
        title.setAccessibilityHeading(true);
        body.addView(title);
        status = text("", 16);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        body.addView(status);
        body.addView(text("Zenith Shield uses Android Accessibility to identify the foreground app by its app ID during a verified focus session. It returns you to Home when a blocked app opens. Screen text and app activity stay off Zenith’s servers.", 16));
        consent = new CheckBox(this);
        consent.setText("I agree to use Accessibility for app blocking");
        consent.setChecked(getPreferences(MODE_PRIVATE).getBoolean("consent", false));
        body.addView(consent);
        Button setup = button(body, "Open Accessibility settings", () -> startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)));
        setup.setEnabled(consent.isChecked());
        consent.setOnCheckedChangeListener((button, checked) -> {
            getPreferences(MODE_PRIVATE).edit().putBoolean("consent", checked).apply();
            setup.setEnabled(checked);
            if (!checked) state.stop("Android protection is off.");
            renderStatus();
        });
        start = button(body, "Protect this focus session", () -> {
            if (pending == null || !serviceEnabled() || !consent.isChecked()) return;
            state.start(pending);
            pending = null;
            renderStatus();
        });
        button(body, "Stop Android protection", () -> {
            pending = null;
            state.stop("Android protection is off.");
        });
        button(body, "Open Zenith", () -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://" + returnHost + "/rooms")));
            } catch (ActivityNotFoundException ignored) {
                status.setText("Open your focus room in a browser.");
            }
        });
        setContentView(scroll);
        accept(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        accept(intent);
    }

    private void accept(Intent intent) {
        Uri uri = intent.getData();
        intent.setData(null);
        if (uri != null && "zenithshield".equals(uri.getScheme()) && "session".equals(uri.getHost())) {
            pending = ShieldSession.parse(uri.getQueryParameter("host"), uri.getQueryParameter("id"),
                uri.getQueryParameter("token"), uri.getQueryParameter("expiresAt"),
                System.currentTimeMillis(), SystemClock.elapsedRealtime());
            if (pending != null) returnHost = pending.host;
        }
        renderStatus();
    }

    @Override
    protected void onStart() {
        super.onStart();
        state.addListener(onShieldChange);
    }

    @Override
    protected void onResume() {
        super.onResume();
        renderStatus();
    }

    @Override
    protected void onStop() {
        state.removeListener(onShieldChange);
        super.onStop();
    }

    private boolean serviceEnabled() {
        AccessibilityManager manager = getSystemService(AccessibilityManager.class);
        ComponentName component = new ComponentName(this, ShieldService.class);
        for (AccessibilityServiceInfo info : manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)) {
            if (component.equals(ComponentName.unflattenFromString(info.getId()))) return true;
        }
        return false;
    }

    private void renderStatus() {
        boolean enabled = serviceEnabled();
        boolean valid = pending != null && SystemClock.elapsedRealtime() < pending.deadline;
        start.setEnabled(valid && enabled && consent.isChecked());
        if (!enabled) {
            status.setText("Accessibility is off. Enable Zenith Shield in Android settings to block apps.");
        } else if (valid) {
            status.setText("Focus session received. Tap Protect this focus session.");
        } else {
            status.setText(state.status());
        }
    }

    private TextView text(String value, int size) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(Color.rgb(20, 37, 32));
        view.setPadding(0, 12, 0, 18);
        return view;
    }

    private Button button(LinearLayout body, String label, Runnable action) {
        Button button = new Button(this);
        button.setText(label);
        button.setOnClickListener(view -> action.run());
        body.addView(button);
        return button;
    }
}
