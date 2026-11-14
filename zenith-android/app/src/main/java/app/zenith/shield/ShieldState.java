package app.zenith.shield;

import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class ShieldState {
    static final ShieldState INSTANCE = new ShieldState();
    private static final int REFRESH_MS = 10_000;
    private static final int MAX_OFFLINE_MS = 25_000;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final Set<Runnable> listeners = new HashSet<>();
    private ShieldSession session;
    private ShieldPolicy policy;
    private long activeUntil;
    private String status = "No protected session connected.";
    private final Runnable poll = this::refresh;

    void start(ShieldSession requested) {
        stop("Checking this focus session…");
        session = requested;
        refresh();
    }

    void stop(String reason) {
        session = null;
        policy = null;
        activeUntil = 0;
        status = reason;
        main.removeCallbacks(poll);
        notifyListeners();
    }

    String status() {
        return status;
    }

    void addListener(Runnable callback) {
        listeners.add(callback);
    }

    void removeListener(Runnable callback) {
        listeners.remove(callback);
    }

    boolean hasPolicy() {
        return policy != null && SystemClock.elapsedRealtime() < activeUntil;
    }

    boolean blocks(String app, String label) {
        return hasPolicy() && policy.blocks(app, label);
    }

    private void refresh() {
        ShieldSession current = session;
        if (current == null) return;
        if (SystemClock.elapsedRealtime() >= current.deadline) {
            stop("The focus session ended. Android protection is off.");
            return;
        }

        network.execute(() -> {
            try {
                JSONObject data = readStatus(current);
                main.post(() -> apply(current, data));
            } catch (IOException | JSONException exception) {
                main.post(() -> retry(current));
            }
        });
    }

    private void apply(ShieldSession current, JSONObject data) {
        if (session != current) return;
        String mode = data.optString("mode");
        long elapsed = SystemClock.elapsedRealtime();
        long deadline = current.verifyDeadline(data.optString("sessionId"), data.optLong("expiresAt"), System.currentTimeMillis(), elapsed);
        if (!data.optBoolean("active") || (!"BLOCK".equals(mode) && !"STRICT".equals(mode)) || deadline == 0) {
            stop("This session is no longer protected. Open Shield from a running focus room.");
            return;
        }
        policy = new ShieldPolicy(rules(data.optJSONArray("blockedApps")), rules(data.optJSONArray("allowedApps")));
        activeUntil = Math.min(deadline, elapsed + MAX_OFFLINE_MS);
        status = "Focus session verified. Protection applies while the Android service is enabled.";
        notifyListeners();
        main.postDelayed(poll, Math.min(REFRESH_MS, deadline - elapsed));
    }

    private void retry(ShieldSession current) {
        if (session != current) return;
        status = "Waiting for Zenith to confirm the focus session.";
        notifyListeners();
        main.postDelayed(poll, REFRESH_MS);
    }

    private void notifyListeners() {
        for (Runnable callback : listeners) callback.run();
    }

    private static Set<String> rules(JSONArray list) {
        Set<String> result = new HashSet<>();
        if (list == null) return result;
        for (int i = 0; i < Math.min(list.length(), 600); i++) {
            String value = list.optString(i);
            if (value.length() <= 100) result.add(ShieldPolicy.key(value));
        }
        result.remove("");
        return result;
    }

    private static JSONObject readStatus(ShieldSession current) throws IOException, JSONException {
        URL url = new URL("https", current.host, "/api/blocker/live-status");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(5000);
        connection.setReadTimeout(5000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Authorization", "Bearer " + current.token);
        connection.setRequestProperty("Cache-Control", "no-store");
        try {
            int status = connection.getResponseCode();
            if (status == 401 || status == 403) return new JSONObject();
            if (status != 200) throw new IOException("Zenith status unavailable");
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream result = new ByteArrayOutputStream()) {
                byte[] chunk = new byte[4096];
                int count;
                while ((count = input.read(chunk)) != -1) {
                    if (result.size() + count > 256 * 1024) throw new IOException("Zenith policy too large");
                    result.write(chunk, 0, count);
                }
                return new JSONObject(result.toString(StandardCharsets.UTF_8.name()));
            }
        } finally {
            connection.disconnect();
        }
    }
}
