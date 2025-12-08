import type {
  SessionCheckResponse,
  SessionCreateResponse,
  SessionData,
  AdminSession,
  UserDemographics
} from '../types/session';

const API_BASE = '/api';

export const apiService = {
  // Sessions
  async checkEmail(email: string): Promise<SessionCheckResponse> {
    const res = await fetch(`${API_BASE}/sessions/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  async createSession(email: string, demographics?: UserDemographics): Promise<SessionCreateResponse> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...demographics })
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
      screenshot?: string;
      readingSummary?: string;
    }
  ): Promise<{ success: boolean; attemptNumber: number }> {
    const res = await fetch(`${API_BASE}/passages/${sessionId}/${passageIndex}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },


  // Admin Authentication
  async adminLogin(password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return res.json();
  },

  // Admin
  async getAdminSessions(status?: string, includeDirty: boolean = false): Promise<{ sessions: AdminSession[] }> {
    const token = localStorage.getItem('admin_token');
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (includeDirty) params.set('includeDirty', 'true');
    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE}/admin/sessions?${queryString}`
      : `${API_BASE}/admin/sessions`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  async getAdminSessionDetail(sessionId: string): Promise<SessionData> {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  async deleteAdminSession(sessionId: string): Promise<{ success: boolean }> {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  async toggleSessionDirty(sessionId: string, isDirty: boolean): Promise<{ success: boolean; is_dirty: boolean }> {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_dirty: isDirty })
    });
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  async getPassageAnalytics(): Promise<{
    passages: Array<{
      passageId: string;
      title: string;
      totalAttempts: number;
      firstTryCorrectPct: number;
      eventuallyCorrectPct: number;
      avgTimeMs: number;
    }>;
  }> {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/admin/analytics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  async getPassageDetail(passageId: string): Promise<{
    passage: { id: string; title: string; index: number; text: string; question: string; choices: string[]; correctAnswer: number };
    overview: { totalParticipants: number; avgTimeMs: number; firstTryRate: number; totalAttempts: number };
    participants: Array<{
      sessionId: string;
      email: string;
      timeSpentMs: number;
      wrongAttempts: number;
      isCorrect: boolean;
      latestAttemptScreenshot: string | null;
      latestGeminiResponse: string | null;
      passageIndex: number;
    }>;
    sentenceStats: Array<{
      index: number;
      text: string;
      avgDwellMs: number;
      avgVisits: number;
      avgReadingOrder: number | null;
      timesRead: number;
    }>;
    answerDistribution: Array<{
      choice: string;
      count: number;
      percentage: number;
      isCorrect: boolean;
    }>;
    trapAnswer: { choice: string; count: number; percentage: number } | null;
    correctFeedbackSamples: Array<{ response: string }>;
    wrongFeedbackSamples: Array<{ response: string }>;
  }> {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_BASE}/admin/passages/${passageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    return res.json();
  },

  // Email
  async sendStudyLink(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/send-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  async sendWelcomeEmail(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  // Questionnaire
  async submitQuestionnaire(
    sessionId: string,
    responses: {
      question1: string;
      question2: string;
      question3: string;
    }
  ): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/questionnaire/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responses)
    });
    return res.json();
  }
};
