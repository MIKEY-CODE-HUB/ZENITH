import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

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

  // 5. Seed Canonical Generalized Focus & Interaction Rooms (40 rooms total: 10 per category)
  const roomsData = [
    // ── EDUCATION ROOMS (10 Rooms, max 10) ──────────────────────────────────
    {
      name: 'GRIND',
      description: 'Intense uninterrupted work and problem solving.',
      category: 'EDUCATION',
      activityType: 'Deep Focus',
      atmosphere: 'Tokyo Night',
      roomCode: 'EDU-GRIND-01',
      defaultDuration: 50,
      maxParticipants: 10,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'FOCUS',
      description: 'Pure quiet deep study. Minimal stimulation, maximum execution.',
      category: 'EDUCATION',
      activityType: 'Coding',
      atmosphere: 'Rainy Window',
      roomCode: 'EDU-FOCUS-02',
      defaultDuration: 50,
      maxParticipants: 10,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'FORGE',
      description: 'Building tools, algorithms, and deep systems from scratch.',
      category: 'EDUCATION',
      activityType: 'Competitive Programming',
      atmosphere: 'Terminal',
      roomCode: 'EDU-FORGE-03',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'ZONE',
      description: 'Abstract mathematics, theory, and research immersion.',
      category: 'EDUCATION',
      activityType: 'Mathematics',
      atmosphere: 'Night Library',
      roomCode: 'EDU-ZONE-04',
      defaultDuration: 50,
      maxParticipants: 10,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'CIPHER',
      description: 'Cryptography, offensive & defensive cyber systems and low-level code.',
      category: 'EDUCATION',
      activityType: 'Coding',
      atmosphere: 'Cyberpunk',
      roomCode: 'EDU-CIPHER-05',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'QUANTUM',
      description: 'Physics, computer architecture, hardware design, and scientific computing.',
      category: 'EDUCATION',
      activityType: 'Deep Focus',
      atmosphere: 'Deep Space',
      roomCode: 'EDU-QUANTUM-06',
      defaultDuration: 50,
      maxParticipants: 10,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'ATLAS',
      description: 'Historical texts, humanities, philosophical inquiry, and comparative literature.',
      category: 'EDUCATION',
      activityType: 'Study',
      atmosphere: 'Rainy Library',
      roomCode: 'EDU-ATLAS-07',
      defaultDuration: 45,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'LOGIC',
      description: 'Data structures, algorithm complexity analysis, and discrete mathematics.',
      category: 'EDUCATION',
      activityType: 'Competitive Programming',
      atmosphere: 'Tokyo Midnight',
      roomCode: 'EDU-LOGIC-08',
      defaultDuration: 50,
      maxParticipants: 10,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'NEURON',
      description: 'Deep neural networks, PyTorch model training, and AI research papers.',
      category: 'EDUCATION',
      activityType: 'Coding',
      atmosphere: 'Matrix Code',
      roomCode: 'EDU-NEURON-09',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'SCHOLAR',
      description: 'Academic thesis preparation, manuscript writing, and peer review drafting.',
      category: 'EDUCATION',
      activityType: 'Study',
      atmosphere: 'Night Library',
      roomCode: 'EDU-SCHOLAR-10',
      defaultDuration: 50,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },

    // ── EXERCISE ROOMS (10 Rooms, max 10) ───────────────────────────────────
    {
      name: 'BOOST',
      description: 'High energy physical training, mobility, and stamina.',
      category: 'EXERCISE',
      activityType: 'Gym',
      atmosphere: 'Neon Gym',
      roomCode: 'EXE-BOOST-01',
      defaultDuration: 45,
      maxParticipants: 10,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'MOMENTUM',
      description: 'Calisthenics, core workout, and physical discipline.',
      category: 'EXERCISE',
      activityType: 'Home Workout',
      atmosphere: 'Energy Grid',
      roomCode: 'EXE-MOMENTUM-02',
      defaultDuration: 30,
      maxParticipants: 10,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'TITAN',
      description: 'Progressive overload, barbell training, and structural power.',
      category: 'EXERCISE',
      activityType: 'Gym',
      atmosphere: 'Neon Gym',
      roomCode: 'EXE-TITAN-03',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'ENDURE',
      description: 'High intensity interval training, cardiovascular threshold, and endurance.',
      category: 'EXERCISE',
      activityType: 'Cardio',
      atmosphere: 'City Run',
      roomCode: 'EXE-ENDURE-04',
      defaultDuration: 35,
      maxParticipants: 10,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'FLEX',
      description: 'Joint mobility, posterior chain flexibility, and postural realignment.',
      category: 'EXERCISE',
      activityType: 'Mobility',
      atmosphere: 'Rainy Window',
      roomCode: 'EXE-FLEX-05',
      defaultDuration: 25,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'ZEN',
      description: 'Breath control, flow yoga, parasympathetic nervous system down-regulation.',
      category: 'EXERCISE',
      activityType: 'Yoga',
      atmosphere: 'Deep Space',
      roomCode: 'EXE-ZEN-06',
      defaultDuration: 30,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'STRIDE',
      description: 'Running cadence training, pacing preparation, and cardio drills.',
      category: 'EXERCISE',
      activityType: 'Cardio',
      atmosphere: 'City Run',
      roomCode: 'EXE-STRIDE-07',
      defaultDuration: 40,
      maxParticipants: 10,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'IRON',
      description: 'Squat, bench, and deadlift technique analysis and heavy singles.',
      category: 'EXERCISE',
      activityType: 'Gym',
      atmosphere: 'Neon Gym',
      roomCode: 'EXE-IRON-08',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'KINETIC',
      description: 'Kettlebell sport, functional movement patterns, and rotational power.',
      category: 'EXERCISE',
      activityType: 'Home Workout',
      atmosphere: 'Energy Grid',
      roomCode: 'EXE-KINETIC-09',
      defaultDuration: 30,
      maxParticipants: 10,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'APEX',
      description: 'Peak conditioning, sprint intervals, and athletic heart rate testing.',
      category: 'EXERCISE',
      activityType: 'Cardio',
      atmosphere: 'City Run',
      roomCode: 'EXE-APEX-10',
      defaultDuration: 45,
      maxParticipants: 10,
      creatorId: createdUsers['rahulv'].id,
    },

    // ── SIDE QUEST ROOMS (10 Rooms, max 10) ─────────────────────────────────
    {
      name: 'FLOW',
      description: 'Unbroken concentration and creative side quest building.',
      category: 'SIDE_QUEST',
      activityType: 'Personal Projects',
      atmosphere: 'Deep Space',
      roomCode: 'SQ-FLOW-01',
      defaultDuration: 45,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'PULSE',
      description: 'Tactical thinking, speed chess, and creative strategy.',
      category: 'SIDE_QUEST',
      activityType: 'Chess',
      atmosphere: 'Retro Arcade',
      roomCode: 'SQ-PULSE-02',
      defaultDuration: 30,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'CIRCUIT',
      description: 'Technical writing, system design docs, RFCs & research papers.',
      category: 'SIDE_QUEST',
      topic: 'System Architecture & RFCs',
      activityType: 'Creative',
      atmosphere: 'Rainy Library',
      roomCode: 'SQ-CIRCUIT-03',
      defaultDuration: 50,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'PIXEL',
      description: 'Design systems, Figma components, interactive prototypes, and typography.',
      category: 'SIDE_QUEST',
      activityType: 'Creative',
      atmosphere: 'Tokyo Night',
      roomCode: 'SQ-PIXEL-04',
      defaultDuration: 50,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'BEAT',
      description: 'Digital audio workstations, synth patching, beat arrangements, and mix mastering.',
      category: 'SIDE_QUEST',
      activityType: 'Creative',
      atmosphere: 'Cyberpunk',
      roomCode: 'SQ-BEAT-05',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'SCRIPT',
      description: 'Fiction writing, world building, screenwriting, and story architecture.',
      category: 'SIDE_QUEST',
      activityType: 'Creative',
      atmosphere: 'Rainy Window',
      roomCode: 'SQ-SCRIPT-06',
      defaultDuration: 45,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'CRAFT',
      description: 'Blender 3D mesh modeling, procedural texturing, and geometry nodes.',
      category: 'SIDE_QUEST',
      activityType: 'Creative',
      atmosphere: 'Tokyo Midnight',
      roomCode: 'SQ-CRAFT-07',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'QUEST',
      description: 'Indie game development in Godot, Unity, and custom physics simulation engines.',
      category: 'SIDE_QUEST',
      activityType: 'Personal Projects',
      atmosphere: 'Retro Arcade',
      roomCode: 'SQ-QUEST-08',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'CANVAS',
      description: 'Digital concept art, speed painting, color theory, and anatomical studies.',
      category: 'SIDE_QUEST',
      activityType: 'Creative',
      atmosphere: 'Night Library',
      roomCode: 'SQ-CANVAS-09',
      defaultDuration: 45,
      maxParticipants: 10,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'FOUNDER',
      description: 'Micro-SaaS development, landing page copy, stripe integration, and launch prep.',
      category: 'SIDE_QUEST',
      activityType: 'Personal Projects',
      atmosphere: 'Terminal',
      roomCode: 'SQ-FOUNDER-10',
      defaultDuration: 60,
      maxParticipants: 10,
      creatorId: createdUsers['mikey'].id,
    },

    // ── INTERACTION ROOMS (10 Rooms, max 6 STRICT) ───────────────────────────
    {
      name: 'ARENA',
      description: 'Real-time discussion & debate with up to 5 other ambitious students.',
      category: 'INTERACTION',
      topic: 'Competitive Programming & DSA',
      activityType: 'Problem Discussion',
      atmosphere: 'Cyberpunk',
      roomCode: 'INT-ARENA-01',
      defaultDuration: 30,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'RISE',
      description: 'Career strategy, tech talks, and open peer collaboration.',
      category: 'INTERACTION',
      topic: 'Career & Tech Architecture',
      activityType: 'Career',
      atmosphere: 'City Run',
      roomCode: 'INT-RISE-02',
      defaultDuration: 30,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'COLLAB',
      description: 'Pair programming, technical interview mocks & live code reviews.',
      category: 'INTERACTION',
      topic: 'DSA Mock Interviews & Code Review',
      activityType: 'Problem Discussion',
      atmosphere: 'Tokyo Midnight',
      roomCode: 'INT-COLLAB-03',
      defaultDuration: 35,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'SYNERGY',
      description: 'Large-scale distributed systems architecture teardowns and whiteboarding.',
      category: 'INTERACTION',
      topic: 'Distributed Systems & Microservices',
      activityType: 'Problem Discussion',
      atmosphere: 'Terminal',
      roomCode: 'INT-SYNERGY-04',
      defaultDuration: 45,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'HACK',
      description: 'Rapid product brainstorming, API architecture, and weekend hack sprints.',
      category: 'INTERACTION',
      topic: 'Hackathon Sprints & MVP Design',
      activityType: 'Problem Discussion',
      atmosphere: 'Cyberpunk',
      roomCode: 'INT-HACK-05',
      defaultDuration: 40,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['mikey'].id,
    },
    {
      name: 'DEBATE',
      description: 'Philosophical, ethical, and socio-economic ramifications of artificial intelligence.',
      category: 'INTERACTION',
      topic: 'AI Alignment & Safety Debate',
      activityType: 'Problem Discussion',
      atmosphere: 'Night Library',
      roomCode: 'INT-DEBATE-06',
      defaultDuration: 35,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'CLINIC',
      description: 'Live bug triage, memory leak profiling, and difficult compiler errors clinic.',
      category: 'INTERACTION',
      topic: 'Debug Hospital & Performance Profiling',
      activityType: 'Problem Discussion',
      atmosphere: 'Rainy Window',
      roomCode: 'INT-CLINIC-07',
      defaultDuration: 30,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['alexchen'].id,
    },
    {
      name: 'PITCH',
      description: 'Product pitch practice, feedback critiques, and value proposition polishing.',
      category: 'INTERACTION',
      topic: 'Startup Pitch & YC Mock Interviews',
      activityType: 'Career',
      atmosphere: 'Tokyo Night',
      roomCode: 'INT-PITCH-08',
      defaultDuration: 30,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['sarahj'].id,
    },
    {
      name: 'MASTER',
      description: 'Hard dynamic programming and graph algorithm proofs walkthrough.',
      category: 'INTERACTION',
      topic: 'Advanced Graph Algorithms & DP',
      activityType: 'Problem Discussion',
      atmosphere: 'Terminal',
      roomCode: 'INT-MASTER-09',
      defaultDuration: 45,
      maxParticipants: 6,
      defaultMic: true,
      creatorId: createdUsers['rahulv'].id,
    },
    {
      name: 'FORUM',
      description: 'Open student council, accountability goal setting, and week-ahead planning.',
      category: 'INTERACTION',
      topic: 'Accountability Council & Weekly Planning',
      activityType: 'Career',
      atmosphere: 'Deep Space',
      roomCode: 'INT-FORUM-10',
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

  // 6. Start Fresh: Ensure Clean Slate for new / existing users (0 fake points, 0 fake attempts)
  await prisma.focusEvent.deleteMany({});
  await prisma.blockerSession.deleteMany({});
  await prisma.blockAttempt.deleteMany({});
  await prisma.pointTransaction.deleteMany({});
  await prisma.focusSession.deleteMany({});
  await prisma.interactionAuthorization.deleteMany({});
  await prisma.roomParticipant.deleteMany({});

  console.log('✅ Seed completed successfully: clean slate, 40 focus rooms (10 per category), 0 fake stats!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
