export interface ShieldDomain {
  name: string;
  domain: string;
  category: string;
  description?: string;
}

/**
 * TIER 1 — ALWAYS BLOCKED (Zenith Core Protection)
 * High-distraction platforms automatically enforced during active focus sessions.
 * These cannot be removed by the user.
 */
export const ALWAYS_BLOCKED_DOMAINS: ShieldDomain[] = [
  { name: 'Instagram', domain: 'instagram.com', category: 'Social Media', description: 'Reels, stories, and feed' },
  { name: 'Reddit', domain: 'reddit.com', category: 'Social Community', description: 'Infinite feeds & discussion threads' },
  { name: 'YouTube', domain: 'youtube.com', category: 'Video Streaming', description: 'Shorts, videos, and recommendations' },
  { name: 'Netflix', domain: 'netflix.com', category: 'Entertainment', description: 'Shows, movies, and binge streaming' },
  { name: 'TikTok', domain: 'tiktok.com', category: 'Short Video', description: 'Algorithmic short-form video' },
  { name: 'Discord', domain: 'discord.com', category: 'Messaging & Chat', description: 'Direct messages & gaming servers' },
  { name: 'X / Twitter', domain: 'x.com', category: 'Social Media', description: 'Microblogging & viral timelines' },
  { name: 'Twitter', domain: 'twitter.com', category: 'Social Media', description: 'Legacy Twitter domains' },
  { name: 'Prime Video', domain: 'primevideo.com', category: 'Entertainment', description: 'Amazon streaming video' },
  { name: 'Twitch', domain: 'twitch.tv', category: 'Live Streaming', description: 'Gaming & live video streams' },
  { name: 'Crunchyroll', domain: 'crunchyroll.com', category: 'Anime Streaming', description: 'Anime episodes & simulcasts' },
  { name: 'AnimeKai', domain: 'animekai.to', category: 'Anime Streaming', description: 'Anime streaming portal' },
  { name: '9anime', domain: '9animetv.to', category: 'Anime Streaming', description: 'Anime streaming portal' },
  { name: 'Aniwatch', domain: 'aniwatchtv.to', category: 'Anime Streaming', description: 'Anime streaming site' },
  { name: 'Hulu', domain: 'hulu.com', category: 'Entertainment', description: 'On-demand TV & streaming' },
  { name: 'Disney+', domain: 'disneyplus.com', category: 'Entertainment', description: 'Movies & series streaming' },
];

/**
 * TIER 2 — ALWAYS ALLOWED (Essential Tools)
 * Essential learning, coding, and problem-solving platforms.
 * These are NEVER blocked and cannot be accidentally blocked.
 */
export const ALWAYS_ALLOWED_DOMAINS: ShieldDomain[] = [
  { name: 'Google Search', domain: 'google.com', category: 'Search & Research', description: 'Web search and learning queries' },
  { name: 'GitHub', domain: 'github.com', category: 'Development', description: 'Source code & repositories' },
  { name: 'GitHub Dev', domain: 'github.dev', category: 'Development', description: 'Web-based code editor' },
  { name: 'LeetCode', domain: 'leetcode.com', category: 'DSA Practice', description: 'Algorithms & coding interview prep' },
  { name: 'Codeforces', domain: 'codeforces.com', category: 'Competitive Programming', description: 'Contests & algorithmic problem set' },
  { name: 'CodeChef', domain: 'codechef.com', category: 'Competitive Programming', description: 'Competitive coding practice' },
  { name: 'HackerRank', domain: 'hackerrank.com', category: 'Coding Challenges', description: 'Skill tests & programming challenges' },
  { name: 'Chess.com', domain: 'chess.com', category: 'Mind Training', description: 'Chess tactics & focus training' },
  { name: 'Lichess', domain: 'lichess.org', category: 'Mind Training', description: 'Open chess analysis & tactics' },
  { name: 'MDN Web Docs', domain: 'developer.mozilla.org', category: 'Documentation', description: 'Official web standards & JavaScript docs' },
  { name: 'Stack Overflow', domain: 'stackoverflow.com', category: 'Developer Q&A', description: 'Programming questions & answers' },
  { name: 'W3Schools', domain: 'w3schools.com', category: 'Learning', description: 'Web reference tutorials' },
  { name: 'GeeksforGeeks', domain: 'geeksforgeeks.org', category: 'CS Education', description: 'Data structures & algorithms articles' },
  { name: 'Google Docs', domain: 'docs.google.com', category: 'Productivity', description: 'Notes, papers, and document editing' },
  { name: 'Google Drive', domain: 'drive.google.com', category: 'Productivity', description: 'Academic files and resources' },
  { name: 'VS Code Web', domain: 'vscode.dev', category: 'Development', description: 'Web editor for coding' },
  { name: 'Zenith App', domain: 'localhost', category: 'Core Platform', description: 'Zenith focus & accountability workspace' },
];

export interface ShieldApp {
  name: string;
  category: string;
  description?: string;
}

/**
 * TIER 1 — ALWAYS BLOCKED DESKTOP APPS (Zenith Core Protection)
 * High-distraction desktop applications intercepted during active focus sessions.
 */
export const ALWAYS_BLOCKED_APPS: ShieldApp[] = [
  { name: 'Discord', category: 'Chat & Gaming', description: 'Discord chat & voice' },
  { name: 'Spotify', category: 'Media Streaming', description: 'Music & podcasts' },
  { name: 'Steam', category: 'Gaming', description: 'Steam game client' },
  { name: 'Telegram', category: 'Messaging', description: 'Instant messaging' },
  { name: 'WhatsApp', category: 'Messaging', description: 'WhatsApp desktop' },
  { name: 'Slack', category: 'Messaging', description: 'Work & community chat' },
  { name: 'Epic Games', category: 'Gaming', description: 'Epic Games launcher' },
  { name: 'Battle.net', category: 'Gaming', description: 'Blizzard game client' },
  { name: 'LeagueClient', category: 'Gaming', description: 'League of Legends client' },
  { name: 'RiotClientServices', category: 'Gaming', description: 'Riot Games launcher' },
  { name: 'Twitch', category: 'Streaming', description: 'Twitch desktop application' },
  { name: 'TikTok', category: 'Short Video', description: 'TikTok desktop application' },
];

/**
 * TIER 2 — ALWAYS ALLOWED DESKTOP APPS (Essential Tools)
 * Essential development environments, browsers, and productivity tools.
 */
export const ALWAYS_ALLOWED_APPS: ShieldApp[] = [
  { name: 'Google Chrome', category: 'Browser', description: 'Web browser' },
  { name: 'Brave Browser', category: 'Browser', description: 'Web browser' },
  { name: 'Arc', category: 'Browser', description: 'Web browser' },
  { name: 'Safari', category: 'Browser', description: 'Web browser' },
  { name: 'Terminal', category: 'Development', description: 'Command line terminal' },
  { name: 'iTerm2', category: 'Development', description: 'Enhanced terminal' },
  { name: 'Code', category: 'Development', description: 'Visual Studio Code' },
  { name: 'Cursor', category: 'Development', description: 'AI code editor' },
  { name: 'Windsurf', category: 'Development', description: 'AI code editor' },
  { name: 'Xcode', category: 'Development', description: 'Apple developer IDE' },
  { name: 'Android Studio', category: 'Development', description: 'Android IDE' },
  { name: 'IntelliJ IDEA', category: 'Development', description: 'JetBrains Java IDE' },
  { name: 'WebStorm', category: 'Development', description: 'JetBrains Web IDE' },
  { name: 'PyCharm', category: 'Development', description: 'JetBrains Python IDE' },
  { name: 'Sublime Text', category: 'Development', description: 'Code & text editor' },
  { name: 'Finder', category: 'System', description: 'macOS file manager' },
  { name: 'Zenith', category: 'Core Platform', description: 'Zenith focus & accountability workspace' },
  { name: 'Antigravity', category: 'Core Platform', description: 'Antigravity coding assistant' },
];

/**
 * Check if a hostname matches any domain in a given list,
 * supporting subdomains, www, and exact matches.
 */
export function isDomainInList(hostname: string, domainList: ShieldDomain[] | string[]): boolean {
  if (!hostname) return false;
  const cleanHost = hostname.toLowerCase().trim().replace(/^www\./, '');

  for (const item of domainList) {
    const rawDomain = typeof item === 'string' ? item : item.domain;
    const cleanDomain = rawDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0];

    if (cleanHost === cleanDomain) return true;
    if (cleanHost.endsWith('.' + cleanDomain)) return true;
    if (cleanDomain === 'localhost' && (cleanHost === '127.0.0.1' || cleanHost === 'localhost')) return true;
  }
  return false;
}

/**
 * Check if an application matches any app in a given list.
 */
export function isAppInList(appName: string, appList: (ShieldApp | string)[]): boolean {
  if (!appName) return false;
  const cleanApp = appName.toLowerCase().trim();
  for (const item of appList) {
    const target = (typeof item === 'string' ? item : item.name).toLowerCase().trim();
    if (cleanApp === target || cleanApp.includes(target) || target.includes(cleanApp)) {
      return true;
    }
  }
  return false;
}

