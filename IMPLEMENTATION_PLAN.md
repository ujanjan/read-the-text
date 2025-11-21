# Cloud Storage Implementation Plan

## Overview

Migrate the reading comprehension app from client-side state to Cloudflare infrastructure (D1 + R2) to support multiple users with persistent sessions.

**Target**: ~50 concurrent users
**Stack**: Cloudflare Pages + Workers + D1 + R2

---

## Phase 1: Backend Infrastructure Setup

### 1.1 Initialize Cloudflare Workers

Create a new Workers project for API endpoints.

```bash
# In project root
npx wrangler init api --type=javascript
```

**File structure:**
```
/api
  /src
    index.ts              # Main worker entry
    /routes
      sessions.ts         # Session CRUD
      passages.ts         # Passage results
      admin.ts            # Admin endpoints
    /services
      d1.ts               # D1 database operations
      r2.ts               # R2 storage operations
    /utils
      uuid.ts             # UUID generation
      shuffle.ts          # Array shuffling
  wrangler.toml           # Cloudflare config
```

### 1.2 Configure wrangler.toml

```toml
name = "read-the-text-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "read-the-text-db"
database_id = "<will be generated>"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "read-the-text-storage"
```

### 1.3 Create D1 Database

```bash
npx wrangler d1 create read-the-text-db
```

### 1.4 Create R2 Bucket

```bash
npx wrangler r2 bucket create read-the-text-storage
```

---

## Phase 2: Database Schema

### 2.1 Create Migration File

**File: `/api/migrations/0001_initial.sql`**

```sql
-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed')),
  current_passage_index INTEGER DEFAULT 0,
  passage_order TEXT NOT NULL,
  total_passages INTEGER NOT NULL DEFAULT 10,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  total_time_ms INTEGER DEFAULT 0
);

-- Passage results
CREATE TABLE passage_results (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  passage_index INTEGER NOT NULL,
  passage_id INTEGER NOT NULL,
  screenshot_r2_key TEXT,
  cursor_history_r2_key TEXT,
  is_complete INTEGER DEFAULT 0,
  wrong_attempts INTEGER DEFAULT 0,
  time_spent_ms INTEGER DEFAULT 0,
  final_selected_answer TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, passage_index)
);

-- Passage attempts (all Gemini responses)
CREATE TABLE passage_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  passage_index INTEGER NOT NULL,
  attempt_number INTEGER NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  gemini_response TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_sessions_nickname ON sessions(nickname);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_passage_results_session ON passage_results(session_id);
CREATE INDEX idx_passage_attempts_session ON passage_attempts(session_id);
CREATE INDEX idx_passage_attempts_passage ON passage_attempts(session_id, passage_index);
```

### 2.2 Run Migration

```bash
npx wrangler d1 migrations apply read-the-text-db
```

---

## Phase 3: API Endpoints

### 3.1 Main Worker Entry

**File: `/api/src/index.ts`**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sessions } from './routes/sessions';
import { passages } from './routes/passages';
import { admin } from './routes/admin';

type Bindings = {
  DB: D1Database;
  STORAGE: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for frontend
app.use('/*', cors({
  origin: ['http://localhost:5173', 'https://your-domain.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Routes
app.route('/api/sessions', sessions);
app.route('/api/passages', passages);
app.route('/api/admin', admin);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
```

### 3.2 Sessions Routes

**File: `/api/src/routes/sessions.ts`**

```typescript
import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

const sessions = new Hono();

// Check if nickname exists
sessions.post('/check', async (c) => {
  const { nickname } = await c.req.json();
  const db = c.env.DB;

  const session = await db.prepare(
    'SELECT id, status, current_passage_index, passage_order FROM sessions WHERE nickname = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(nickname).first();

  if (!session) {
    return c.json({ exists: false });
  }

  return c.json({
    exists: true,
    sessionId: session.id,
    status: session.status,
    currentPassageIndex: session.current_passage_index,
    passageOrder: JSON.parse(session.passage_order as string)
  });
});

// Create new session
sessions.post('/', async (c) => {
  const { nickname } = await c.req.json();
  const db = c.env.DB;

  const sessionId = uuidv4();

  // Generate shuffled passage order (0-9)
  const passageOrder = shuffleArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  await db.prepare(`
    INSERT INTO sessions (id, nickname, passage_order, total_passages)
    VALUES (?, ?, ?, 10)
  `).bind(sessionId, nickname, JSON.stringify(passageOrder)).run();

  return c.json({
    sessionId,
    passageOrder,
    resultUrl: `/results/${sessionId}`
  });
});

// Get session data (for resume or results)
sessions.get('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const db = c.env.DB;
  const storage = c.env.STORAGE;

  // Get session
  const session = await db.prepare(
    'SELECT * FROM sessions WHERE id = ?'
  ).bind(sessionId).first();

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Get passage results
  const passageResults = await db.prepare(
    'SELECT * FROM passage_results WHERE session_id = ? ORDER BY passage_index'
  ).bind(sessionId).all();

  // Get all attempts
  const attempts = await db.prepare(
    'SELECT * FROM passage_attempts WHERE session_id = ? ORDER BY passage_index, attempt_number'
  ).bind(sessionId).all();

  // Get screenshots from R2 (as presigned URLs or base64)
  const resultsWithScreenshots = await Promise.all(
    passageResults.results.map(async (result: any) => {
      let screenshot = null;
      if (result.screenshot_r2_key) {
        const obj = await storage.get(result.screenshot_r2_key);
        if (obj) {
          const buffer = await obj.arrayBuffer();
          screenshot = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
        }
      }
      return { ...result, screenshot };
    })
  );

  return c.json({
    session: {
      ...session,
      passageOrder: JSON.parse(session.passage_order as string)
    },
    passageResults: resultsWithScreenshots,
    attempts: attempts.results
  });
});

// Mark session complete
sessions.post('/:id/complete', async (c) => {
  const sessionId = c.req.param('id');
  const { totalTimeMs } = await c.req.json();
  const db = c.env.DB;

  await db.prepare(`
    UPDATE sessions
    SET status = 'completed',
        completed_at = datetime('now'),
        total_time_ms = ?
    WHERE id = ?
  `).bind(totalTimeMs, sessionId).run();

  return c.json({ success: true });
});

// Delete session and start fresh (same nickname)
sessions.delete('/:id', async (c) => {
  const sessionId = c.req.param('id');
  const db = c.env.DB;
  const storage = c.env.STORAGE;

  // Get all R2 keys for this session
  const results = await db.prepare(
    'SELECT screenshot_r2_key, cursor_history_r2_key FROM passage_results WHERE session_id = ?'
  ).bind(sessionId).all();

  // Delete from R2
  for (const result of results.results as any[]) {
    if (result.screenshot_r2_key) {
      await storage.delete(result.screenshot_r2_key);
    }
    if (result.cursor_history_r2_key) {
      await storage.delete(result.cursor_history_r2_key);
    }
  }

  // Delete from D1 (cascade will handle passage_results and attempts)
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();

  return c.json({ success: true });
});

// Helper functions
function shuffleArray(array: number[]): number[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export { sessions };
```

### 3.3 Passages Routes

**File: `/api/src/routes/passages.ts`**

```typescript
import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

const passages = new Hono();

// Save passage completion
passages.put('/:sessionId/:passageIndex', async (c) => {
  const sessionId = c.req.param('sessionId');
  const passageIndex = parseInt(c.req.param('passageIndex'));
  const db = c.env.DB;
  const storage = c.env.STORAGE;

  const body = await c.req.json();
  const {
    passageId,
    screenshot,        // base64 string
    cursorHistory,     // array of {x, y, timestamp}
    wrongAttempts,
    timeSpentMs,
    selectedAnswer
  } = body;

  // Upload screenshot to R2
  const screenshotKey = `sessions/${sessionId}/passage_${passageIndex}_screenshot.jpg`;
  if (screenshot) {
    const screenshotData = base64ToArrayBuffer(screenshot.split(',')[1]);
    await storage.put(screenshotKey, screenshotData, {
      httpMetadata: { contentType: 'image/jpeg' }
    });
  }

  // Upload cursor history to R2
  const cursorKey = `sessions/${sessionId}/passage_${passageIndex}_cursor.json`;
  if (cursorHistory) {
    await storage.put(cursorKey, JSON.stringify(cursorHistory), {
      httpMetadata: { contentType: 'application/json' }
    });
  }

  // Upsert passage result
  const resultId = uuidv4();
  await db.prepare(`
    INSERT INTO passage_results (
      id, session_id, passage_index, passage_id,
      screenshot_r2_key, cursor_history_r2_key,
      is_complete, wrong_attempts, time_spent_ms, final_selected_answer, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, datetime('now'))
    ON CONFLICT(session_id, passage_index) DO UPDATE SET
      screenshot_r2_key = excluded.screenshot_r2_key,
      cursor_history_r2_key = excluded.cursor_history_r2_key,
      is_complete = 1,
      wrong_attempts = excluded.wrong_attempts,
      time_spent_ms = excluded.time_spent_ms,
      final_selected_answer = excluded.final_selected_answer,
      updated_at = datetime('now')
  `).bind(
    resultId, sessionId, passageIndex, passageId,
    screenshotKey, cursorKey,
    wrongAttempts, timeSpentMs, selectedAnswer
  ).run();

  // Update session current passage index
  await db.prepare(`
    UPDATE sessions SET current_passage_index = ? WHERE id = ?
  `).bind(passageIndex + 1, sessionId).run();

  return c.json({ success: true });
});

// Record an attempt (called after each Gemini response)
passages.post('/:sessionId/:passageIndex/attempts', async (c) => {
  const sessionId = c.req.param('sessionId');
  const passageIndex = parseInt(c.req.param('passageIndex'));
  const db = c.env.DB;

  const { selectedAnswer, isCorrect, geminiResponse } = await c.req.json();

  // Get current attempt number
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM passage_attempts
    WHERE session_id = ? AND passage_index = ?
  `).bind(sessionId, passageIndex).first();

  const attemptNumber = ((countResult?.count as number) || 0) + 1;

  await db.prepare(`
    INSERT INTO passage_attempts (
      id, session_id, passage_index, attempt_number,
      selected_answer, is_correct, gemini_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    uuidv4(), sessionId, passageIndex, attemptNumber,
    selectedAnswer, isCorrect ? 1 : 0, geminiResponse
  ).run();

  return c.json({ success: true, attemptNumber });
});

// Helper
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export { passages };
```

### 3.4 Admin Routes

**File: `/api/src/routes/admin.ts`**

```typescript
import { Hono } from 'hono';

const admin = new Hono();

// List all sessions
admin.get('/sessions', async (c) => {
  const db = c.env.DB;
  const status = c.req.query('status'); // 'completed' | 'in_progress' | undefined

  let query = `
    SELECT
      s.id, s.nickname, s.status, s.current_passage_index,
      s.total_passages, s.created_at, s.completed_at, s.total_time_ms,
      (SELECT COUNT(*) FROM passage_results pr WHERE pr.session_id = s.id AND pr.is_complete = 1) as completed_passages
    FROM sessions s
  `;

  if (status) {
    query += ` WHERE s.status = '${status}'`;
  }

  query += ' ORDER BY s.created_at DESC';

  const sessions = await db.prepare(query).all();

  return c.json({ sessions: sessions.results });
});

// Get single session details (same as sessions/:id but for admin context)
admin.get('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  const db = c.env.DB;
  const storage = c.env.STORAGE;

  // Get session
  const session = await db.prepare(
    'SELECT * FROM sessions WHERE id = ?'
  ).bind(sessionId).first();

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  // Get passage results
  const passageResults = await db.prepare(
    'SELECT * FROM passage_results WHERE session_id = ? ORDER BY passage_index'
  ).bind(sessionId).all();

  // Get all attempts
  const attempts = await db.prepare(
    'SELECT * FROM passage_attempts WHERE session_id = ? ORDER BY passage_index, attempt_number'
  ).bind(sessionId).all();

  // Get screenshots
  const resultsWithScreenshots = await Promise.all(
    passageResults.results.map(async (result: any) => {
      let screenshot = null;
      if (result.screenshot_r2_key) {
        const obj = await storage.get(result.screenshot_r2_key);
        if (obj) {
          const buffer = await obj.arrayBuffer();
          screenshot = `data:image/jpeg;base64,${arrayBufferToBase64(buffer)}`;
        }
      }
      return { ...result, screenshot };
    })
  );

  return c.json({
    session: {
      ...session,
      passageOrder: JSON.parse(session.passage_order as string)
    },
    passageResults: resultsWithScreenshots,
    attempts: attempts.results
  });
});

// Delete session
admin.delete('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');
  const db = c.env.DB;
  const storage = c.env.STORAGE;

  // Get all R2 keys
  const results = await db.prepare(
    'SELECT screenshot_r2_key, cursor_history_r2_key FROM passage_results WHERE session_id = ?'
  ).bind(sessionId).all();

  // Delete from R2
  for (const result of results.results as any[]) {
    if (result.screenshot_r2_key) {
      await storage.delete(result.screenshot_r2_key);
    }
    if (result.cursor_history_r2_key) {
      await storage.delete(result.cursor_history_r2_key);
    }
  }

  // Delete from D1
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();

  return c.json({ success: true });
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export { admin };
```

---

## Phase 4: Frontend Changes

### 4.1 New Type Definitions

**File: `/src/types/session.ts`**

```typescript
export interface Session {
  id: string;
  nickname: string;
  status: 'in_progress' | 'completed';
  currentPassageIndex: number;
  passageOrder: number[];
  totalPassages: number;
  createdAt: string;
  completedAt?: string;
  totalTimeMs: number;
}

export interface PassageResult {
  id: string;
  sessionId: string;
  passageIndex: number;
  passageId: number;
  screenshotR2Key?: string;
  cursorHistoryR2Key?: string;
  isComplete: boolean;
  wrongAttempts: number;
  timeSpentMs: number;
  finalSelectedAnswer?: string;
  screenshot?: string; // base64 when fetched
}

export interface PassageAttempt {
  id: string;
  sessionId: string;
  passageIndex: number;
  attemptNumber: number;
  selectedAnswer: string;
  isCorrect: boolean;
  geminiResponse?: string;
  createdAt: string;
}

export interface SessionCheckResponse {
  exists: boolean;
  sessionId?: string;
  status?: 'in_progress' | 'completed';
  currentPassageIndex?: number;
  passageOrder?: number[];
}

export interface SessionCreateResponse {
  sessionId: string;
  passageOrder: number[];
  resultUrl: string;
}
```

### 4.2 API Service

**File: `/src/services/apiService.ts`**

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

  async getSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    return res.json();
  },

  async completeSession(sessionId: string, totalTimeMs: number) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalTimeMs })
    });
    return res.json();
  },

  async deleteSession(sessionId: string) {
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
  ) {
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
  ) {
    const res = await fetch(`${API_BASE}/passages/${sessionId}/${passageIndex}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Admin
  async getAdminSessions(status?: string) {
    const url = status
      ? `${API_BASE}/admin/sessions?status=${status}`
      : `${API_BASE}/admin/sessions`;
    const res = await fetch(url);
    return res.json();
  },

  async getAdminSessionDetail(sessionId: string) {
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}`);
    return res.json();
  },

  async deleteAdminSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/admin/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    return res.json();
  }
};
```

### 4.3 New Pages/Components

#### Landing Page Component

**File: `/src/components/LandingPage.tsx`**

```typescript
import React, { useState } from 'react';
import { apiService } from '../services/apiService';

interface LandingPageProps {
  onStartQuiz: (sessionId: string, passageOrder: number[], isResume: boolean, resumeData?: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartQuiz }) => {
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [existingSession, setExistingSession] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !agreed) return;

    setLoading(true);
    setError('');

    try {
      const checkResult = await apiService.checkNickname(nickname.trim());

      if (checkResult.exists) {
        if (checkResult.status === 'completed') {
          // Redirect to results
          window.location.href = `/results/${checkResult.sessionId}`;
          return;
        } else {
          // Show resume modal
          setExistingSession(checkResult);
          setShowResumeModal(true);
        }
      } else {
        // Create new session
        const newSession = await apiService.createSession(nickname.trim());
        onStartQuiz(newSession.sessionId, newSession.passageOrder, false);
      }
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    const sessionData = await apiService.getSession(existingSession.sessionId);
    onStartQuiz(
      existingSession.sessionId,
      existingSession.passageOrder,
      true,
      sessionData
    );
    setShowResumeModal(false);
  };

  const handleStartFresh = async () => {
    // Delete old session and create new
    await apiService.deleteSession(existingSession.sessionId);
    const newSession = await apiService.createSession(nickname.trim());
    onStartQuiz(newSession.sessionId, newSession.passageOrder, false);
    setShowResumeModal(false);
  };

  return (
    <div className="landing-page">
      <h1>Reading Comprehension Study</h1>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="nickname">Enter your nickname:</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g., JohnDoe123"
            required
          />
        </div>

        <div className="requirements">
          <h3>Requirements</h3>
          <ul>
            <li>Use a desktop browser</li>
            <li>Use a mouse if possible</li>
          </ul>
        </div>

        <div className="data-notice">
          <h3>Data Collection Notice</h3>
          <p>This study records the following data for research purposes:</p>
          <ul>
            <li>Cursor movements and reading patterns</li>
            <li>Time spent on each passage</li>
            <li>Answer attempts and responses</li>
            <li>Screenshots of reading behavior heatmaps</li>
          </ul>
          <p>Your data will be stored securely and used only for research analysis.</p>
        </div>

        <div className="consent">
          <label>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            I agree to the data collection and understand my reading patterns will be recorded
          </label>
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={!nickname.trim() || !agreed || loading}>
          {loading ? 'Loading...' : 'Start Quiz'}
        </button>
      </form>

      {/* Resume Modal */}
      {showResumeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Session Found</h2>
            <p>
              You have an incomplete session ({existingSession.currentPassageIndex}/{10} passages completed).
            </p>
            <p>Would you like to continue or start fresh?</p>
            <div className="modal-actions">
              <button onClick={handleResume}>Continue Session</button>
              <button onClick={handleStartFresh} className="secondary">Start Fresh</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

#### Results Page Component

**File: `/src/components/ResultsPage.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../services/apiService';

export const ResultsPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPassage, setSelectedPassage] = useState<number | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const data = await apiService.getSession(sessionId!);
        setSessionData(data);
      } catch (err) {
        setError('Session not found');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  if (loading) return <div>Loading results...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!sessionData) return <div>No data found</div>;

  const { session, passageResults, attempts } = sessionData;

  // Calculate stats
  const completedPassages = passageResults.filter((p: any) => p.is_complete).length;
  const perfectPassages = passageResults.filter((p: any) => p.wrong_attempts === 0).length;
  const totalTime = passageResults.reduce((sum: number, p: any) => sum + (p.time_spent_ms || 0), 0);

  // Group attempts by passage
  const attemptsByPassage = attempts.reduce((acc: any, attempt: any) => {
    if (!acc[attempt.passage_index]) {
      acc[attempt.passage_index] = [];
    }
    acc[attempt.passage_index].push(attempt);
    return acc;
  }, {});

  return (
    <div className="results-page">
      <h1>Quiz Results</h1>
      <p className="nickname">Participant: {session.nickname}</p>

      <div className="stats-summary">
        <div className="stat">
          <span className="value">{completedPassages}/10</span>
          <span className="label">Completed</span>
        </div>
        <div className="stat">
          <span className="value">{Math.round((perfectPassages / 10) * 100)}%</span>
          <span className="label">Accuracy</span>
        </div>
        <div className="stat">
          <span className="value">{formatTime(totalTime)}</span>
          <span className="label">Total Time</span>
        </div>
      </div>

      <div className="passage-grid">
        {session.passageOrder.map((passageId: number, index: number) => {
          const result = passageResults.find((r: any) => r.passage_index === index);
          const passageAttempts = attemptsByPassage[index] || [];

          return (
            <div
              key={index}
              className={`passage-card ${result?.is_complete ? 'complete' : 'incomplete'}`}
              onClick={() => setSelectedPassage(index)}
            >
              {result?.screenshot && (
                <img src={result.screenshot} alt={`Passage ${index + 1}`} />
              )}
              <div className="passage-info">
                <h3>Passage {index + 1}</h3>
                {result?.is_complete ? (
                  <>
                    <p>{result.wrong_attempts === 0 ? 'Perfect!' : `${result.wrong_attempts} wrong attempts`}</p>
                    <p>{formatTime(result.time_spent_ms)}</p>
                  </>
                ) : (
                  <p>Not completed</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed view modal */}
      {selectedPassage !== null && (
        <div className="modal-overlay" onClick={() => setSelectedPassage(null)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <h2>Passage {selectedPassage + 1} Details</h2>

            {/* Screenshot */}
            {passageResults[selectedPassage]?.screenshot && (
              <img
                src={passageResults[selectedPassage].screenshot}
                alt="Heatmap"
                className="full-screenshot"
              />
            )}

            {/* All attempts with Gemini responses */}
            <div className="attempts-list">
              <h3>Your Attempts</h3>
              {attemptsByPassage[selectedPassage]?.map((attempt: any, idx: number) => (
                <div key={idx} className={`attempt ${attempt.is_correct ? 'correct' : 'wrong'}`}>
                  <div className="attempt-header">
                    <span>Attempt {attempt.attempt_number}</span>
                    <span>{attempt.is_correct ? '✓ Correct' : '✗ Wrong'}</span>
                  </div>
                  <p><strong>Selected:</strong> {attempt.selected_answer}</p>
                  {attempt.gemini_response && (
                    <div className="gemini-feedback">
                      <strong>Feedback:</strong>
                      <p>{attempt.gemini_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setSelectedPassage(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${seconds}s`;
}
```

#### Admin Page Component

**File: `/src/components/AdminPage.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

export const AdminPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<any>(null);

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    setLoading(true);
    const data = await apiService.getAdminSessions(filter || undefined);
    setSessions(data.sessions);
    setLoading(false);
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    await apiService.deleteAdminSession(sessionId);
    fetchSessions();
  };

  const handleViewDetails = async (sessionId: string) => {
    const data = await apiService.getAdminSessionDetail(sessionId);
    setSessionDetail(data);
    setSelectedSession(sessionId);
  };

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>

      <div className="filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Sessions</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="sessions-table">
          <thead>
            <tr>
              <th>Nickname</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Created</th>
              <th>Total Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.nickname}</td>
                <td>
                  <span className={`status ${session.status}`}>
                    {session.status}
                  </span>
                </td>
                <td>{session.completed_passages}/{session.total_passages}</td>
                <td>{new Date(session.created_at).toLocaleDateString()}</td>
                <td>{session.total_time_ms ? formatTime(session.total_time_ms) : '-'}</td>
                <td>
                  <button onClick={() => handleViewDetails(session.id)}>View</button>
                  <button onClick={() => handleDelete(session.id)} className="danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Session detail modal */}
      {selectedSession && sessionDetail && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <h2>{sessionDetail.session.nickname}'s Session</h2>
            {/* Reuse ResultsPage content here */}
            <button onClick={() => setSelectedSession(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}
```

### 4.4 Router Setup

**File: `/src/main.tsx`** (update)

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { ResultsPage } from './components/ResultsPage';
import { AdminPage } from './components/AdminPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/results/:sessionId" element={<ResultsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
```

### 4.5 Update App.tsx

**Key changes to App.tsx:**

1. Add state for session management:
```typescript
const [sessionId, setSessionId] = useState<string | null>(null);
const [passageOrder, setPassageOrder] = useState<number[]>([]);
const [showLanding, setShowLanding] = useState(true);
```

2. Update passage navigation to use `passageOrder`:
```typescript
// Instead of: passages[currentPassageIndex]
// Use: passages[passageOrder[currentPassageIndex]]
```

3. Save to cloud on passage completion:
```typescript
const handlePassageComplete = async () => {
  // ... existing logic ...

  // Save to cloud
  await apiService.savePassageResult(sessionId, currentPassageIndex, {
    passageId: passageOrder[currentPassageIndex],
    screenshot: passageData[currentPassageIndex].screenshot,
    cursorHistory: passageData[currentPassageIndex].cursorHistory,
    wrongAttempts: passageData[currentPassageIndex].wrongAttempts,
    timeSpentMs: passageData[currentPassageIndex].timeSpent,
    selectedAnswer: selectedAnswer
  });

  // ... continue to next passage or show summary ...
};
```

4. Record attempts after Gemini response:
```typescript
// After receiving Gemini feedback
await apiService.recordAttempt(sessionId, currentPassageIndex, {
  selectedAnswer,
  isCorrect,
  geminiResponse: feedback
});
```

5. Handle resume with existing data:
```typescript
const handleStartQuiz = (id: string, order: number[], isResume: boolean, resumeData?: any) => {
  setSessionId(id);
  setPassageOrder(order);

  if (isResume && resumeData) {
    // Restore passage data from cloud
    const restoredData: Record<number, PassageData> = {};
    resumeData.passageResults.forEach((result: any) => {
      restoredData[result.passage_index] = {
        cursorHistory: [], // Will be loaded from R2 if needed
        screenshot: result.screenshot,
        isComplete: result.is_complete,
        wrongAttempts: result.wrong_attempts,
        timeSpent: result.time_spent_ms
      };
    });
    setPassageData(restoredData);
    // Set current index to first incomplete passage
    const firstIncomplete = order.findIndex((_, idx) => !restoredData[idx]?.isComplete);
    setCurrentPassageIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
  }

  setShowLanding(false);
};
```

6. Show completed passages as read-only:
```typescript
// In ReadingComprehension component, check if passage is already complete
const isReadOnly = passageData[currentPassageIndex]?.isComplete;

// Disable answer selection if read-only
// Show previous answer and feedback
```

---

## Phase 5: Deployment

### 5.1 Deploy Workers API

```bash
cd api
npx wrangler deploy
```

### 5.2 Update Frontend Environment

**File: `.env.production`**
```
VITE_API_URL=https://read-the-text-api.<your-subdomain>.workers.dev/api
```

### 5.3 Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```

### 5.4 Configure Pages to use Workers

In Cloudflare Dashboard:
1. Go to Pages project settings
2. Add environment variable: `VITE_API_URL`
3. Configure Functions (if using Pages Functions instead of separate Workers)

---

## Phase 6: Testing Checklist

### 6.1 Session Flow
- [ ] New user can enter nickname and start quiz
- [ ] Consent checkbox works
- [ ] Existing incomplete session shows resume modal
- [ ] Resume loads correct passage data
- [ ] Completed session redirects to results
- [ ] Starting fresh deletes old session

### 6.2 Quiz Flow
- [ ] Passages display in randomized order
- [ ] Cursor tracking works
- [ ] Screenshot capture works
- [ ] Each attempt records Gemini response
- [ ] Passage completion saves to cloud
- [ ] Completed passages show as read-only
- [ ] Can navigate to any incomplete passage

### 6.3 Results Page
- [ ] Displays all passage results
- [ ] Shows screenshots with heatmaps
- [ ] Shows all Gemini feedbacks per passage
- [ ] Stats calculate correctly
- [ ] Accessible via direct URL

### 6.4 Admin Page
- [ ] Lists all sessions
- [ ] Filter by status works
- [ ] Can view individual session details
- [ ] Can delete sessions
- [ ] R2 objects deleted with session

---

## Implementation Order

**Recommended sequence:**

1. **Backend first** (Phase 1-3)
   - Set up D1 + R2
   - Implement all API endpoints
   - Test with curl/Postman

2. **Frontend API integration** (Phase 4.1-4.2)
   - Add types and API service
   - Can test against deployed Workers

3. **Landing page** (Phase 4.3)
   - New entry point
   - Session check/create flow

4. **Update App.tsx** (Phase 4.5)
   - Integrate session management
   - Save on passage complete
   - Record attempts

5. **Results page** (Phase 4.3)
   - Public results view

6. **Admin page** (Phase 4.3)
   - Session management

7. **Polish & Deploy** (Phase 5-6)
   - Styling
   - Error handling
   - Testing

---

## Notes for Implementer

1. **Error Handling**: Add try-catch blocks and user-friendly error messages throughout
2. **Loading States**: Show loading indicators during API calls
3. **Optimistic Updates**: Update UI immediately, then sync with cloud
4. **Styling**: The CSS for new components needs to be created (use existing app styles as reference)
5. **Dependencies**: Install `hono`, `uuid`, and `react-router-dom`
6. **CORS**: Ensure Workers CORS config matches your Pages domain
7. **Environment Variables**: Use `wrangler secret` for sensitive values

---

## Future Enhancements (Out of Scope)

- Admin authentication
- Rate limiting
- Data export
- Aggregated analytics dashboard
- Email notifications
- Multiple quiz versions
