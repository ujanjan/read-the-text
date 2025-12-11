import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import type { AdminSession } from '../types/session';
import { useNavigate } from 'react-router-dom';
import { maskEmail } from '../utils/emailMask';

type TabType = 'users' | 'passages';

interface PassageStats {
  passageId: string;
  title: string;
  uniqueParticipants?: number;
  totalAttempts: number;
  firstTryCorrectPct: number;
  eventuallyCorrectPct: number;
  avgTimeMs: number;
}

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('admin_active_tab');
    return (saved === 'passages' ? 'passages' : 'users') as TabType;
  });
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [passageStats, setPassageStats] = useState<PassageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [showDirty, setShowDirty] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'users') {
        fetchSessions();
      } else {
        fetchPassageStats();
      }
    }
  }, [filter, showDirty, isAuthenticated, activeTab]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAdminSessions(filter || undefined, showDirty);
      setSessions(data.sessions);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      if (err instanceof Error && err.message === 'Unauthorized') {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPassageStats = async () => {
    setLoading(true);
    try {
      const data = await apiService.getPassageAnalytics();
      setPassageStats(data.passages);
    } catch (err) {
      console.error('Failed to fetch passage stats:', err);
      if (err instanceof Error && err.message === 'Unauthorized') {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await apiService.deleteAdminSession(sessionId);
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
      if (err instanceof Error && err.message === 'Unauthorized') {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
      }
    }
  };

  const handleToggleDirty = async (sessionId: string, currentDirty: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiService.toggleSessionDirty(sessionId, !currentDirty);
      fetchSessions();
    } catch (err) {
      console.error('Failed to toggle dirty status:', err);
      if (err instanceof Error && err.message === 'Unauthorized') {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiService.adminLogin(password);
      if (response.success && response.token) {
        localStorage.setItem('admin_token', response.token);
        setIsAuthenticated(true);
      } else {
        alert(response.error || 'Incorrect password');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Authentication failed. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Access</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="flex justify-between items-center mb-6">
          <h1>Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('users');
              localStorage.setItem('admin_active_tab', 'users');
            }}
          >
            Users
          </button>
          <button
            className={`admin-tab ${activeTab === 'passages' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('passages');
              localStorage.setItem('admin_active_tab', 'passages');
            }}
          >
            Passages
          </button>
        </div>

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <>
            <div className="admin-controls">
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">All Sessions</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
              </select>
              <label className="show-dirty-label">
                <input
                  type="checkbox"
                  checked={showDirty}
                  onChange={(e) => setShowDirty(e.target.checked)}
                />
                Show Dirty Data
              </label>
            </div>

            {loading ? (
              <p className="loading">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="no-data">No sessions found</p>
            ) : (
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Created</th>
                    <th>Total Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr
                      key={session.id}
                      onClick={() => navigate(`/results/${session.id}`)}
                      className={`cursor-pointer hover:bg-gray-50 ${session.is_dirty ? 'dirty-row' : ''}`}
                    >
                      <td>
                        {maskEmail(session.email)}
                        {session.is_dirty ? <span className="dirty-badge">Dirty</span> : null}
                      </td>
                      <td>
                        <span className={`status-badge ${session.status}`}>
                          {session.status === 'in_progress' ? 'In Progress' : 'Completed'}
                        </span>
                      </td>
                      <td>{session.completed_passages}/{session.total_passages}</td>
                      <td>{new Date(session.created_at).toLocaleDateString()}</td>
                      <td>{session.total_time_ms ? formatTime(session.total_time_ms) : '-'}</td>
                      <td>
                        <button
                          onClick={(e) => handleToggleDirty(session.id, !!session.is_dirty, e)}
                          className={session.is_dirty ? 'clean-button' : 'dirty-button'}
                        >
                          {session.is_dirty ? 'Mark Clean' : 'Mark Dirty'}
                        </button>
                        <button
                          onClick={(e) => handleDelete(session.id, e)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Passages Tab Content */}
        {activeTab === 'passages' && (
          <>

            {loading ? (
              <p className="loading">Loading...</p>
            ) : passageStats.length === 0 ? (
              <p className="no-data">No passage data available</p>
            ) : (
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Participants</th>
                    <th>Attempts</th>
                    <th>First Try Correct</th>
                    <th>Eventually Correct</th>
                    <th>Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {passageStats.map((passage) => (
                    <tr
                      key={passage.passageId}
                      onClick={() => navigate(`/admin/passages/${passage.passageId}`)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td>{passage.title}</td>
                      <td>{passage.uniqueParticipants}</td>
                      <td>{passage.totalAttempts}</td>
                      <td>{passage.firstTryCorrectPct}%</td>
                      <td>{passage.eventuallyCorrectPct}%</td>
                      <td>{formatTime(passage.avgTimeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function formatTime(ms: number): string {
  if (!ms) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0
    ? `${minutes}m ${remainingSeconds}s`
    : `${seconds}s`;
}
