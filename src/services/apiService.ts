import type {
  SessionCheckResponse,
  SessionCreateResponse,
  SessionData,
  AdminSession
} from '../types/session';

const API_BASE = '/api';

export const apiService = {
  // Sessions
  async checkNickname(nickname: string): Promise<SessionCheckResponse> {
    const res = await fetch(`${API_BASE}/sessions/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });
    return res.json();
  },

  async createSession(nickname: string): Promise<SessionCreateResponse> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });
    return res.json();
  },

  async getSession(sessionId: string): Promise<SessionData> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    return res.json();
  },

  async completeSession(sessionId: string, totalTimeMs: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalTimeMs })
    });
    return res.json();
  },

  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  // Passages
  async savePassageResult(
    sessionId: string,
    passageIndex: number,
    data: {
      passageId: number;
      screenshot: string;
      cursorHistory: any[];
      wrongAttempts: number;
      timeSpentMs: number;
      selectedAnswer: string;
    }
  ): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/passages/${sessionId}/${passageIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async recordAttempt(
    sessionId: string,
    passageIndex: number,
    data: {
      selectedAnswer: string;
      isCorrect: boolean;
      geminiResponse: string;
    }
  ): Promise<{ success: boolean; attemptNumber: number }> {
    const res = await fetch(`${API_BASE}/passages/${sessionId}/${passageIndex}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Admin
  async getAdminSessions(status?: string): Promise<{ sessions: AdminSession[] }> {
    const url = status
      ? `${API_BASE}/admin/sessions?status=${status}`
      : `${API_BASE}/admin/sessions`;
    const res = await fetch(url);
    return res.json();
  },

  async getAdminSessionDetail(sessionId: string): Promise<SessionData> {
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}`);
    return res.json();
  },

  async deleteAdminSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    return res.json();
  }
};
