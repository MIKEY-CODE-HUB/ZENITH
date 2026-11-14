package app.zenith.shield;

import java.util.Set;
import java.util.regex.Pattern;

final class ShieldSession {
    static final String PREVIEW = "zenith-git-fix-zenith-launch-6c62e3-mikey-sketch-hubs-projects.vercel.app";
    static final String PRODUCTION = "zenith-dusky-theta.vercel.app";
    private static final Set<String> HOSTS = Set.of(PREVIEW, PRODUCTION);
    private static final Pattern ID = Pattern.compile("[A-Za-z0-9_-]{1,100}");
    private static final Pattern JWT = Pattern.compile("[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+");
    static final long MAX_DURATION_MS = 241 * 60_000L;
    final String host;
    final String sessionId;
    final String token;
    final long deadline;

    private ShieldSession(String host, String sessionId, String token, long deadline) {
        this.host = host;
        this.sessionId = sessionId;
        this.token = token;
        this.deadline = deadline;
    }

    static ShieldSession parse(String host, String id, String token, String expiry, long wallTime, long elapsedTime) {
        if (host == null || !HOSTS.contains(host) || id == null || !ID.matcher(id).matches()
            || token == null || token.length() > 2048 || !JWT.matcher(token).matches() || expiry == null) return null;
        try {
            long expiryTime = Long.parseLong(expiry);
            if (expiryTime <= wallTime || expiryTime > wallTime + MAX_DURATION_MS) return null;
            return new ShieldSession(host, id, token, elapsedTime + (expiryTime - wallTime));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    long verifyDeadline(String id, long expiresAt, long now, long elapsed) {
        if (!sessionId.equals(id) || expiresAt <= now || expiresAt > now + MAX_DURATION_MS || elapsed >= deadline) return 0;
        return Math.min(deadline, elapsed + (expiresAt - now));
    }
}
