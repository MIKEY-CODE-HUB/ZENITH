import { BlockedResource, BlockerStatistics } from './types';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/api';
};

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('trapbreaker_token');
  }

  public setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trapbreaker_token', token);
    }
  }

  public clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('trapbreaker_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Auth Endpoints
  async register(body: { name: string; username: string; email: string; password: string; preferredActivity?: string }) {
    return this.request<{ success: boolean; user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async login(body: { loginIdentifier: string; password: string }) {
    return this.request<{ success: boolean; user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async demoLogin(username: string = 'mikey') {
    return this.request<{ success: boolean; user: any; token: string }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async getMe() {
    return this.request<{ success: boolean; user: any }>('/auth/me');
  }

  async updateOnboarding(body: any) {
    return this.request<{ success: boolean; user: any }>('/auth/onboarding', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Rooms Endpoints
  async getRooms(params?: { category?: string; activity?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.append('category', params.category);
    if (params?.activity && params.activity !== 'All') query.append('activity', params.activity);
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; rooms: any[] }>(`/rooms${queryString}`);
  }

  async getRoom(idOrCode: string) {
    return this.request<{ success: boolean; room: any }>(`/rooms/${idOrCode}`);
  }

  async createRoom(body: {
    name: string;
    description?: string;
    category?: string;
    topic?: string;
    activityType: string;
    atmosphere?: string;
    duration: number;
    isPrivate: boolean;
    maxParticipants: number;
    camera: boolean;
    mic: boolean;
  }) {
    return this.request<{ success: boolean; room: any }>('/rooms', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async joinRoom(roomId: string) {
    return this.request<{ success: boolean; participant: any; room: any }>(`/rooms/${roomId}/join`, {
      method: 'POST',
    });
  }

  async leaveRoom(roomId: string) {
    return this.request<{ success: boolean; message: string }>(`/rooms/${roomId}/leave`, {
      method: 'POST',
    });
  }

  // Interaction Endpoints
  async getInteractionQuote() {
    return this.request<{ success: boolean; quote: { weeklyBalance: number; cost: number; remaining: number; canAfford: boolean } }>('/interaction/quote');
  }

  async authorizeInteraction(roomId: string) {
    return this.request<{
      success: boolean;
      authorization: { authorizationId: string; pointsDeducted: number; remainingWeeklyPoints: number };
      message: string;
    }>('/interaction/authorize', {
      method: 'POST',
      body: JSON.stringify({ roomId }),
    });
  }

  async reportUser(body: { reportedId: string; roomId?: string; reason: string; details?: string }) {
    return this.request<{ success: boolean; message: string; reportId: string }>('/interaction/report', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async blockUser(blockedId: string) {
    return this.request<{ success: boolean; message: string }>('/interaction/block', {
      method: 'POST',
      body: JSON.stringify({ blockedId }),
    });
  }

  // Points Endpoints
  async getPoints() {
    return this.request<{
      success: boolean;
      summary: { weeklyPoints: number; lifetimePoints: number; currentStreakDays: number };
      transactions: any[];
    }>('/points');
  }

  // Sessions Endpoints
  async startSession(body: {
    roomId?: string | null;
    category?: string;
    activityType?: string;
    specificActivity?: string;
    atmosphere?: string;
    plannedDuration: number;
  }) {
    return this.request<{ success: boolean; session: any }>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async logEvents(sessionId: string, events: any[]) {
    return this.request<{ success: boolean; message: string }>(`/sessions/${sessionId}/events`, {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  }

  async endSession(sessionId: string, body: {
    focusedDuration: number;
    distractedDuration: number;
    idleDuration: number;
    tabSwitchCount: number;
    warningCount: number;
    blockAttemptCount?: number;
    longestFocusStreak: number;
    notes?: string;
  }) {
    return this.request<{
      success: boolean;
      session: any;
      scoreBreakdown: any;
      newAchievements: any[];
      currentStreak: number;
      comparison: { previousScore: number | null; scoreDelta: number | null; scoreImprovementPercent: number | null };
    }>(`/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getHistory(params?: { activity?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.activity && params.activity !== 'All') query.append('activity', params.activity);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; sessions: any[]; pagination: any }>(`/sessions/history${qs}`);
  }

  async getSession(id: string) {
    return this.request<{ success: boolean; session: any }>(`/sessions/${id}`);
  }

  // Analytics Endpoints
  async getDashboardStats() {
    return this.request<{ success: boolean; stats: any }>('/analytics/dashboard');
  }

  async getDaily() {
    return this.request<{ success: boolean; data: any }>('/analytics/daily');
  }

  async getWeekly() {
    return this.request<{ success: boolean; data: any[] }>('/analytics/weekly');
  }

  async getMonthly() {
    return this.request<{ success: boolean; data: any[] }>('/analytics/monthly');
  }

  async getActivity() {
    return this.request<{ success: boolean; data: any[] }>('/analytics/activity');
  }

  async getRewardingAnalytics() {
    return this.request<{ success: boolean; data: any }>('/analytics/rewarding');
  }

  // Achievements
  async getAchievements() {
    return this.request<{ success: boolean; achievements: any[]; unlockedCount: number; totalCount: number }>('/achievements');
  }

  // User Profile & Settings & Leaderboard
  async getProfile() {
    return this.request<{ success: boolean; profile: any }>('/users/profile');
  }

  async updateSettings(settings: any) {
    return this.request<{ success: boolean; settings: any }>('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getLeaderboard(metric: string = 'score') {
    return this.request<{ success: boolean; metric: string; leaderboard: any[] }>(`/users/leaderboard?metric=${metric}`);
  }

  // ══════════════════════════════════════════════════════════
  // BLOCKER ENDPOINTS
  // ══════════════════════════════════════════════════════════
  async getBlockerResources() {
    return this.request<{ success: boolean; resources: BlockedResource[] }>('/blocker/resources');
  }

  async createBlockerResource(body: {
    type: 'WEBSITE' | 'APPLICATION';
    identifier: string;
    displayName: string;
    category?: string;
    isAllowlist?: boolean;
    enabled?: boolean;
  }) {
    return this.request<{ success: boolean; resource: BlockedResource }>('/blocker/resources', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateBlockerResource(id: string, body: Partial<{
    displayName: string;
    enabled: boolean;
    isAllowlist: boolean;
    category: string;
  }>) {
    return this.request<{ success: boolean; resource: BlockedResource }>(`/blocker/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteBlockerResource(id: string) {
    return this.request<{ success: boolean; message: string }>(`/blocker/resources/${id}`, {
      method: 'DELETE',
    });
  }

  async getBlockerStatus() {
    return this.request<{ success: boolean; status: string; activeSession: any }>('/blocker/status');
  }

  async activateBlocker(focusSessionId: string, mode: 'MONITOR' | 'BLOCK' | 'STRICT' = 'BLOCK') {
    return this.request<{
      success: boolean;
      blockerSession: any;
      blockerToken: string;
      config: { mode: string; blockedWebsites: string[]; blockedApps: string[]; allowedWebsites: string[] };
    }>('/blocker/activate', {
      method: 'POST',
      body: JSON.stringify({ focusSessionId, mode }),
    });
  }

  async deactivateBlocker(focusSessionId: string) {
    return this.request<{ success: boolean; message: string }>('/blocker/deactivate', {
      method: 'POST',
      body: JSON.stringify({ focusSessionId }),
    });
  }

  async recordBlockerAttempt(body: {
    sessionId?: string;
    resourceType: 'WEBSITE' | 'APPLICATION';
    resourceIdentifier: string;
    action?: string;
  }) {
    return this.request<{ success: boolean; attempt: any }>('/blocker/attempt', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getBlockerStatistics() {
    return this.request<{ success: boolean; activeSession: any; stats: BlockerStatistics['stats'] }>('/blocker/statistics');
  }

  async getActivityBlockList(activityType: string) {
    return this.request<{ success: boolean; activityType: string; items: any[] }>(`/blocker/activity/${activityType}`);
  }

  async updateActivityBlockList(activityType: string, resourceIds: string[]) {
    return this.request<{ success: boolean; activityType: string; items: any[] }>(`/blocker/activity/${activityType}`, {
      method: 'PUT',
      body: JSON.stringify({ resourceIds }),
    });
  }

  async updateBlockerSettings(body: {
    blockerMode?: string;
    blockWebsitesEnabled?: boolean;
    blockAppsEnabled?: boolean;
  }) {
    return this.request<{ success: boolean; settings: any }>('/blocker/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
}

export const api = new ApiClient();
