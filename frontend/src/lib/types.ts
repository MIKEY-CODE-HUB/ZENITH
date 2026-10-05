export type ActivityCategory = 'EDUCATION' | 'EXERCISE' | 'SIDE_QUEST' | 'INTERACTION';

export type ActivityType =
  | 'Deep Focus'
  | 'Coding'
  | 'Competitive Programming'
  | 'DSA'
  | 'Mathematics'
  | 'Exam Prep'
  | 'Research'
  | 'Projects'
  | 'Reading / Study'
  | 'Reading'
  | 'Practice'
  | 'Gym'
  | 'Home Workout'
  | 'Running'
  | 'Cardio'
  | 'Mobility'
  | 'Recovery'
  | 'Chess'
  | 'Creative'
  | 'Personal Projects'
  | 'Writing'
  | 'Exploration'
  | 'Problem Discussion'
  | 'Career'
  | 'College'
  | 'Casual'
  | 'Study'
  | 'Work'
  | 'Other';

export type FocusStatus = 'FOCUSED' | 'IDLE' | 'DISTRACTED' | 'OFFLINE';

export interface UserSettings {
  id: string;
  userId: string;
  idleThresholdSeconds: number;
  warningThresholdSeconds: number;
  autoStartTimer: boolean;
  cameraVisibility: string;
  activityVisibility: string;
  showFocusScore: boolean;
  distractionAlerts: boolean;
  sessionCompleteAlerts: boolean;
  streakReminders: boolean;
  blockerMode?: 'MONITOR' | 'BLOCK' | 'STRICT';
  blockWebsitesEnabled?: boolean;
  blockAppsEnabled?: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  preferredActivity: string;
  typicalDuration: number;
  cameraAccountability: boolean;
  distractionWarnings: boolean;
  streakTracking: boolean;
  settings?: UserSettings;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  category: ActivityCategory;
  topic?: string;
  activityType: string;
  atmosphere?: string;
  isSharedAtmosphere?: boolean;
  roomCode: string;
  isPrivate: boolean;
  maxParticipants: number;
  defaultDuration: number;
  defaultCamera: boolean;
  defaultMic: boolean;
  creator?: {
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  activeParticipantsCount: number;
  participants?: User[];
  averageFocusScore: number;
  createdAt: string;
}

export interface ParticipantPresence {
  socketId: string;
  userId: string;
  name: string;
  username: string;
  avatarUrl: string;
  activityType: string;
  category?: ActivityCategory;
  focusStatus: FocusStatus;
  focusStreakMinutes: number;
  cameraOn: boolean;
  micOn: boolean;
  speaking?: boolean;
  joinedAt: string;
  isSimulated?: boolean;
}

export interface FocusEvent {
  id?: string;
  sessionId?: string;
  eventType: 'TAB_SWITCH' | 'IDLE' | 'FOCUSED' | 'WINDOW_BLUR' | 'WINDOW_FOCUS' | 'WARNING' | 'BLOCK_ATTEMPT' | 'ROOM_JOIN' | 'ROOM_LEAVE' | 'SESSION_START' | 'SESSION_END';
  startTime: string;
  endTime?: string | null;
  duration: number; // in seconds
  metadata?: string;
}

export interface BlockedResource {
  id: string;
  userId?: string | null;
  type: 'WEBSITE' | 'APPLICATION';
  identifier: string;
  displayName: string;
  category: 'SOCIAL' | 'ENTERTAINMENT' | 'MESSAGING' | 'MUSIC' | 'GAMES' | 'CUSTOM' | 'SESSION' | 'PERSISTENT' | string;
  enabled: boolean;
  isAllowlist: boolean;
  createdAt: string;
}

export interface BlockAttempt {
  id: string;
  userId: string;
  sessionId?: string | null;
  resourceId?: string | null;
  resourceType: 'WEBSITE' | 'APPLICATION';
  resourceIdentifier: string;
  timestamp: string;
  action: string;
}

export interface BlockerSession {
  id: string;
  userId: string;
  focusSessionId: string;
  mode: 'MONITOR' | 'BLOCK' | 'STRICT';
  startedAt: string;
  endedAt?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface FocusSession {
  id: string;
  userId: string;
  roomId?: string | null;
  room?: Room | null;
  category?: ActivityCategory;
  activityType: string;
  specificActivity?: string;
  atmosphere?: string;
  startTime: string;
  endTime?: string | null;
  plannedDuration: number;
  focusedDuration: number;
  idleDuration: number;
  distractedDuration: number;
  tabSwitchCount: number;
  warningCount: number;
  blockAttemptCount: number;
  longestFocusStreak: number;
  baseScore: number;
  penaltyScore: number;
  focusScore: number;
  pointsEarned?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  notes?: string | null;
  events?: FocusEvent[];
  blockAttempts?: BlockAttempt[];
  createdAt: string;
}

export interface ScoreBreakdown {
  baseScore: number;
  tabSwitchPenalty: number;
  distractionPenalty: number;
  idlePenalty: number;
  warningPenalty: number;
  blockAttemptPenalty: number;
  totalPenalty: number;
  finalScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  focusRate: number;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  requirementCount: number;
  unlocked?: boolean;
  unlockedAt?: string | null;
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: string;
  source: string;
  sessionId?: string;
  createdAt: string;
  metadata?: string;
}

export interface PointSummary {
  weeklyPoints: number;
  lifetimePoints: number;
  currentStreakDays: number;
}

export interface InteractionQuote {
  weeklyBalance: number;
  cost: number;
  remaining: number;
  canAfford: boolean;
}

export interface InteractionAuthorization {
  authorizationId: string;
  pointsDeducted: number;
  remainingWeeklyPoints: number;
}

export interface LeaderboardItem {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  preferredActivity: string;
  streak: number;
  totalFocusedMinutes: number;
  averageScore: number;
  sessionsCount: number;
}

export interface BlockerStatistics {
  activeSession: {
    id: string;
    mode: 'MONITOR' | 'BLOCK' | 'STRICT';
    focusSessionId: string;
    activityType: string;
    startedAt: string;
  } | null;
  stats: {
    attemptsToday: number;
    attemptsThisWeek: number;
    totalBlockedWebsites: number;
    totalBlockedApps: number;
    topDistractions: Array<{ identifier: string; type: string; count: number }>;
    insights: string[];
  };
}

export interface DashboardStats {
  todayFocusedMinutes: number;
  todayDistractedMinutes: number;
  todayFocusScore: number;
  todaySessionsCount: number;
  weeklyPoints: number;
  lifetimePoints: number;
  categoryMinutes: {
    education: number;
    exercise: number;
    sideQuest: number;
    interaction: number;
  };
  currentStreak: number;
  totalLifetimeFocusedMinutes: number;
  lifetimeAvgScore: number;
  totalLifetimeSessions: number;
  recentSessions: FocusSession[];
  insights: string[];
}
