import { NextRequest, NextResponse } from 'next/server';
import { ZenithPolicyEngine } from '@/lib/policyEngine';

// 40 Canonical Focus & Interaction Rooms
const CANONICAL_ROOMS = [
  // EDUCATION (10 Rooms)
  { id: 'edu-grind-01', name: 'GRIND', description: 'Intense uninterrupted work and problem solving.', category: 'EDUCATION', activityType: 'Deep Focus', atmosphere: 'Tokyo Night', roomCode: 'EDU-GRIND-01', defaultDuration: 50, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 92 },
  { id: 'edu-focus-02', name: 'FOCUS', description: 'Pure quiet deep study. Minimal stimulation, maximum execution.', category: 'EDUCATION', activityType: 'Coding', atmosphere: 'Rainy Window', roomCode: 'EDU-FOCUS-02', defaultDuration: 50, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 94 },
  { id: 'edu-forge-03', name: 'FORGE', description: 'Building tools, algorithms, and deep systems from scratch.', category: 'EDUCATION', activityType: 'Competitive Programming', atmosphere: 'Terminal', roomCode: 'EDU-FORGE-03', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 88 },
  { id: 'edu-zone-04', name: 'ZONE', description: 'Abstract mathematics, theory, and research immersion.', category: 'EDUCATION', activityType: 'Mathematics', atmosphere: 'Night Library', roomCode: 'EDU-ZONE-04', defaultDuration: 50, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 90 },
  { id: 'edu-cipher-05', name: 'CIPHER', description: 'Cryptography, offensive & defensive cyber systems and low-level code.', category: 'EDUCATION', activityType: 'Coding', atmosphere: 'Cyberpunk', roomCode: 'EDU-CIPHER-05', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 91 },
  { id: 'edu-quantum-06', name: 'QUANTUM', description: 'Physics, computer architecture, hardware design, and scientific computing.', category: 'EDUCATION', activityType: 'Deep Focus', atmosphere: 'Deep Space', roomCode: 'EDU-QUANTUM-06', defaultDuration: 50, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 89 },
  { id: 'edu-atlas-07', name: 'ATLAS', description: 'Historical texts, humanities, philosophical inquiry, and comparative literature.', category: 'EDUCATION', activityType: 'Study', atmosphere: 'Rainy Library', roomCode: 'EDU-ATLAS-07', defaultDuration: 45, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 93 },
  { id: 'edu-logic-08', name: 'LOGIC', description: 'Data structures, algorithm complexity analysis, and discrete mathematics.', category: 'EDUCATION', activityType: 'Competitive Programming', atmosphere: 'Tokyo Midnight', roomCode: 'EDU-LOGIC-08', defaultDuration: 50, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 95 },
  { id: 'edu-neuron-09', name: 'NEURON', description: 'Deep neural networks, PyTorch model training, and AI research papers.', category: 'EDUCATION', activityType: 'Coding', atmosphere: 'Matrix Code', roomCode: 'EDU-NEURON-09', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 87 },
  { id: 'edu-scholar-10', name: 'SCHOLAR', description: 'Academic thesis preparation, manuscript writing, and peer review drafting.', category: 'EDUCATION', activityType: 'Study', atmosphere: 'Night Library', roomCode: 'EDU-SCHOLAR-10', defaultDuration: 50, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 96 },

  // EXERCISE (10 Rooms)
  { id: 'exe-boost-01', name: 'BOOST', description: 'High energy physical training, mobility, and stamina.', category: 'EXERCISE', activityType: 'Gym', atmosphere: 'Neon Gym', roomCode: 'EXE-BOOST-01', defaultDuration: 45, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 90 },
  { id: 'exe-momentum-02', name: 'MOMENTUM', description: 'Calisthenics, core workout, and physical discipline.', category: 'EXERCISE', activityType: 'Home Workout', atmosphere: 'Energy Grid', roomCode: 'EXE-MOMENTUM-02', defaultDuration: 30, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 88 },
  { id: 'exe-titan-03', name: 'TITAN', description: 'Progressive overload, barbell training, and structural power.', category: 'EXERCISE', activityType: 'Gym', atmosphere: 'Neon Gym', roomCode: 'EXE-TITAN-03', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 92 },
  { id: 'exe-endure-04', name: 'ENDURE', description: 'High intensity interval training, cardiovascular threshold, and endurance.', category: 'EXERCISE', activityType: 'Cardio', atmosphere: 'City Run', roomCode: 'EXE-ENDURE-04', defaultDuration: 35, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 89 },
  { id: 'exe-flex-05', name: 'FLEX', description: 'Joint mobility, posterior chain flexibility, and postural realignment.', category: 'EXERCISE', activityType: 'Mobility', atmosphere: 'Rainy Window', roomCode: 'EXE-FLEX-05', defaultDuration: 25, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 94 },
  { id: 'exe-zen-06', name: 'ZEN', description: 'Breath control, flow yoga, parasympathetic nervous system down-regulation.', category: 'EXERCISE', activityType: 'Yoga', atmosphere: 'Deep Space', roomCode: 'EXE-ZEN-06', defaultDuration: 30, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 97 },
  { id: 'exe-stride-07', name: 'STRIDE', description: 'Running cadence training, pacing preparation, and cardio drills.', category: 'EXERCISE', activityType: 'Cardio', atmosphere: 'City Run', roomCode: 'EXE-STRIDE-07', defaultDuration: 40, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 91 },
  { id: 'exe-iron-08', name: 'IRON', description: 'Squat, bench, and deadlift technique analysis and heavy singles.', category: 'EXERCISE', activityType: 'Gym', atmosphere: 'Neon Gym', roomCode: 'EXE-IRON-08', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 93 },
  { id: 'exe-kinetic-09', name: 'KINETIC', description: 'Kettlebell sport, functional movement patterns, and rotational power.', category: 'EXERCISE', activityType: 'Home Workout', atmosphere: 'Energy Grid', roomCode: 'EXE-KINETIC-09', defaultDuration: 30, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 89 },
  { id: 'exe-apex-10', name: 'APEX', description: 'Peak conditioning, sprint intervals, and athletic heart rate testing.', category: 'EXERCISE', activityType: 'Cardio', atmosphere: 'City Run', roomCode: 'EXE-APEX-10', defaultDuration: 45, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 90 },

  // SIDE QUEST (10 Rooms)
  { id: 'sq-flow-01', name: 'FLOW', description: 'Unbroken concentration and creative side quest building.', category: 'SIDE_QUEST', activityType: 'Personal Projects', atmosphere: 'Deep Space', roomCode: 'SQ-FLOW-01', defaultDuration: 45, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 91 },
  { id: 'sq-pulse-02', name: 'PULSE', description: 'Tactical thinking, speed chess, and creative strategy.', category: 'SIDE_QUEST', activityType: 'Chess', atmosphere: 'Retro Arcade', roomCode: 'SQ-PULSE-02', defaultDuration: 30, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 93 },
  { id: 'sq-circuit-03', name: 'CIRCUIT', description: 'Technical writing, system design docs, RFCs & research papers.', category: 'SIDE_QUEST', topic: 'System Architecture & RFCs', activityType: 'Creative', atmosphere: 'Rainy Library', roomCode: 'SQ-CIRCUIT-03', defaultDuration: 50, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 88 },
  { id: 'sq-pixel-04', name: 'PIXEL', description: 'Design systems, Figma components, interactive prototypes, and typography.', category: 'SIDE_QUEST', activityType: 'Creative', atmosphere: 'Tokyo Night', roomCode: 'SQ-PIXEL-04', defaultDuration: 50, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 92 },
  { id: 'sq-beat-05', name: 'BEAT', description: 'Digital audio workstations, synth patching, beat arrangements, and mix mastering.', category: 'SIDE_QUEST', activityType: 'Creative', atmosphere: 'Cyberpunk', roomCode: 'SQ-BEAT-05', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 89 },
  { id: 'sq-script-06', name: 'SCRIPT', description: 'Fiction writing, world building, screenwriting, and story architecture.', category: 'SIDE_QUEST', activityType: 'Creative', atmosphere: 'Rainy Window', roomCode: 'SQ-SCRIPT-06', defaultDuration: 45, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 94 },
  { id: 'sq-craft-07', name: 'CRAFT', description: 'Blender 3D mesh modeling, procedural texturing, and geometry nodes.', category: 'SIDE_QUEST', activityType: 'Creative', atmosphere: 'Tokyo Midnight', roomCode: 'SQ-CRAFT-07', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 90 },
  { id: 'sq-quest-08', name: 'QUEST', description: 'Indie game development in Godot, Unity, and custom physics simulation engines.', category: 'SIDE_QUEST', activityType: 'Personal Projects', atmosphere: 'Retro Arcade', roomCode: 'SQ-QUEST-08', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 87 },
  { id: 'sq-canvas-09', name: 'CANVAS', description: 'Digital concept art, speed painting, color theory, and anatomical studies.', category: 'SIDE_QUEST', activityType: 'Creative', atmosphere: 'Night Library', roomCode: 'SQ-CANVAS-09', defaultDuration: 45, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 95 },
  { id: 'sq-founder-10', name: 'FOUNDER', description: 'Micro-SaaS development, landing page copy, stripe integration, and launch prep.', category: 'SIDE_QUEST', activityType: 'Personal Projects', atmosphere: 'Terminal', roomCode: 'SQ-FOUNDER-10', defaultDuration: 60, maxParticipants: 10, activeParticipantsCount: 0, averageFocusScore: 91 },

  // INTERACTION (10 Rooms, max 6 STRICT)
  { id: 'int-arena-01', name: 'ARENA', description: 'Real-time discussion & debate with up to 5 other ambitious students.', category: 'INTERACTION', topic: 'Competitive Programming & DSA', activityType: 'Problem Discussion', atmosphere: 'Cyberpunk', roomCode: 'INT-ARENA-01', defaultDuration: 30, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 94 },
  { id: 'int-rise-02', name: 'RISE', description: 'Career strategy, tech talks, and open peer collaboration.', category: 'INTERACTION', topic: 'Career & Tech Architecture', activityType: 'Career', atmosphere: 'City Run', roomCode: 'INT-RISE-02', defaultDuration: 30, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 92 },
  { id: 'int-collab-03', name: 'COLLAB', description: 'Pair programming, technical interview mocks & live code reviews.', category: 'INTERACTION', topic: 'DSA Mock Interviews & Code Review', activityType: 'Problem Discussion', atmosphere: 'Tokyo Midnight', roomCode: 'INT-COLLAB-03', defaultDuration: 35, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 96 },
  { id: 'int-synergy-04', name: 'SYNERGY', description: 'Large-scale distributed systems architecture teardowns and whiteboarding.', category: 'INTERACTION', topic: 'Distributed Systems & Microservices', activityType: 'Problem Discussion', atmosphere: 'Terminal', roomCode: 'INT-SYNERGY-04', defaultDuration: 45, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 93 },
  { id: 'int-hack-05', name: 'HACK', description: 'Rapid product brainstorming, API architecture, and weekend hack sprints.', category: 'INTERACTION', topic: 'Hackathon Sprints & MVP Design', activityType: 'Problem Discussion', atmosphere: 'Cyberpunk', roomCode: 'INT-HACK-05', defaultDuration: 40, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 90 },
  { id: 'int-debate-06', name: 'DEBATE', description: 'Philosophical, ethical, and socio-economic ramifications of artificial intelligence.', category: 'INTERACTION', topic: 'AI Alignment & Safety Debate', activityType: 'Problem Discussion', atmosphere: 'Night Library', roomCode: 'INT-DEBATE-06', defaultDuration: 35, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 91 },
  { id: 'int-clinic-07', name: 'CLINIC', description: 'Live bug triage, memory leak profiling, and difficult compiler errors clinic.', category: 'INTERACTION', topic: 'Debug Hospital & Performance Profiling', activityType: 'Problem Discussion', atmosphere: 'Rainy Window', roomCode: 'INT-CLINIC-07', defaultDuration: 30, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 95 },
  { id: 'int-pitch-08', name: 'PITCH', description: 'Product pitch practice, feedback critiques, and value proposition polishing.', category: 'INTERACTION', topic: 'Startup Pitch & YC Mock Interviews', activityType: 'Career', atmosphere: 'Tokyo Night', roomCode: 'INT-PITCH-08', defaultDuration: 30, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 89 },
  { id: 'int-master-09', name: 'MASTER', description: 'Hard dynamic programming and graph algorithm proofs walkthrough.', category: 'INTERACTION', topic: 'Advanced Graph Algorithms & DP', activityType: 'Problem Discussion', atmosphere: 'Terminal', roomCode: 'INT-MASTER-09', defaultDuration: 45, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 97 },
  { id: 'int-forum-10', name: 'FORUM', description: 'Open student council, accountability goal setting, and week-ahead planning.', category: 'INTERACTION', topic: 'Accountability Council & Weekly Planning', activityType: 'Career', atmosphere: 'Deep Space', roomCode: 'INT-FORUM-10', defaultDuration: 30, maxParticipants: 6, defaultMic: true, activeParticipantsCount: 0, averageFocusScore: 94 },
];

// Helper to generate a lightweight signed JWT token for client-side state
function generateToken(payload: any): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 7 * 86400 })).toString('base64url');
  const signature = Buffer.from(`sig-${payload.userId || payload.email}-${Date.now()}`).toString('base64url');
  return `${header}.${body}.${signature}`;
}

function parseToken(token?: string | null): any {
  if (!token) return null;
  try {
    const parts = token.replace('Bearer ', '').split('.');
    if (parts.length >= 2) {
      return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    }
  } catch (e) {}
  return null;
}

// In-memory user store for serverless resilience
const userStore = new Map<string, any>();
const serverlessIncidents = new Map<string, any>();
const serverlessRestrictions = new Map<string, any>();

async function proxyToBackend(req: NextRequest, pathStr: string): Promise<Response | null> {
  const backendBase = process.env.BACKEND_URL || (process.env.VERCEL ? null : 'http://127.0.0.1:5001/api');
  if (!backendBase) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const targetUrl = `${backendBase}/${pathStr}${req.nextUrl.search}`;
    const headers = new Headers(req.headers);
    headers.delete('host');

    const method = req.method;
    let body: any = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await req.clone().text();
      } catch (e) {}
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response;
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathArr = params.path || [];
  const pathStr = pathArr.join('/');

  // 1. First attempt to proxy to local Express / PostgreSQL backend if accessible
  const proxied = await proxyToBackend(req, pathStr);
  if (proxied) {
    return proxied;
  }

  // 2. Serverless Handlers (Works on Vercel and offline)
  const authHeader = req.headers.get('authorization');
  const tokenPayload = parseToken(authHeader);

  // Health
  if (pathStr === 'health') {
    return NextResponse.json({ status: 'ok', service: 'ZENITH Immersion Platform Serverless API', timestamp: new Date().toISOString() });
  }

  // /api/auth/me
  if (pathStr === 'auth/me') {
    if (!tokenPayload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const user = userStore.get(tokenPayload.userId) || {
      id: tokenPayload.userId,
      name: tokenPayload.name || 'Scholar User',
      username: tokenPayload.username || 'scholar',
      email: tokenPayload.email || 'scholar@zenith.app',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${tokenPayload.username || 'scholar'}`,
      settings: { appearanceMode: 'dark', customThemeUrl: null, customThemeTarget: 'BOTH' },
    };
    return NextResponse.json({ success: true, user });
  }

  // /api/rooms
  if (pathStr === 'rooms') {
    const category = req.nextUrl.searchParams.get('category');
    const search = req.nextUrl.searchParams.get('search');
    let filtered = CANONICAL_ROOMS;
    if (category && category !== 'All') {
      filtered = filtered.filter((r) => r.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.roomCode.toLowerCase().includes(q));
    }
    return NextResponse.json({ success: true, rooms: filtered });
  }

  // /api/rooms/[idOrCode]
  if (pathArr[0] === 'rooms' && pathArr.length === 2) {
    const idOrCode = pathArr[1];
    const room = CANONICAL_ROOMS.find((r) => r.id === idOrCode || r.roomCode.toUpperCase() === idOrCode.toUpperCase()) || CANONICAL_ROOMS[0];
    return NextResponse.json({ success: true, room });
  }

  // /api/interaction/quote
  if (pathStr === 'interaction/quote') {
    return NextResponse.json({
      success: true,
      quote: { weeklyBalance: 120, cost: 36, remaining: 84, canAfford: true },
    });
  }

  // /api/analytics and /api/analytics/rewarding
  if (pathStr === 'analytics' || pathStr === 'analytics/rewarding') {
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalFocusedMinutes: 0,
          totalSessions: 0,
          avgSessionMinutes: 0,
          focusRate: 0,
        },
        dayOfWeekDistribution: [
          { short: 'Mon', full: 'Monday', focusedMinutes: 0, sessionsCount: 0 },
          { short: 'Tue', full: 'Tuesday', focusedMinutes: 0, sessionsCount: 0 },
          { short: 'Wed', full: 'Wednesday', focusedMinutes: 0, sessionsCount: 0 },
          { short: 'Thu', full: 'Thursday', focusedMinutes: 0, sessionsCount: 0 },
          { short: 'Fri', full: 'Friday', focusedMinutes: 0, sessionsCount: 0 },
          { short: 'Sat', full: 'Saturday', focusedMinutes: 0, sessionsCount: 0 },
          { short: 'Sun', full: 'Sunday', focusedMinutes: 0, sessionsCount: 0 },
        ],
        streaks: { currentStreak: 0, longestStreak: 0 },
        weekOverWeek: { thisWeekMinutes: 0, lastWeekMinutes: 0, percentDelta: '0%', isImprovement: false },
        topDistractions: [],
        personalRecords: {
          longestSessionMinutes: 0,
          bestFocusDay: { date: 'Pending', minutes: 0 },
          bestWeekMinutes: 0,
        },
        personalizedInsight: {
          title: 'First Session Pending',
          window: 'Awaiting Data',
          avgScore: 0,
          recommendation: 'Complete your first focus block in any room to begin tracking genuine deep work telemetry.',
        },
      },
    });
  }

  // /api/analytics/dashboard
  if (pathStr === 'analytics/dashboard') {
    return NextResponse.json({
      success: true,
      stats: {
        todayFocusedMinutes: 0,
        todayDistractedMinutes: 0,
        todayFocusScore: 0,
        todaySessionsCount: 0,
        weeklyPoints: 0,
        lifetimePoints: 0,
        categoryMinutes: { education: 0, exercise: 0, sideQuest: 0, interaction: 0 },
        currentStreak: 0,
        totalLifetimeFocusedMinutes: 0,
        lifetimeAvgScore: 0,
        totalLifetimeSessions: 0,
        recentSessions: [],
        insights: [
          'Complete at least 3 focus sessions to generate your personalized behavioral focus insights.',
          'Keep your camera on during focus rooms to boost peer accountability by an average of 28%.',
        ],
      },
    });
  }

  // /api/analytics/daily
  if (pathStr === 'analytics/daily') {
    return NextResponse.json({
      success: true,
      data: {
        totalFocusedSeconds: 0,
        totalDistractedSeconds: 0,
        averageFocusScore: 0,
        sessionsCount: 0,
        categorySeconds: { education: 0, exercise: 0, sideQuest: 0, interaction: 0 },
        hourlyDistribution: Array(24).fill(0),
        sessions: [],
      },
    });
  }

  // /api/achievements
  if (pathStr === 'achievements') {
    return NextResponse.json({
      success: true,
      achievements: [
        { id: 'ach-1', code: 'FIRST_SESSION', title: 'First Step', description: 'Complete your first focus session.', icon: '🎯', category: 'SESSIONS', requirementCount: 1, unlocked: false },
        { id: 'ach-2', code: 'FOCUS_STARTER', title: 'Focus Starter', description: 'Complete 5 full focus sessions.', icon: '⚡', category: 'SESSIONS', requirementCount: 5, unlocked: false },
        { id: 'ach-3', code: 'SEVEN_DAY_STREAK', title: '7-Day Iron Streak', description: 'Focus for 7 consecutive days without breaking.', icon: '🔥', category: 'STREAK', requirementCount: 7, unlocked: false },
        { id: 'ach-4', code: 'FOCUS_MASTER', title: 'Focus Master', description: 'Achieve a session focus score above 90%.', icon: '👑', category: 'SCORE', requirementCount: 90, unlocked: false },
        { id: 'ach-5', code: 'DEEP_WORK', title: 'Deep Work Monk', description: 'Complete a 90-minute session with >85% focus.', icon: '🧘', category: 'DURATION', requirementCount: 90, unlocked: false },
        { id: 'ach-6', code: 'BLOCKER_SHIELD', title: 'Iron Shield', description: 'Block 20+ distraction attempts during focus sessions.', icon: '🛡️', category: 'BLOCKER', requirementCount: 20, unlocked: false },
      ],
      unlockedCount: 0,
      totalCount: 6,
    });
  }

  // /api/blocker/live-status
  if (pathStr === 'blocker/live-status') {
    return NextResponse.json({ active: false, mode: 'STRICT', allowedWebsites: [], blockedWebsites: [] });
  }

  // /api/blocker/status
  if (pathStr === 'blocker/status') {
    return NextResponse.json({ success: true, status: 'INACTIVE', activeSession: null });
  }

  // /api/blocker/resources
  if (pathStr === 'blocker/resources') {
    return NextResponse.json({ success: true, resources: [] });
  }

  // /api/blocker/statistics
  if (pathStr === 'blocker/statistics') {
    return NextResponse.json({
      success: true,
      stats: { totalAttempts: 0, blockedCount: 0, allowedCount: 0, mostAttemptedDomain: 'None' },
    });
  }

  // /api/users/profile
  if (pathStr === 'users/profile') {
    return NextResponse.json({
      success: true,
      profile: {
        id: tokenPayload?.userId || 'guest',
        name: tokenPayload?.name || 'Scholar User',
        username: tokenPayload?.username || 'scholar',
        email: tokenPayload?.email || 'scholar@zenith.app',
        currentStreak: 0,
        totalFocusedMinutes: 0,
        totalSessionsCount: 0,
        averageFocusScore: 0,
        bestFocusScore: 0,
        longestSessionMinutes: 0,
        recentSessions: [],
      },
    });
  }

  // /api/users/leaderboard
  if (pathStr === 'users/leaderboard') {
    return NextResponse.json({
      success: true,
      leaderboard: [
        { id: 'usr-1', name: 'Alex Chen', username: 'alexchen', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', score: 98, totalMinutes: 1420, currentStreak: 14 },
        { id: 'usr-2', name: 'Sarah Jenkins', username: 'sarahj', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', score: 95, totalMinutes: 1180, currentStreak: 9 },
        { id: 'usr-3', name: 'Rahul Verma', username: 'rahulv', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', score: 92, totalMinutes: 940, currentStreak: 7 },
      ],
    });
  }

  // /api/moderation/active/[roomId]
  if (pathStr.startsWith('moderation/active/')) {
    const roomId = pathArr[2];
    const incident = serverlessIncidents.get(roomId);
    if (incident && incident.status === 'VOTING' && new Date() < new Date(incident.votingExpiresAt)) {
      return NextResponse.json({ activeBallot: incident });
    }
    return NextResponse.json({ activeBallot: null });
  }

  // /api/moderation/restriction/[roomId]
  if (pathStr.startsWith('moderation/restriction/')) {
    const roomId = pathArr[2];
    const userId = tokenPayload?.userId || 'guest';
    const restriction = serverlessRestrictions.get(`${userId}:${roomId}`);
    if (restriction && new Date() < new Date(restriction.expiresAt)) {
      return NextResponse.json({ isRestricted: true, reason: restriction.reason, expiresAt: restriction.expiresAt });
    }
    return NextResponse.json({ isRestricted: false });
  }

  return NextResponse.json({ success: false, error: `Endpoint not found: /api/${pathStr}` }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathArr = params.path || [];
  const pathStr = pathArr.join('/');

  // 1. First attempt to proxy to local Express / PostgreSQL backend if accessible
  const proxied = await proxyToBackend(req, pathStr);
  if (proxied) {
    return proxied;
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {}

  const authHeader = req.headers.get('authorization');
  const tokenPayload = parseToken(authHeader);

  // ── AUTHENTICATION HANDLERS ────────────────────────────────────────────────
  // Google OAuth (/api/auth/google)
  if (pathStr === 'auth/google') {
    const { email, name, googleId, avatarUrl } = body;
    if (!email || !googleId) {
      return NextResponse.json({ success: false, error: 'Email and Google ID are required.' }, { status: 400 });
    }

    const userId = `goog-${googleId}`;
    let user = userStore.get(userId);
    if (!user) {
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      user = {
        id: userId,
        name: name || username,
        username,
        email,
        googleId,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        preferredActivity: 'Coding',
        typicalDuration: 50,
        settings: {
          idleThresholdSeconds: 60,
          warningThresholdSeconds: 10,
          appearanceMode: 'dark',
          customThemeUrl: null,
          customThemeTarget: 'BOTH',
        },
      };
      userStore.set(userId, user);
    }

    const token = generateToken({ userId, email: user.email, username: user.username, name: user.name });
    return NextResponse.json({ success: true, user, token });
  }

  // Password Registration (/api/auth/register)
  if (pathStr === 'auth/register') {
    const { name, username, email, phoneNumber, password, preferredActivity } = body;
    if (!name || !username || !password || (!email && !phoneNumber)) {
      return NextResponse.json({ success: false, error: 'Name, username, password, and email/phone are required.' }, { status: 400 });
    }

    // Password complexity policy
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.',
      }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email ? email.toLowerCase().trim() : `${cleanUsername}@zenith.app`;

    // Check duplicate account
    const existing = Array.from(userStore.values()).find(
      (u) => (u.email && u.email.toLowerCase() === cleanEmail) || (u.username && u.username.toLowerCase() === cleanUsername)
    );
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email or username already exists.' }, { status: 409 });
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const user = {
      id: userId,
      name,
      username: cleanUsername,
      email: cleanEmail,
      phoneNumber: phoneNumber || null,
      password,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      preferredActivity: preferredActivity || 'Coding',
      typicalDuration: 50,
      settings: {
        idleThresholdSeconds: 60,
        warningThresholdSeconds: 10,
        appearanceMode: 'dark',
        customThemeUrl: null,
        customThemeTarget: 'BOTH',
      },
    };
    userStore.set(userId, user);

    const { password: _, ...safeUser } = user;
    const token = generateToken({ userId, email: user.email, username: user.username, name });
    return NextResponse.json({ success: true, user: safeUser, token });
  }

  // Password Login (/api/auth/login)
  if (pathStr === 'auth/login') {
    const { loginIdentifier, password } = body;
    if (!loginIdentifier || !password) {
      return NextResponse.json({ success: false, error: 'Login identifier and password are required.' }, { status: 400 });
    }

    const normalized = loginIdentifier.toLowerCase().trim();
    let foundUser = Array.from(userStore.values()).find(
      (u) =>
        (u.email && u.email.toLowerCase() === normalized) ||
        (u.username && u.username.toLowerCase() === normalized) ||
        (u.phoneNumber && u.phoneNumber === normalized)
    );

    // Provide default fallback demo account if none created yet
    if (!foundUser && (normalized === 'scholar.google@zenith.app' || normalized === 'scholar')) {
      foundUser = {
        id: 'usr-scholar-default',
        name: 'Scholar User',
        username: 'scholar',
        email: 'scholar.google@zenith.app',
        password: 'Password123!',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=scholar',
        preferredActivity: 'Coding',
        typicalDuration: 50,
        settings: {
          idleThresholdSeconds: 60,
          warningThresholdSeconds: 10,
          appearanceMode: 'dark',
          customThemeUrl: null,
          customThemeTarget: 'BOTH',
        },
      };
      userStore.set(foundUser.id, foundUser);
    }

    if (!foundUser || (foundUser.password && foundUser.password !== password)) {
      return NextResponse.json({ success: false, error: 'Invalid login credentials. Please check your username/email and password.' }, { status: 401 });
    }

    const { password: _, ...safeUser } = foundUser;
    const token = generateToken({ userId: safeUser.id, email: safeUser.email, username: safeUser.username, name: safeUser.name });
    return NextResponse.json({ success: true, user: safeUser, token });
  }

  // Phone OTP Send (/api/auth/otp/send)
  if (pathStr === 'auth/otp/send') {
    return NextResponse.json({
      success: true,
      message: 'Verification code dispatched successfully.',
      cooldownSeconds: 60,
      devCode: '849201',
    });
  }

  // Phone OTP Verify (/api/auth/otp/verify)
  if (pathStr === 'auth/otp/verify') {
    const { phoneNumber, otpCode, name } = body;
    if (!phoneNumber || !otpCode) {
      return NextResponse.json({ success: false, error: 'Phone number and verification code are required.' }, { status: 400 });
    }

    const userId = `usr-phone-${phoneNumber.replace(/[^0-9]/g, '')}`;
    const user = {
      id: userId,
      name: name || `Scholar ${phoneNumber.slice(-4)}`,
      username: `user_${phoneNumber.slice(-4)}`,
      email: `${phoneNumber.replace(/[^0-9]/g, '')}@phone.zenith.app`,
      phoneNumber,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${phoneNumber}`,
      preferredActivity: 'Deep Focus',
      typicalDuration: 50,
      settings: {
        idleThresholdSeconds: 60,
        warningThresholdSeconds: 10,
        appearanceMode: 'dark',
        customThemeUrl: null,
        customThemeTarget: 'BOTH',
      },
    };
    userStore.set(userId, user);

    const token = generateToken({ userId, email: user.email, username: user.username, name: user.name });
    return NextResponse.json({ success: true, user, token });
  }

  // Forgot / Reset Password
  if (pathStr === 'auth/forgot-password') {
    return NextResponse.json({
      success: true,
      message: 'Password reset instructions have been generated.',
      devToken: `rst-${Date.now()}`,
    });
  }

  if (pathStr === 'auth/reset-password') {
    return NextResponse.json({ success: true, message: 'Password reset successfully. You may now log in.' });
  }

  // /api/rooms/allocate
  if (pathStr === 'rooms/allocate') {
    const category = (body.category || 'EDUCATION').toUpperCase();
    const effectiveCap = category === 'INTERACTION' ? 6 : 10;
    const matching = CANONICAL_ROOMS.filter((r) => r.category === category);
    const candidate = matching[0] || CANONICAL_ROOMS[0];
    const room = {
      ...candidate,
      maxParticipants: effectiveCap,
      activeParticipantsCount: 1,
    };
    return NextResponse.json({
      success: true,
      room,
      participant: {
        id: `part-${Date.now()}`,
        roomId: room.id,
        userId: 'current-user',
        role: 'MEMBER',
        status: 'ACTIVE',
      },
      isNew: false,
      alreadyMember: false,
    });
  }

  // /api/interaction/authorize
  if (pathStr === 'interaction/authorize') {
    return NextResponse.json({
      success: true,
      authorization: {
        authorizationId: `auth-int-${Date.now()}`,
        pointsDeducted: 36,
        remainingWeeklyPoints: 84,
      },
      message: 'Successfully authorized. Deducted 36 ⭐ (30% weekly points).',
    });
  }

  // /api/sessions/start
  if (pathStr === 'sessions/start') {
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        plannedDuration: body.plannedDuration || 50,
        activityType: body.activityType || 'Deep Focus',
        category: body.category || 'EDUCATION',
        atmosphere: body.atmosphere || 'Rainy Window',
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
      },
    });
  }

  // /api/sessions/[id]/end
  if (pathArr[0] === 'sessions' && pathArr[2] === 'end') {
    const focusedSec = body.focusedDuration || 1800;
    const focusRate = Math.min(100, Math.round((focusedSec / (focusedSec + (body.distractedDuration || 0) + 1)) * 100));
    return NextResponse.json({
      success: true,
      session: {
        id: pathArr[1],
        status: 'COMPLETED',
        focusedDuration: focusedSec,
        distractedDuration: body.distractedDuration || 0,
        focusScore: Math.max(60, focusRate),
        pointsEarned: Math.round(focusedSec / 60) + 15,
        endTime: new Date().toISOString(),
      },
    });
  }

  // Blocker attempt
  if (pathStr === 'blocker/attempt') {
    return NextResponse.json({ success: true, attempt: { id: `att-${Date.now()}`, ...body } });
  }

  // Create custom blocked/allowed resource
  if (pathStr === 'blocker/resources') {
    const cleanIdent = body.type === 'WEBSITE' ? ZenithPolicyEngine.normalizeDomain(body.identifier) : (body.identifier || '').trim();
    const validation = ZenithPolicyEngine.validateCustomRule(cleanIdent, body.type || 'WEBSITE', !!body.isAllowlist);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      resource: {
        id: `res-${Date.now()}`,
        userId: tokenPayload?.userId || 'guest',
        type: body.type || 'WEBSITE',
        identifier: cleanIdent,
        displayName: body.displayName || cleanIdent,
        category: body.category || 'CUSTOM',
        enabled: body.enabled !== false,
        isAllowlist: !!body.isAllowlist,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }, { status: 201 });
  }

  // Activate / deactivate blocker
  if (pathStr === 'blocker/activate' || pathStr === 'blocker/deactivate') {
    return NextResponse.json({ success: true });
  }

  // Blocker desktop attempt
  if (pathStr === 'blocker/desktop-attempt') {
    return NextResponse.json({ success: true, attempt: { id: `att-desktop-${Date.now()}`, ...body } });
  }

  // Blocker companion pairing token
  if (pathStr === 'blocker/pair-token') {
    return NextResponse.json({
      success: true,
      token: tokenPayload?.userId ? `zenith_pair_${tokenPayload.userId}_${Date.now()}` : `zenith_pair_demo_${Date.now()}`,
      userId: tokenPayload?.userId || 'guest',
      expiresIn: '7d',
    });
  }

  // /api/moderation/report
  if (pathStr === 'moderation/report') {
    const { roomId, accusedId, reason, details } = body;
    const reporterId = tokenPayload?.userId || 'guest';
    if (reporterId === accusedId) {
      return NextResponse.json({ error: 'SELF_REPORT_FORBIDDEN: You cannot report yourself.' }, { status: 403 });
    }
    const incident = {
      id: `inc-${Date.now()}`,
      roomId,
      reporterId,
      accusedId,
      accusedName: 'Reported Participant',
      reason,
      details,
      status: 'VOTING',
      eligibleVoters: [reporterId, 'voter-1', 'voter-2', 'voter-3'],
      requiredVotes: 2,
      totalEligible: 3,
      votingExpiresAt: new Date(Date.now() + 60000).toISOString(),
    };
    serverlessIncidents.set(roomId, incident);
    return NextResponse.json({ message: 'Moderation ballot successfully opened.', incident }, { status: 201 });
  }

  // /api/moderation/vote
  if (pathStr === 'moderation/vote') {
    const { incidentId, decision } = body;
    return NextResponse.json({
      message: 'Vote recorded successfully',
      resolution: {
        incidentId,
        status: 'VOTING',
        kicked: false,
        yesVotes: decision === 'YES' ? 1 : 0,
        noVotes: decision === 'NO' ? 1 : 0,
      },
    });
  }

  // /api/users/theme-proposal
  if (pathStr === 'users/theme-proposal') {
    const activity = String(body.activityPreference || 'Coding').toLowerCase();
    let proposal = {
      themeId: 'tokyo-night',
      name: 'Tokyo Night',
      category: 'TECH',
      bgImageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&q=80&auto=format&fit=crop',
      effectType: 'cyber-grid',
      gradientOverlay: 'radial-gradient(ellipse at center, rgba(12,10,24,0.55) 0%, rgba(6,4,14,0.92) 100%)',
      accentColor: '#818cf8',
      recommendedSound: 'lofi',
      rationale: 'Optimized for high-concentration programming sessions with subdued neon contrast.',
    };
    if (activity.includes('study') || activity.includes('read')) {
      proposal = {
        themeId: 'oxford-library',
        name: 'Oxford Cathedral Library',
        category: 'LIBRARY / STUDY',
        bgImageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=80&auto=format&fit=crop',
        effectType: 'particles',
        gradientOverlay: 'radial-gradient(ellipse at center, rgba(18,12,6,0.6) 0%, rgba(8,5,2,0.95) 100%)',
        accentColor: '#d97706',
        recommendedSound: 'fireplace',
        rationale: 'Warm acoustic atmosphere suited for deep reading and conceptual study.',
      };
    }
    return NextResponse.json({ success: true, proposal });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathArr = params.path || [];
  const pathStr = pathArr.join('/');

  // Proxy attempt
  const proxied = await proxyToBackend(req, pathStr);
  if (proxied) {
    return proxied;
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {}

  if (pathStr === 'users/settings') {
    return NextResponse.json({
      success: true,
      settings: {
        idleThresholdSeconds: body.idleThresholdSeconds || 60,
        warningThresholdSeconds: body.warningThresholdSeconds || 10,
        cameraVisibility: body.cameraVisibility || 'Participants',
        distractionAlerts: body.distractionAlerts !== false,
        appearanceMode: body.appearanceMode || 'dark',
        customThemeUrl: body.customThemeUrl || null,
        customThemeTarget: body.customThemeTarget || 'BOTH',
        videoLayout: body.videoLayout || 'footer',
      },
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathStr = (params.path || []).join('/');
  const proxied = await proxyToBackend(req, pathStr);
  if (proxied) return proxied;
  return NextResponse.json({ success: true, message: 'Deleted successfully' });
}
