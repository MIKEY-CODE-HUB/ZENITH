package app.zenith.shield;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class ShieldPolicy {
    private static final Map<String, String> BUILT_IN_BLOCKED = Map.ofEntries(
        Map.entry("com.instagram.android", "instagram"), Map.entry("com.instagram.lite", "instagram"),
        Map.entry("com.facebook.katana", "facebook"), Map.entry("com.facebook.lite", "facebook"),
        Map.entry("com.facebook.orca", "messenger"), Map.entry("com.snapchat.android", "snapchat"),
        Map.entry("com.reddit.frontpage", "reddit"), Map.entry("com.twitter.android", "x"),
        Map.entry("com.zhiliaoapp.musically", "tiktok"), Map.entry("com.ss.android.ugc.trill", "tiktok"),
        Map.entry("com.google.android.youtube", "youtube"), Map.entry("com.google.android.apps.youtube.music", "youtube music"),
        Map.entry("com.netflix.mediaclient", "netflix"), Map.entry("com.amazon.avod.thirdpartyclient", "prime video"),
        Map.entry("com.disney.disneyplus", "disney+"), Map.entry("in.startv.hotstar", "jiohotstar"),
        Map.entry("com.hulu.plus", "hulu"), Map.entry("com.crunchyroll.crunchyroid", "crunchyroll"),
        Map.entry("com.whatsapp", "whatsapp"), Map.entry("com.whatsapp.w4b", "whatsapp business"),
        Map.entry("org.telegram.messenger", "telegram"), Map.entry("com.discord", "discord"),
        Map.entry("com.spotify.music", "spotify"), Map.entry("tv.twitch.android.app", "twitch"),
        Map.entry("com.roblox.client", "roblox"), Map.entry("com.valvesoftware.android.steam.community", "steam"),
        Map.entry("com.epicgames.portal", "epic games"), Map.entry("com.epicgames.fortnite", "fortnite"),
        Map.entry("com.mojang.minecraftpe", "minecraft"), Map.entry("com.supercell.clashroyale", "clash royale"),
        Map.entry("com.supercell.clashofclans", "clash of clans"),
        Map.entry("com.activision.callofduty.shooter", "call of duty"), Map.entry("com.pubg.imobile", "bgmi"),
        Map.entry("com.tencent.ig", "pubg mobile"), Map.entry("com.dts.freefiremax", "free fire max")
    );
    private static final Set<String> ALWAYS_ALLOWED = Set.of(
        "app.zenith.shield", "com.android.systemui", "com.android.settings", "com.android.phone",
        "com.google.android.dialer", "com.android.dialer", "com.android.chrome", "com.github.android",
        "com.google.android.apps.docs", "com.google.android.apps.docs.editors.docs",
        "com.google.android.apps.docs.editors.sheets", "org.khanacademy.android",
        "org.kiwix.kiwixmobile", "org.wikipedia", "org.lichess.mobileapp", "com.chess"
    );

    private final Set<String> blocked;
    private final Set<String> allowed;

    ShieldPolicy(Set<String> blocked, Set<String> allowed) {
        this.blocked = blocked;
        this.allowed = allowed;
    }

    boolean blocks(String app, String label) {
        if (ALWAYS_ALLOWED.contains(app)) return false;
        if (BUILT_IN_BLOCKED.containsKey(app)) return true;
        String name = key(label);
        if (allowed.contains(app) || allowed.contains(name)) return false;
        return blocked.contains(app) || blocked.contains(name);
    }

    static String key(String value) {
        return value.trim().toLowerCase(Locale.ROOT).replaceFirst("\\.(app|exe)$", "");
    }
}
