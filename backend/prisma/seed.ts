import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ZENITH Procrastination Trap Breaker database...');

  // 1. Default Achievements
  const achievements = [
    {
      code: 'FIRST_SESSION',
      title: 'First Step',
      description: 'Complete your first focus session.',
      icon: '🎯',
      category: 'SESSIONS',
      requirementCount: 1,
    },
    {
      code: 'FOCUS_STARTER',
      title: 'Focus Starter',
      description: 'Complete 5 full focus sessions.',
      icon: '⚡',
      category: 'SESSIONS',
      requirementCount: 5,
    },
    {
      code: 'SEVEN_DAY_STREAK',
      title: '7-Day Iron Streak',
      description: 'Focus for 7 consecutive days without breaking.',
      icon: '🔥',
      category: 'STREAK',
      requirementCount: 7,
    },
    {
      code: 'FOCUS_MASTER',
      title: 'Focus Master',
      description: 'Achieve a session focus score above 90%.',
      icon: '👑',
      category: 'SCORE',
      requirementCount: 90,
    },
    {
      code: 'DEEP_WORK',
      title: 'Deep Work Monk',
      description: 'Complete a 90-minute session with >85% focus.',
      icon: '🧘',
      category: 'DURATION',
      requirementCount: 90,
    },
    {
      code: 'BLOCKER_SHIELD',
      title: 'Iron Shield',
      description: 'Block 20+ distraction attempts during focus sessions.',
      icon: '🛡️',
      category: 'BLOCKER',
      requirementCount: 20,
    },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: ach,
      create: ach,
    });
  }

  // 2. Demo Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const usersData = [
    {
      username: 'mikey',
      name: 'Mikey Anderson',
      email: 'mikey@trapbreaker.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
      preferredActivity: 'Coding',
      typicalDuration: 50,
    },
    {
      username: 'alexchen',
      name: 'Alex Chen',
      email: 'alex@trapbreaker.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      preferredActivity: 'Coding',
      typicalDuration: 50,
    },
    {
      username: 'sarahj',
      name: 'Sarah Jenkins',
      email: 'sarah@trapbreaker.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      preferredActivity: 'Creative',
      typicalDuration: 50,
    },
    {
      username: 'rahulv',
      name: 'Rahul Verma',
      email: 'rahul@trapbreaker.com',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
      preferredActivity: 'Study',
      typicalDuration: 50,
    },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        preferredActivity: u.preferredActivity,
        typicalDuration: u.typicalDuration,
      },
      create: {
        ...u,
        passwordHash,
      },
    });
    createdUsers[u.username] = user;

    // User Settings
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        blockerMode: 'BLOCK',
        blockWebsitesEnabled: true,
        blockAppsEnabled: true,
      },
      create: {
        userId: user.id,
        idleThresholdSeconds: 60,
        warningThresholdSeconds: 10,
        cameraVisibility: 'Participants',
        showFocusScore: true,
        distractionAlerts: true,
        blockerMode: 'BLOCK',
        blockWebsitesEnabled: true,
        blockAppsEnabled: true,
      },
    });
  }

  // 3. Default Blocked Resources & Allowlists
  const defaultResources = [
    // Social Media
    { type: 'WEBSITE', identifier: 'instagram.com', displayName: 'Instagram', category: 'SOCIAL', isAllowlist: false },
    { type: 'WEBSITE', identifier: 'facebook.com', displayName: 'Facebook', category: 'SOCIAL', isAllowlist: false },
    { type: 'WEBSITE', identifier: 'twitter.com', displayName: 'X (Twitter)', category: 'SOCIAL', isAllowlist: false },
    { type: 'WEBSITE', identifier: 'x.com', displayName: 'X', category: 'SOCIAL', isAllowlist: false },
    { type: 'WEBSITE', identifier: 'reddit.com', displayName: 'Reddit', category: 'SOCIAL', isAllowlist: false },
    { type: 'WEBSITE', identifier: 'tiktok.com', displayName: 'TikTok', category: 'SOCIAL', isAllowlist: false },
    // Entertainment / Video
    { type: 'WEBSITE', identifier: 'youtube.com', displayName: 'YouTube', category: 'ENTERTAINMENT', isAllowlist: false },
    { type: 'WEBSITE', identifier: 'netflix.com', displayName: 'Netflix', category: 'ENTERTAINMENT', isAllowlist: false },
    { type: 'WEBSITE', identifier: 'twitch.tv', displayName: 'Twitch', category: 'ENTERTAINMENT', isAllowlist: false },
    // Messaging
    { type: 'WEBSITE', identifier: 'whatsapp.com', displayName: 'WhatsApp Web', category: 'MESSAGING', isAllowlist: false },
    { type: 'APPLICATION', identifier: 'Discord', displayName: 'Discord App', category: 'MESSAGING', isAllowlist: false },
    { type: 'APPLICATION', identifier: 'Slack', displayName: 'Slack', category: 'MESSAGING', isAllowlist: false },
    { type: 'APPLICATION', identifier: 'Telegram', displayName: 'Telegram', category: 'MESSAGING', isAllowlist: false },
    { type: 'APPLICATION', identifier: 'WhatsApp', displayName: 'WhatsApp', category: 'MESSAGING', isAllowlist: false },
    // Music
    { type: 'APPLICATION', identifier: 'Spotify', displayName: 'Spotify App', category: 'MUSIC', isAllowlist: false },
    { type: 'WEBSITE', identifier: 'spotify.com', displayName: 'Spotify Web', category: 'MUSIC', isAllowlist: false },
    // Games
    { type: 'APPLICATION', identifier: 'Steam', displayName: 'Steam', category: 'GAMES', isAllowlist: false },
    // Allowlist (Trusted Coding & Study resources)
    { type: 'WEBSITE', identifier: 'github.com', displayName: 'GitHub', category: 'CUSTOM', isAllowlist: true },
    { type: 'WEBSITE', identifier: 'stackoverflow.com', displayName: 'Stack Overflow', category: 'CUSTOM', isAllowlist: true },
    { type: 'WEBSITE', identifier: 'developer.mozilla.org', displayName: 'MDN Web Docs', category: 'CUSTOM', isAllowlist: true },
    { type: 'WEBSITE', identifier: 'docs.google.com', displayName: 'Google Docs', category: 'CUSTOM', isAllowlist: true },
  ];

  const mikey = createdUsers['mikey'];
  const createdResources: Record<string, any> = {};

  for (const res of defaultResources) {
    const item = await prisma.blockedResource.upsert({
      where: {
        userId_type_identifier: {
          userId: mikey.id,
          type: res.type,
          identifier: res.identifier,
        },
      },
      update: {
        displayName: res.displayName,
        category: res.category,
        isAllowlist: res.isAllowlist,
        enabled: true,
      },
      create: {
        userId: mikey.id,
        type: res.type,
        identifier: res.identifier,
        displayName: res.displayName,
        category: res.category,
        isAllowlist: res.isAllowlist,
        enabled: true,
      },
    });
    createdResources[res.identifier] = item;
  }

  // 4. Activity-Specific Block Lists for Mikey
  const activityConfig: Record<string, string[]> = {
    Coding: ['youtube.com', 'instagram.com', 'reddit.com', 'netflix.com', 'twitter.com', 'Steam', 'Discord'],
    Study: ['youtube.com', 'instagram.com', 'reddit.com', 'netflix.com', 'tiktok.com', 'Spotify', 'Steam'],
    Work: ['youtube.com', 'instagram.com', 'reddit.com', 'netflix.com', 'Steam'],
    Creative: ['instagram.com', 'reddit.com', 'twitter.com', 'tiktok.com', 'Steam'],
  };

  for (const [act, identifiers] of Object.entries(activityConfig)) {
    for (const ident of identifiers) {
      const resource = createdResources[ident];
      if (resource) {
        await prisma.activityBlockList.upsert({
          where: {
            userId_activityType_resourceId: {
              userId: mikey.id,
              activityType: act,
              resourceId: resource.id,
            },
          },
          update: { enabled: true },
          create: {
            userId: mikey.id,
            activityType: act,
            resourceId: resource.id,
            enabled: true,
          },
        });
      }
    }
  }

  // 5. Seed Canonical Generalized Focus & Interaction Rooms
  const roomsData = [
    {
      name: 'GRIND',
      description: 'Intense uninterrupted work and problem solving.',
      category: 'EDUCATION',
      activityType: 'Deep Focus',
      atmosphere: 'Tokyo Night',
      roomCode: 'GRIND-01',
      defaultDuration: 50,
      maxParticipants: 12,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'FOCUS',
      description: 'Pure quiet deep study. Minimal stimulation, maximum execution.',
      category: 'EDUCATION',
      activityType: 'Coding',
      atmosphere: 'Rainy Window',
      roomCode: 'FOCUS-02',
      defaultDuration: 50,
      maxParticipants: 12,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'ARENA',
      description: 'Real-time discussion & debate with up to 5 other ambitious students.',
      category: 'INTERACTION',
      topic: 'Competitive Programming & DSA',
      activityType: 'Problem Discussion',
      atmosphere: 'Cyberpunk',
      roomCode: 'ARENA-03',
      defaultDuration: 30,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'FLOW',
      description: 'Unbroken concentration and creative state.',
      category: 'SIDE_QUEST',
      activityType: 'Personal Projects',
      atmosphere: 'Deep Space',
      roomCode: 'FLOW-04',
      defaultDuration: 45,
      maxParticipants: 12,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'BOOST',
      description: 'High energy physical training, mobility, and stamina.',
      category: 'EXERCISE',
      activityType: 'Gym',
      atmosphere: 'Neon Gym',
      roomCode: 'BOOST-05',
      defaultDuration: 45,
      maxParticipants: 12,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'FORGE',
      description: 'Building tools, algorithms, and deep systems from scratch.',
      category: 'EDUCATION',
      activityType: 'Competitive Programming',
      atmosphere: 'Terminal',
      roomCode: 'FORGE-06',
      defaultDuration: 60,
      maxParticipants: 12,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'MOMENTUM',
      description: 'Calisthenics, core workout, and physical discipline.',
      category: 'EXERCISE',
      activityType: 'Home Workout',
      atmosphere: 'Energy Grid',
      roomCode: 'MOMENTUM-07',
      defaultDuration: 30,
      maxParticipants: 12,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'ZONE',
      description: 'Abstract mathematics, theory, and research immersion.',
      category: 'EDUCATION',
      activityType: 'Mathematics',
      atmosphere: 'Night Library',
      roomCode: 'ZONE-08',
      defaultDuration: 50,
      maxParticipants: 12,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'PULSE',
      description: 'Tactical thinking, speed chess, and creative strategy.',
      category: 'SIDE_QUEST',
      activityType: 'Chess',
      atmosphere: 'Retro Arcade',
      roomCode: 'PULSE-09',
      defaultDuration: 30,
      maxParticipants: 12,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'RISE',
      description: 'Career strategy, tech talks, and open peer collaboration.',
      category: 'INTERACTION',
      topic: 'Career & Tech Architecture',
      activityType: 'Career',
      atmosphere: 'City Run',
      roomCode: 'RISE-10',
      defaultDuration: 30,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['mikey'].id,
    },
  ];

  for (const r of roomsData) {
    await prisma.room.upsert({
      where: { roomCode: r.roomCode },
      update: r,
      create: r,
    });
  }

  // 6. Seed Point Ledger for Mikey (Weekly points = 640 ⭐)
  await prisma.pointTransaction.deleteMany({ where: { userId: mikey.id } });
  const initialPoints = [
    { amount: 55, type: 'SESSION_COMPLETED', source: 'SESSION', daysAgo: 3 },
    { amount: 60, type: 'SESSION_COMPLETED', source: 'SESSION', daysAgo: 2 },
    { amount: 75, type: 'SESSION_COMPLETED', source: 'SESSION', daysAgo: 1 },
    { amount: 50, type: 'EXERCISE_COMPLETED', source: 'SESSION', daysAgo: 1 },
    { amount: 400, type: 'STREAK_BONUS', source: 'STREAK', daysAgo: 0 },
  ];
  for (const pt of initialPoints) {
    await prisma.pointTransaction.create({
      data: {
        userId: mikey.id,
        amount: pt.amount,
        type: pt.type,
        source: pt.source,
        createdAt: new Date(Date.now() - pt.daysAgo * 86400000),
      },
    });
  }

  // 6. Seed Block Attempts History for Analytics
  const attemptDistractions = [
    { name: 'youtube.com', type: 'WEBSITE', count: 18 },
    { name: 'instagram.com', type: 'WEBSITE', count: 12 },
    { name: 'reddit.com', type: 'WEBSITE', count: 9 },
    { name: 'Discord', type: 'APPLICATION', count: 6 },
    { name: 'twitter.com', type: 'WEBSITE', count: 5 },
  ];

  for (const item of attemptDistractions) {
    const res = createdResources[item.name];
    for (let i = 0; i < item.count; i++) {
      await prisma.blockAttempt.create({
        data: {
          userId: mikey.id,
          resourceId: res ? res.id : null,
          resourceType: item.type,
          resourceIdentifier: item.name,
          action: 'BLOCKED',
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)),
        },
      });
    }
  }

  console.log('✅ Seed completed successfully with Blocker Resources & Attempt Analytics!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
